// POST /api/sdr-approve
// Body: { item_id?: string, id?: string, action: 'approve' | 'reject' }
// Returns: { ok: true, item: object|null }

import { jsonResponse, errorResponse } from './_shared/ai.js';

function getSupabaseConfig(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function requestHeaders(key) {
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const itemId = body.item_id || body.id;
  const action = body.action;

  if (!itemId || typeof itemId !== 'string') return errorResponse('item_id or id required', 400);
  if (action !== 'approve' && action !== 'reject') return errorResponse('action must be approve or reject', 400);

  const config = getSupabaseConfig(env);
  if (!config) return errorResponse('Supabase not configured', 503);

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const res = await fetch(
    config.url + '/rest/v1/sdr_approval_items?id=eq.' + encodeURIComponent(itemId),
    {
      method: 'PATCH',
      headers: requestHeaders(config.key),
      body: JSON.stringify({ status: nextStatus, ts: new Date().toISOString() }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return errorResponse('Update failed: ' + text, res.status);
  }

  const rows = await res.json().catch(() => []);
  return jsonResponse({ ok: true, item: rows[0] || null });
}
