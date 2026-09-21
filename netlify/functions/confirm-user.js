// One-time admin utility: manually confirms a user's email in Supabase Auth,
// for cases where the confirmation email never arrived (deliverability issues,
// full inbox, etc). Protected by a simple shared-secret query param so it
// isn't a fully open endpoint. Safe to delete this file once used.
const { getAdminClient, jsonResponse } = require('./_shared')

exports.handler = async (event) => {
  const secret = event.queryStringParameters?.secret
  if (secret !== 'mcqfix2026') {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  let email = event.queryStringParameters?.email
  if (!email && event.httpMethod === 'POST') {
    try {
      ;({ email } = JSON.parse(event.body || '{}'))
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' })
    }
  }
  if (!email) {
    return jsonResponse(400, { error: 'email is required' })
  }

  const admin = getAdminClient()

  let targetUser = null
  let page = 1
  for (; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return jsonResponse(500, { error: `listUsers failed: ${error.message}` })
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) {
      targetUser = found
      break
    }
    if (data.users.length < 200) break
  }

  if (!targetUser) {
    return jsonResponse(404, { error: `No user found with email ${email}` })
  }

  const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(targetUser.id, {
    email_confirm: true,
  })
  if (updateErr) {
    return jsonResponse(500, { error: `updateUserById failed: ${updateErr.message}` })
  }

  return jsonResponse(200, {
    success: true,
    userId: updated.user.id,
    email: updated.user.email,
    confirmed: !!updated.user.email_confirmed_at,
  })
}
