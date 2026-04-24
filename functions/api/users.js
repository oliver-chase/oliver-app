// /api/users — app_users CRUD via Supabase service role.
// app_users has RLS policy denying client (anon/authenticated) access.
// All reads/writes must go through this function. CF Access gates traffic
// upstream; this layer enforces that mutations only happen server-side
// with the service role key (never shipped to the browser).
//
// GET    /api/users               -> list all users (admin UI)
// GET    /api/users?user_id=XYZ   -> fetch one user
// POST   /api/users               -> upsert { user_id, email, name }
// PATCH  /api/users               -> { user_id, role?, page_permissions? }

import { jsonResponse, errorResponse } from './_shared/ai.js';

function resolveServiceKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || null;
}

function resolveSupabaseUrl(env) {
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || null;
}

const VALID_PAGE_PERMISSIONS = new Set(['accounts', 'hr', 'sdr', 'crm', 'slides']);

function serviceHeaders(env) {
  const key = resolveServiceKey(env);
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
  };
}

function assertConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/users. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/users. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const email = url.searchParams.get('email');

  let path = '/rest/v1/app_users?order=created_at.asc';
  if (userId) path = '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(userId);
  else if (email) path = '/rest/v1/app_users?email=eq.' + encodeURIComponent(email);

  const res = await fetch(supabaseUrl + path, { headers: serviceHeaders(env) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return errorResponse('Fetch failed: ' + text, res.status);
  }
  const rows = await res.json();

  if (userId || email) return jsonResponse(rows[0] || null);
  return jsonResponse(rows);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }
  if (!body.user_id || !body.email) return errorResponse('user_id and email required', 400);

  const existingRes = await fetch(
    supabaseUrl + '/rest/v1/app_users?or=(user_id.eq.' +
      encodeURIComponent(body.user_id) + ',email.eq.' + encodeURIComponent(body.email) + ')',
    { headers: serviceHeaders(env) },
  );
  if (!existingRes.ok) {
    const text = await existingRes.text().catch(() => '');
    return errorResponse('Lookup failed: ' + text, existingRes.status);
  }
  const existing = await existingRes.json();

  if (existing.length > 0) {
    const row = existing[0];
    const updateRes = await fetch(
      supabaseUrl + '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(row.user_id),
      {
        method: 'PATCH',
        headers: { ...serviceHeaders(env), Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: body.user_id,
          name: body.name ?? row.name,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!updateRes.ok) {
      const text = await updateRes.text().catch(() => '');
      return errorResponse('Update failed: ' + text, updateRes.status);
    }
    const updated = await updateRes.json();
    return jsonResponse(updated[0] || null);
  }

  const insertRes = await fetch(supabaseUrl + '/rest/v1/app_users', {
    method: 'POST',
    headers: { ...serviceHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: body.user_id,
      email: body.email,
      name: body.name || '',
    }),
  });
  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => '');
    return errorResponse('Insert failed: ' + text, insertRes.status);
  }
  const inserted = await insertRes.json();
  return jsonResponse(inserted[0] || null, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }
  if (!body.user_id) return errorResponse('user_id required', 400);

  const fields = {};
  if (body.role !== undefined) {
    if (body.role !== 'admin' && body.role !== 'user') return errorResponse('invalid role', 400);
    fields.role = body.role;
  }
  if (body.page_permissions !== undefined) {
    if (!Array.isArray(body.page_permissions)) return errorResponse('page_permissions must be array', 400);
    const invalid = body.page_permissions.find(p => typeof p !== 'string' || !VALID_PAGE_PERMISSIONS.has(p));
    if (invalid) return errorResponse('invalid page permission: ' + String(invalid), 400);
    fields.page_permissions = body.page_permissions;
  }
  if (Object.keys(fields).length === 0) return errorResponse('no updatable fields', 400);

  const res = await fetch(
    supabaseUrl + '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(body.user_id),
    {
      method: 'PATCH',
      headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    },
  );
  if (!res.ok) return errorResponse('Update failed', res.status);
  return jsonResponse({ ok: true });
}
