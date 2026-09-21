const { authenticate, jsonResponse, getProviderApiKey, extractQuestionsFromDocument, extractTextFromDocx, extractTextFromXlsx } = require('./_shared')

const SUBJECT_NAMES = [
  'English', 'Pakistan Affairs', 'Current Affairs', 'Islamiat', 'Everyday Science',
  'Computer Science', 'General Knowledge', 'Mathematics', 'Analytical Reasoning',
  'Geography', 'Constitution & Political Science', 'Urdu', 'Other',
]

function matchSubjectName(name) {
  if (!name) return 'Other'
  const found = SUBJECT_NAMES.find((s) => s.toLowerCase() === String(name).trim().toLowerCase())
  return found || 'Other'
}

function matchOrgCode(name) {
  if (!name) return 'OTHER'
  const n = String(name).toUpperCase()
  for (const code of ['FPSC', 'CSS', 'NTS', 'STS', 'PPSC']) {
    if (n.includes(code)) return code
  }
  return 'OTHER'
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const auth = await authenticate(event)
  if (!auth) return jsonResponse(401, { error: 'Not authenticated' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { paperId } = body
  if (!paperId) return jsonResponse(400, { error: 'paperId is required' })

  const { admin, user, isAdmin } = auth

  const { data: paper, error: paperErr } = await admin.from('papers').select('*').eq('id', paperId).single()
  if (paperErr || !paper) return jsonResponse(404, { error: 'Paper not found' })
  if (paper.uploaded_by !== user.id && !isAdmin) return jsonResponse(403, { error: 'Not your paper' })

  try {
    const { apiKey, model } = await getProviderApiKey(admin)
    if (!apiKey) {
      await admin.from('papers').update({
        status: 'failed',
        extraction_error: 'No AI provider API key is configured yet. Ask an admin to add one in Settings.',
      }).eq('id', paperId)
      return jsonResponse(400, { error: 'No AI provider API key configured. Go to Settings (admin) to add one.' })
    }

    const { data: fileBlob, error: dlErr } = await admin.storage.from('papers').download(paper.file_path)
    if (dlErr || !fileBlob) throw new Error(`Could not download uploaded file: ${dlErr?.message || 'unknown error'}`)

    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extracted
    const fileType = paper.file_type

    if (fileType === 'pdf') {
      extracted = await extractQuestionsFromDocument({
        apiKey, model, fileType: 'pdf', base64Data: buffer.toString('base64'),
        paperMeta: { title: paper.title, organization: paper.exam_name, year: paper.year },
      })
    } else if (fileType === 'image') {
      const ext = (paper.file_path.split('.').pop() || 'jpg').toLowerCase()
      const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      extracted = await extractQuestionsFromDocument({
        apiKey, model, fileType: 'image', base64Data: buffer.toString('base64'), mediaType,
        paperMeta: { title: paper.title, organization: paper.exam_name, year: paper.year },
      })
    } else if (fileType === 'docx') {
      const rawText = await extractTextFromDocx(buffer)
      extracted = await extractQuestionsFromDocument({
        apiKey, model, fileType: 'text', rawText,
        paperMeta: { title: paper.title, organization: paper.exam_name, year: paper.year },
      })
    } else if (fileType === 'xlsx') {
      const rawText = extractTextFromXlsx(buffer)
      extracted = await extractQuestionsFromDocument({
        apiKey, model, fileType: 'text', rawText,
        paperMeta: { title: paper.title, organization: paper.exam_name, year: paper.year },
      })
    } else {
      const rawText = buffer.toString('utf-8')
      extracted = await extractQuestionsFromDocument({
        apiKey, model, fileType: 'text', rawText,
        paperMeta: { title: paper.title, organization: paper.exam_name, year: paper.year },
      })
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      await admin.from('papers').update({
        status: 'failed',
        extraction_error: 'No MCQs could be detected in this file. Try a clearer scan or a different format.',
      }).eq('id', paperId)
      return jsonResponse(422, { error: 'No MCQs detected in this file.' })
    }

    // Preload subjects/organizations lookups
    const { data: subjectRows } = await admin.from('subjects').select('id, name')
    const { data: orgRows } = await admin.from('organizations').select('id, code')
    const subjectByName = new Map(subjectRows.map((s) => [s.name.toLowerCase(), s.id]))
    const orgByCode = new Map(orgRows.map((o) => [o.code, o.id]))

    const topicCache = new Map() // `${subjectId}::${topicName}` -> topicId

    async function resolveTopicId(subjectId, topicName) {
      if (!subjectId || !topicName) return null
      const key = `${subjectId}::${topicName.toLowerCase()}`
      if (topicCache.has(key)) return topicCache.get(key)
      const { data: existing } = await admin.from('topics').select('id').eq('subject_id', subjectId).ilike('name', topicName).maybeSingle()
      if (existing?.id) {
        topicCache.set(key, existing.id)
        return existing.id
      }
      const { data: created, error: createErr } = await admin.from('topics').insert({ subject_id: subjectId, name: topicName }).select('id').single()
      if (createErr) return null
      topicCache.set(key, created.id)
      return created.id
    }

    let needsReviewCount = 0
    let insertedCount = 0

    for (const item of extracted) {
      const subjectName = matchSubjectName(item.subject)
      const subjectId = subjectByName.get(subjectName.toLowerCase()) || null
      const topicId = await resolveTopicId(subjectId, item.topic)
      const orgId = orgByCode.get(matchOrgCode(item.organization)) || orgByCode.get('OTHER')

      const needsReview = Boolean(item.needs_review) || !item.correct_option_label
      if (needsReview) needsReviewCount += 1

      const { data: questionRow, error: qErr } = await admin
        .from('questions')
        .insert({
          paper_id: paperId,
          question_number: item.question_number ?? null,
          question_text: item.question_text,
          subject_id: subjectId,
          topic_id: topicId,
          organization_id: orgId,
          year: item.year ?? paper.year ?? null,
          has_answer_key: Boolean(item.has_answer_key),
          confidence: item.confidence || 'low',
          needs_review: needsReview,
          review_reason: item.review_reason || null,
          uploaded_by: user.id,
        })
        .select('id')
        .single()

      if (qErr || !questionRow) continue

      const options = Array.isArray(item.options) ? item.options : []
      if (options.length) {
        await admin.from('options').insert(
          options.map((o) => ({
            question_id: questionRow.id,
            option_label: o.label,
            option_text: o.text,
            is_correct: o.label === item.correct_option_label,
          }))
        )
      }

      if (item.explanation) {
        await admin.from('explanations').insert({
          question_id: questionRow.id,
          explanation_text: item.explanation,
          why_others_wrong: item.why_others_wrong || null,
          generated_by: item.has_answer_key ? 'answer_key' : `anthropic:${model || 'claude-sonnet-4-5'}`,
        })
      }

      if (item.source_note) {
        await admin.from('sources').insert({
          question_id: questionRow.id,
          source_type: item.has_answer_key ? 'answer_key' : 'reference',
          source_note: item.source_note,
        })
      }

      insertedCount += 1
    }

    await admin
      .from('papers')
      .update({ status: 'review', total_questions: insertedCount, extraction_error: null })
      .eq('id', paperId)

    return jsonResponse(200, { paperId, questionCount: insertedCount, needsReviewCount })
  } catch (err) {
    await admin.from('papers').update({ status: 'failed', extraction_error: String(err.message || err) }).eq('id', paperId)
    return jsonResponse(500, { error: `Extraction failed: ${err.message || err}` })
  }
}
