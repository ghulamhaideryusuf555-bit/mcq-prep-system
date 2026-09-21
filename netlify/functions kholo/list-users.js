const { getAdminClient, jsonResponse } = require('./_shared')

exports.handler = async (event) => {
  const secret = event.queryStringParameters?.secret
  if (secret !== 'mcqfix2026') {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) return jsonResponse(500, { error: `listUsers failed: ${error.message}` })

  const users = data.users.map((u) => ({
    email: u.email,
    confirmed: !!u.email_confirmed_at,
    created_at: u.created_at,
  }))

  return jsonResponse(200, { users })
}
