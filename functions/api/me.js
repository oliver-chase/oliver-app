// GET /api/me — returns the CF Access authenticated user email.
// In local dev (no CF Access), returns { email: null }.
export async function onRequestGet(context) {
  const email = context.request.headers.get('cf-access-authenticated-user-email') ?? null
  return new Response(JSON.stringify({ email }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
