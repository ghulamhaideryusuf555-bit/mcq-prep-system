const { authenticate, jsonResponse, getProviderApiKey, answerSingleQuestion } = require('./_shared')

// One-click "Solve This MCQ" / "Explain Answer" / re-verify a flagged question.
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

  const { questionId, applyResult } = body
  if (!questionId) return jsonResponse(400, { error: 'questionId is required' })

  const { admin } = auth

  const { data: question, error: qErr } = await admin.from('questions').select('*').eq('id', questionId).single()
  if (qErr || !question) return jsonResponse(404, { error: 'Question not found' })

  const { data: options } = await admin.from('options').select('*').eq('question_id', questionId).order('option_label')
  if (!options || options.length === 0) return jsonResponse(400, { error: 'This question has no options' })

  try {
    const { apiKey, model } = await getProviderApiKey(admin)
    if (!apiKey) return jsonResponse(400, { error: 'No AI provider API key configured. Ask an admin to add one in Settings.' })

    const result = await answerSingleQuestion({ apiKey, model, questionText: question.question_text, options })

    if (applyResult) {
      await admin.from('options').update({ is_correct: false }).eq('question_id', questionId)
      if (result.correct_option_label) {
        await admin.from('options').update({ is_correct: true }).eq('question_id', questionId).eq('option_label', result.correct_option_label)
      }
      await admin.from('questions').update({
        confidence: result.confidence || 'low',
        needs_review: Boolean(result.needs_review),
        review_reason: result.review_reason || null,
      }).eq('id', questionId)

      await admin.from('explanations').upsert(
        {
          question_id: questionId,
          explanation_text: result.explanation,
          why_others_wrong: result.why_others_wrong || null,
          generated_by: `anthropic:${model || 'claude-sonnet-4-5'}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'question_id' }
      )

      if (result.source_note) {
        await admin.from('sources').insert({ question_id: questionId, source_type: 'reference', source_note: result.source_note })
      }
    }

    return jsonResponse(200, { questionId, result })
  } catch (err) {
    return jsonResponse(500, { error: `AI verification failed: ${err.message || err}` })
  }
}
