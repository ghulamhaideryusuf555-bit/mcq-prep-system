// One-time admin utility: promotes a user's profile role to 'admin'.
// Needed because Supabase's handle_new_user() trigger only grants admin to
// whichever account is the very first row in public.profiles — if an
// earlier test signup landed there first, the real owner's account is
// stuck as 'user' and never sees the admin-only Settings page.
// Protected by a shared-secret query param. Safe to delete once used.
const { getAdminClient, jsonResponse } = require('./_shared')

exports.handler = async (event) => {
  const secret = event.queryStringParameters?.secret
  if (secret !== 'mcqfix2026') {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const email = event.queryStringParameters?.email
  if (!email) {
    return jsonResponse(400, { error: 'email is required' })
  }

  const admin = getAdminClient()

  const { data: before, error: findErr } = await admin
    .from('profiles')
    .select('id, email, role')
    .ilike('email', email)
    .maybeSingle()

  if (findErr) return jsonResponse(500, { error: `lookup failed: ${findErr.message}` })
  if (!before) return jsonResponse(404, { error: `No profile found with email ${email}` })

  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', before.id)
    .select('id, email, role')
    .single()

  if (updateErr) return jsonResponse(500, { error: `update failed: ${updateErr.message}` })

  return jsonResponse(200, {
    success: true,
    previousRole: before.role,
    userId: updated.id,
    email: updated.email,
    newRole: updated.role,
  })
}
