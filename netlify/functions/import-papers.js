const { authenticate, jsonResponse } = require('./_shared')

// Confirms a paper's reviewed questions and makes it permanently visible.
// Never called automatically — the user must explicitly review and confirm
// (per the "never silently save incorrectly detected questions" requirement).
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
  if (paper.status !== 'review') return jsonResponse(400, { error: `Paper is not in review state (status: ${paper.status})` })

  const { data: questions, error: qErr } = await admin.from('questions').select('id').eq('paper_id', paperId)
  if (qErr) return jsonResponse(500, { error: qErr.message })
  if (!questions || questions.length === 0) {
    return jsonResponse(400, { error: 'No questions to import for this paper.' })
  }

  // Duplicate/similar-question detection across the whole library.
  let duplicatesFound = 0
  for (const q of questions) {
    const { data: similar } = await admin.rpc('find_similar_questions', { p_question_id: q.id, p_threshold: 0.85 })
    if (similar && similar.length > 0) {
      await admin.from('questions').update({ is_duplicate_of: similar[0].id }).eq('id', q.id)
      duplicatesFound += 1
    }
  }

  const { error: updateErr } = await admin
    .from('papers')
    .update({ status: 'imported', imported_at: new Date().toISOString(), total_questions: questions.length })
    .eq('id', paperId)

  if (updateErr) return jsonResponse(500, { error: updateErr.message })

  return jsonResponse(200, { paperId, importedQuestions: questions.length, duplicatesFound })
}
