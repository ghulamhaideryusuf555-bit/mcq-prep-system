// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set these in your Netlify environment variables.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ---------------------------------------------------------------------------
// Netlify Functions API wrapper. Every call attaches the current Supabase
// session's access token so functions can verify the user (and role)
// server-side before touching secrets or writing data.
// ---------------------------------------------------------------------------
async function authedFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`/api${path}`, { ...options, headers })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = payload?.error || `Request failed (${res.status})`
    throw new Error(message)
  }
  return payload
}

export const api = {
  extractPaper: (body) => authedFetch('/extract', { method: 'POST', body: JSON.stringify(body) }),
  importPaper: (body) => authedFetch('/import-papers', { method: 'POST', body: JSON.stringify(body) }),
  verifyAnswer: (body) => authedFetch('/verify-answer', { method: 'POST', body: JSON.stringify(body) }),
  saveApiKey: (body) => authedFetch('/save-api-key', { method: 'POST', body: JSON.stringify(body) }),
  settingsStatus: () => authedFetch('/settings-status', { method: 'GET' }),
}

// ---------------------------------------------------------------------------
// File helpers (upload validation, hashing, formatting)
// ---------------------------------------------------------------------------
export async function sha256Hex(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function detectFileType(file) {
  const name = file.name.toLowerCase()
  const type = file.type
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|heic)$/.test(name)) return 'image'
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'docx'
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheetml')) return 'xlsx'
  if (name.endsWith('.txt') || type === 'text/plain') return 'text'
  return null
}

export const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.txt'
export const MAX_FILE_SIZE_MB = 25

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let val = bytes
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i += 1
  }
  return `${val.toFixed(1)} ${units[i]}`
}
