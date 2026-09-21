const { authenticate, jsonResponse } = require('./_shared')

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  google_vision: null,
}

// Admin-only: store/rotate a provider API key. The key text is written into
// Supabase Vault (encrypted at rest) via the admin_set_api_key() RPC and is
// never persisted anywhere in plaintext, never returned to the frontend.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const auth = await authenticate(event)
  if (!auth) return jsonResponse(401, { error: 'Not authenticated' })
  if (!auth.isAdmin) return jsonResponse(403, { error: 'Admin only' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { provider, apiKey, model } = body
  if (!provider || !apiKey) return jsonResponse(400, { error: 'provider and apiKey are required' })
  if (apiKey.length < 8) return jsonResponse(400, { error: 'That API key looks too short to be valid.' })

  const secretName = `${provider}_api_key`

  // Use a user-scoped client (not the raw service client) so admin_set_api_key's
  // internal auth.uid() check sees the real caller and enforces admin-only itself
  // as defense in depth, even though we already checked auth.isAdmin above.
  const { createClient } = require('@supabase/supabase-js')
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: event.headers?.authorization || event.headers?.Authorization } },
  })

  const { error } = await userClient.rpc('admin_set_api_key', {
    p_setting_key: 'ai_provider',
    p_provider: provider,
    p_model: model || DEFAULT_MODELS[provider] || null,
    p_secret_name: secretName,
    p_secret_value: apiKey,
  })

  if (error) return jsonResponse(500, { error: error.message })

  return jsonResponse(200, { ok: true, provider, model: model || DEFAULT_MODELS[provider] || null })
}
