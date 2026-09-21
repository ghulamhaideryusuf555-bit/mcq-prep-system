// ---------------------------------------------------------------------------
// Shared backend utilities for all Netlify Functions in this project.
// Merged into one file on purpose so the whole backend is a single small
// folder to upload/deploy. Sections below correspond to what used to be
// separate files under utils/.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const mammoth = require('mammoth')
const XLSX = require('xlsx')

// ---------------------------------------------------------------------------
// Supabase admin (service-role) client
// ---------------------------------------------------------------------------
// Service-role client: bypasses RLS. Only ever used inside Netlify Functions,
// never sent to the browser. Every function that uses it MUST authenticate
// and authorize the caller itself (see authenticate() below).
function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Server misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
// Verifies the bearer token from the frontend against Supabase Auth, then
// loads the caller's profile (role) using the service-role client. Returns
// null if the token is missing/invalid. Every function that touches user
// data or secrets must call this before doing anything else.
async function authenticate(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length)
  const admin = getAdminClient()

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return null

  const { data: profile } = await admin.from('profiles').select('*').eq('id', userData.user.id).single()

  return {
    user: userData.user,
    profile,
    isAdmin: profile?.role === 'admin',
    admin, // service-role client, reuse instead of creating a new one
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// ---------------------------------------------------------------------------
// API key retrieval (Supabase Vault, with env-var fallback)
// ---------------------------------------------------------------------------
// Reads the currently-configured AI provider key out of Supabase Vault
// (written by the admin_set_api_key RPC when an admin saves a key in the
// in-app Settings page). Falls back to the ANTHROPIC_API_KEY env var if no
// key has been configured yet, so the app also works with a plain env-var
// deploy for admins who don't want to use the Settings UI.
async function getProviderApiKey(adminClient, settingKey = 'ai_provider') {
  const { data: setting } = await adminClient
    .from('app_settings')
    .select('*')
    .eq('key', settingKey)
    .maybeSingle()

  if (setting?.vault_secret_name) {
    const { data: secretRow, error } = await adminClient
      .schema('vault')
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', setting.vault_secret_name)
      .maybeSingle()

    if (!error && secretRow?.decrypted_secret) {
      return { apiKey: secretRow.decrypted_secret, provider: setting.provider || 'anthropic', model: setting.model }
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY, provider: 'anthropic', model: null }
  }

  return { apiKey: null, provider: null, model: null }
}

// ---------------------------------------------------------------------------
// Anthropic client: paper extraction + single-question answering
// ---------------------------------------------------------------------------
const DEFAULT_MODEL = 'claude-sonnet-4-5'

function extractJson(text) {
  // Model is instructed to return raw JSON, but strip code fences defensively.
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('[') === -1 ? cleaned.indexOf('{') : cleaned.indexOf('[')
  const end = cleaned.lastIndexOf('[') > -1 ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
  const jsonSlice = start > -1 && end > -1 ? cleaned.slice(start, end + 1) : cleaned
  return JSON.parse(jsonSlice)
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert exam-paper digitizer for Pakistani competitive exams (FPSC, CSS, PMS, NTS, STS, PPSC and similar). You read a past paper (which may be a clean PDF, a scanned/photographed image, or plain text) and convert it into structured MCQ data with extreme accuracy.

Rules:
- Detect every multiple-choice question, its question number, its exact question text, and its options (usually A/B/C/D, sometimes more).
- If the source material includes an answer key (explicit "Answer: C" markers, a separate key section, bolded/marked correct options, etc.), use it as ground truth and set "has_answer_key": true and "confidence": "high".
- If there is NO answer key in the source, use your own subject-matter knowledge to determine the most likely correct answer. Set "has_answer_key": false and rate your own certainty honestly as "high", "medium", or "low" in "confidence".
- If a question is ambiguous, the scan is unreadable, the options seem malformed, multiple answers seem equally valid, or you are not confident enough to commit to an answer, do NOT guess blindly — set "needs_review": true and explain why in "review_reason", and set correct_option_label to your best guess or null.
- Classify each question's subject using ONLY one of these exact subject names: "English", "Pakistan Affairs", "Current Affairs", "Islamiat", "Everyday Science", "Computer Science", "General Knowledge", "Mathematics", "Analytical Reasoning", "Geography", "Constitution & Political Science", "Urdu", "Other". Also give a short topic label within that subject (e.g. subject "Pakistan Affairs", topic "1973 Constitution").
- Try to detect the organization (FPSC, CSS, NTS, STS, PPSC, or "OTHER") and exam year if visible anywhere in the paper (title, header, footer). Use null if not determinable.
- Write a short (1-3 sentence), genuinely helpful explanation of why the correct answer is correct.
- Write a brief "why_others_wrong" object keyed by option label (only for the incorrect options) explaining briefly why each is wrong.
- If you relied on general knowledge (no answer key present), add a "source_note" describing the kind of reference that supports the answer (e.g. "Standard Pakistan Studies fact" or "Basic English grammar rule") — this is not a URL, just a short justification of reliability.

Return ONLY a raw JSON array (no prose, no markdown fences) where each element has this exact shape:
{
  "question_number": number|null,
  "question_text": string,
  "options": [{"label": "A", "text": string}, ...],
  "correct_option_label": string|null,
  "has_answer_key": boolean,
  "confidence": "high"|"medium"|"low",
  "needs_review": boolean,
  "review_reason": string|null,
  "subject": string,
  "topic": string|null,
  "organization": string|null,
  "year": number|null,
  "explanation": string,
  "why_others_wrong": { "B": string, "C": string, "D": string },
  "source_note": string|null
}`

function getClient(apiKey) {
  return new Anthropic({ apiKey })
}

async function extractQuestionsFromDocument({ apiKey, model, fileType, base64Data, mediaType, rawText, paperMeta }) {
  const client = getClient(apiKey)
  const userContent = []

  const metaLine = `Known paper context (may be incomplete — fill in/confirm what you can see in the document): title="${paperMeta?.title || ''}", organization="${paperMeta?.organization || ''}", year=${paperMeta?.year || 'unknown'}.`

  if (fileType === 'pdf') {
    userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } })
    userContent.push({ type: 'text', text: `${metaLine}\nExtract every MCQ from this document per the system instructions.` })
  } else if (fileType === 'image') {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64Data } })
    userContent.push({ type: 'text', text: `${metaLine}\nExtract every MCQ from this scanned/photographed paper per the system instructions.` })
  } else {
    userContent.push({
      type: 'text',
      text: `${metaLine}\nHere is the raw extracted text of the paper:\n\n"""\n${rawText}\n"""\n\nExtract every MCQ from this text per the system instructions.`,
    })
  }

  const response = await client.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: 8000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n')
  return extractJson(text)
}

const ANSWER_SYSTEM_PROMPT = `You are a subject-matter expert answering a single multiple-choice question from a Pakistani competitive exam (FPSC/CSS/NTS/STS/PPSC style). Given the question and options, determine the correct answer using your own knowledge. Be honest about your certainty. Return ONLY raw JSON of this exact shape, no prose:
{
  "correct_option_label": string|null,
  "confidence": "high"|"medium"|"low",
  "needs_review": boolean,
  "review_reason": string|null,
  "explanation": string,
  "why_others_wrong": { "<label>": string, ... },
  "source_note": string
}`

async function answerSingleQuestion({ apiKey, model, questionText, options }) {
  const client = getClient(apiKey)
  const optionsText = options.map((o) => `${o.option_label}. ${o.option_text}`).join('\n')
  const response = await client.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: 1200,
    system: ANSWER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Question: ${questionText}\n\nOptions:\n${optionsText}` }],
  })
  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n')
  return extractJson(text)
}

// ---------------------------------------------------------------------------
// Document parsers (docx / xlsx text extraction)
// ---------------------------------------------------------------------------
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function extractTextFromXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  let text = ''
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    text += `\n--- Sheet: ${sheetName} ---\n`
    text += XLSX.utils.sheet_to_csv(sheet)
  }
  return text
}

module.exports = {
  getAdminClient,
  authenticate,
  jsonResponse,
  getProviderApiKey,
  extractQuestionsFromDocument,
  answerSingleQuestion,
  DEFAULT_MODEL,
  extractTextFromDocx,
  extractTextFromXlsx,
}
