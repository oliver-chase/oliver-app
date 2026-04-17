// /api/admin/keys — AI config key management
// GET:    returns all keys (api_key masked to last 4 chars)
// POST:   { provider, model, api_key, fallback_key?, label? } — create key
// PATCH:  { id, is_active?, fallback_key?, model?, label? } — update key
// DELETE: { id } — remove key

import { jsonResponse, errorResponse } from '../_shared/ai.js';

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return '****' + key.slice(-4);
}

export async function onRequestGet(context) {
  const { env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return errorResponse('Supabase not configured', 503);

  const res = await fetch(
    supabaseUrl + '/rest/v1/ai_config?order=created_at.desc',
    { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
  );

  if (!res.ok) return errorResponse('Failed to fetch keys', 500);

  const rows = await res.json();
  const masked = rows.map(r => ({
    ...r,
    api_key: maskKey(r.api_key),
    fallback_key: r.fallback_key ? maskKey(r.fallback_key) : null,
  }));

  return jsonResponse(masked);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return errorResponse('Supabase not configured', 503);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  if (!body.api_key) return errorResponse('api_key required', 400);

  const record = {
    provider: body.provider || 'anthropic',
    model: body.model || 'claude-haiku-4-5-20251001',
    api_key: body.api_key,
    fallback_key: body.fallback_key || null,
    label: body.label || null,
    is_active: body.is_active !== false,
  };

  const res = await fetch(supabaseUrl + '/rest/v1/ai_config', {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(record),
  });

  if (!res.ok) return errorResponse('Failed to create key', 500);
  const created = await res.json();
  return jsonResponse(created[0] || {}, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return errorResponse('Supabase not configured', 503);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  if (!body.id) return errorResponse('id required', 400);

  const { id, ...fields } = body;
  delete fields.api_key;

  const res = await fetch(supabaseUrl + '/rest/v1/ai_config?id=eq.' + id, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(fields),
  });

  return res.ok ? jsonResponse({ ok: true }) : errorResponse('Update failed', 500);
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return errorResponse('Supabase not configured', 503);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  if (!body.id) return errorResponse('id required', 400);

  const res = await fetch(supabaseUrl + '/rest/v1/ai_config?id=eq.' + body.id, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Prefer': 'return=minimal',
    },
  });

  return res.ok ? jsonResponse({ ok: true }) : errorResponse('Delete failed', 500);
}
