// /api/admin/keys — AI config key management (admin only)
// GET:    returns all keys (api_key masked to last 4 chars)
// POST:   { provider, model, api_key, fallback_key?, label?, is_active? }
// PATCH:  { id, is_active?, fallback_key?, model?, label? }
// DELETE: { id }

import { jsonResponse, errorResponse } from '../_shared/ai.js';

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

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeUserId(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseOwnerPolicy(env) {
  const ownerEmails = new Set(
    (env.OWNER_EMAILS || '')
      .split(',')
      .map(part => normalizeEmail(part))
      .filter(Boolean),
  );
  const ownerUserIds = new Set(
    (env.OWNER_USER_IDS || '')
      .split(',')
      .map(part => normalizeUserId(part))
      .filter(Boolean),
  );
  return { ownerEmails, ownerUserIds };
}

function isOwnerIdentity(identity, ownerPolicy) {
  if (!identity) return false;
  if (identity.email && ownerPolicy.ownerEmails.has(identity.email)) return true;
  if (identity.userId && ownerPolicy.ownerUserIds.has(identity.userId)) return true;
  return false;
}

function assertConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/admin/keys. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/admin/keys. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

function resolveActorIdentity(request, env, body = null) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', email: cfAccessEmail, userId: '' };
  }

  if (env.ADMIN_KEYS_TRUST_CLIENT_IDENTITY !== '1') return null;
  const url = new URL(request.url);
  const actor = body && typeof body === 'object' ? body : {};
  const actorEmail = normalizeEmail(
    request.headers.get('x-user-email')
    || actor.actor_email
    || url.searchParams.get('actor_email')
    || '',
  );
  const actorUserId = normalizeUserId(
    request.headers.get('x-user-id')
    || actor.actor_user_id
    || url.searchParams.get('actor_user_id')
    || '',
  );
  if (!actorEmail && !actorUserId) return null;
  return { source: 'trusted-client', email: actorEmail, userId: actorUserId };
}

async function supabaseJson(env, path, init = {}) {
  const response = await fetch(resolveSupabaseUrl(env) + path, {
    ...init,
    headers: {
      ...serviceHeaders(env),
      ...(init.headers || {}),
    },
  });

  const text = await response.text().catch(() => '');
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    data,
  };
}

async function fetchActorAppUser(env, identity) {
  let path = '';
  if (identity.email && identity.userId) {
    path = '/rest/v1/app_users?or=(email.eq.' + encodeURIComponent(identity.email) + ',user_id.eq.' + encodeURIComponent(identity.userId) + ')&select=user_id,email,role&limit=1';
  } else if (identity.email) {
    path = '/rest/v1/app_users?email=eq.' + encodeURIComponent(identity.email) + '&select=user_id,email,role&limit=1';
  } else if (identity.userId) {
    path = '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(identity.userId) + '&select=user_id,email,role&limit=1';
  } else {
    return null;
  }

  const lookup = await supabaseJson(env, path);
  if (!lookup.ok) return null;
  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  return rows[0] || null;
}

async function requireAdmin(context, body = null) {
  const { request, env } = context;
  const ownerPolicy = parseOwnerPolicy(env);
  const identity = resolveActorIdentity(request, env, body);
  if (!identity) return { ok: false, response: errorResponse('Unauthorized request. Missing verified actor identity.', 401) };

  const actor = await fetchActorAppUser(env, identity);
  const actorRole = actor?.role === 'admin' ? 'admin' : 'user';
  const isOwner = isOwnerIdentity(
    {
      email: identity.email || normalizeEmail(actor?.email || ''),
      userId: identity.userId || normalizeUserId(actor?.user_id || ''),
    },
    ownerPolicy,
  );
  if (!isOwner && actorRole !== 'admin') {
    return { ok: false, response: errorResponse('Forbidden. Admin access required.', 403) };
  }

  return { ok: true };
}

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return '****' + key.slice(-4);
}

export async function onRequestGet(context) {
  const { env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  const authz = await requireAdmin(context);
  if (!authz.ok) return authz.response;

  const list = await supabaseJson(env, '/rest/v1/ai_config?order=created_at.desc');
  if (!list.ok) return errorResponse('Failed to fetch keys: ' + list.text, list.status);

  const rows = Array.isArray(list.data) ? list.data : [];
  const masked = rows.map(row => ({
    ...row,
    api_key: maskKey(row.api_key),
    fallback_key: row.fallback_key ? maskKey(row.fallback_key) : null,
  }));
  return jsonResponse(masked);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  const authz = await requireAdmin(context, body);
  if (!authz.ok) return authz.response;
  if (!body.api_key || typeof body.api_key !== 'string') return errorResponse('api_key required', 400);

  const record = {
    provider: typeof body.provider === 'string' ? body.provider : 'anthropic',
    model: typeof body.model === 'string' ? body.model : 'claude-haiku-4-5-20251001',
    api_key: body.api_key,
    fallback_key: typeof body.fallback_key === 'string' && body.fallback_key ? body.fallback_key : null,
    label: typeof body.label === 'string' && body.label ? body.label : null,
    is_active: body.is_active !== false,
  };

  const insert = await supabaseJson(
    env,
    '/rest/v1/ai_config',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(record),
    },
  );
  if (!insert.ok) return errorResponse('Failed to create key: ' + insert.text, insert.status);
  const createdRows = Array.isArray(insert.data) ? insert.data : [];
  const created = createdRows[0] || {};
  return jsonResponse({
    ...created,
    api_key: maskKey(created.api_key || ''),
    fallback_key: created.fallback_key ? maskKey(created.fallback_key) : null,
  }, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  const authz = await requireAdmin(context, body);
  if (!authz.ok) return authz.response;
  if (!body.id || typeof body.id !== 'string') return errorResponse('id required', 400);

  const fields = {};
  if (body.is_active !== undefined) fields.is_active = !!body.is_active;
  if (body.fallback_key !== undefined) fields.fallback_key = body.fallback_key || null;
  if (body.model !== undefined) fields.model = body.model || null;
  if (body.label !== undefined) fields.label = body.label || null;

  if (Object.keys(fields).length === 0) return errorResponse('no updatable fields', 400);

  const update = await supabaseJson(
    env,
    '/rest/v1/ai_config?id=eq.' + encodeURIComponent(body.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    },
  );
  if (!update.ok) return errorResponse('Update failed: ' + update.text, update.status);
  return jsonResponse({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  const authz = await requireAdmin(context, body);
  if (!authz.ok) return authz.response;
  if (!body.id || typeof body.id !== 'string') return errorResponse('id required', 400);

  const del = await supabaseJson(
    env,
    '/rest/v1/ai_config?id=eq.' + encodeURIComponent(body.id),
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    },
  );
  if (!del.ok) return errorResponse('Delete failed: ' + del.text, del.status);
  return jsonResponse({ ok: true });
}
