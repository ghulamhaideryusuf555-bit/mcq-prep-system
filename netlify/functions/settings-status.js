const { authenticate, jsonResponse } = require('./_shared')

// Reports WHETHER a provider key is configured, without ever exposing the
// key itself. Admin only.
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' })

  const auth = await authenticate(event)
  if (!auth) return jsonResponse(401, { error: 'Not authenticated' })
  if (!auth.isAdmin) return jsonResponse(403, { error: 'Admin only' })

  const { data } = await auth.admin.from('app_settings').select('key, provider, model, is_configured, updated_at').eq('key', 'ai_provider').maybeSingle()

  return jsonResponse(200, { setting: data || null })
}
