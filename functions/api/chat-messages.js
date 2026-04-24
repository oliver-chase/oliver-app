// /api/chat-messages — OliverDock history via Supabase service role.
//
// GET    /api/chat-messages?user_id=XYZ&page_label=Accounts
// POST   /api/chat-messages { user_id, page_label, messages: [{ role, text, kind? }] }
// DELETE /api/chat-messages?user_id=XYZ&page_label=Accounts

import { jsonResponse, errorResponse } from './_shared/ai.js';

function resolveServiceKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || null;
}

function resolveSupabaseUrl(env) {
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || null;
}

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
    return errorResponse('Supabase URL not configured for /api/chat-messages. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/chat-messages. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

function buildQuery(url) {
  const userId = url.searchParams.get('user_id');
  const pageLabel = url.searchParams.get('page_label');
  if (!userId || !pageLabel) return null;
  return (
    '/rest/v1/chat_messages?user_id=eq.' + encodeURIComponent(userId) +
    '&page_label=eq.' + encodeURIComponent(pageLabel) +
    '&order=created_at.asc'
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  const url = new URL(request.url);
  const query = buildQuery(url);
  if (!query) return errorResponse('user_id and page_label required', 400);

  const res = await fetch(supabaseUrl + query, { headers: serviceHeaders(env) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return errorResponse('Fetch failed: ' + text, res.status);
  }

  const rows = await res.json();
  return jsonResponse(rows);
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  const url = new URL(request.url);
  const query = buildQuery(url);
  if (!query) return errorResponse('user_id and page_label required', 400);

  const res = await fetch(supabaseUrl + query, {
    method: 'DELETE',
    headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return errorResponse('Delete failed: ' + text, res.status);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const supabaseUrl = resolveSupabaseUrl(env);

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { user_id, page_label, messages } = body;
  if (!user_id || typeof user_id !== 'string') return errorResponse('user_id required', 400);
  if (!page_label || typeof page_label !== 'string') return errorResponse('page_label required', 400);
  if (!Array.isArray(messages)) return errorResponse('messages array required', 400);

  const rows = messages
    .filter((message) => message && typeof message.text === 'string' && message.text.trim())
    .map((message) => ({
      user_id,
      page_label,
      role: message.role === 'user' ? 'user' : 'assistant',
      text: message.text,
      kind: typeof message.kind === 'string' ? message.kind : 'msg',
    }));

  const deleteQuery =
    '/rest/v1/chat_messages?user_id=eq.' + encodeURIComponent(user_id) +
    '&page_label=eq.' + encodeURIComponent(page_label);

  const deleteRes = await fetch(supabaseUrl + deleteQuery, {
    method: 'DELETE',
    headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
  });
  if (!deleteRes.ok) {
    const text = await deleteRes.text().catch(() => '');
    return errorResponse('Reset failed: ' + text, deleteRes.status);
  }

  if (rows.length === 0) return jsonResponse({ ok: true, count: 0 });

  const insertRes = await fetch(supabaseUrl + '/rest/v1/chat_messages', {
    method: 'POST',
    headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => '');
    return errorResponse('Insert failed: ' + text, insertRes.status);
  }

  return jsonResponse({ ok: true, count: rows.length });
}
