// /api/sdr-prospects — server-side writes for sdr_prospects
//
// POST  : insert a prospect row
// PATCH : update allowed prospect fields by id
//
// Authz:
// - Production path: Cloudflare Access header `cf-access-authenticated-user-email`
// - Caller must map to app_users and be admin or have sdr permission
// - Optional local/dev fallback (disabled by default):
//   set SDR_APPROVAL_TRUST_CLIENT_IDENTITY=1 and send user_id/user_email in body

import { jsonResponse, errorResponse } from './_shared/ai.js';

const ALLOWED_UPDATE_FIELDS = new Set(['st', 'tr', 'nfu', 'lc', 'sig', 'ind', 'sz']);
const ALLOWED_INSERT_FIELDS = new Set([
  'id', 'nm', 'fn', 'ti', 'co', 'em', 'dm', 'st', 'tr',
  'sig', 'ind', 'sz', 'rev', 'city', 'state', 'country',
  'fuc', 'fc', 'sc', 'tc', 'nfu', 'lc', 'lu', 'created_at',
]);

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

function assertSupabaseConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/sdr-prospects. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/sdr-prospects. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function resolveActorIdentity(request, body, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', email: cfAccessEmail, userId: '' };
  }

  const trustClientIdentity = env.SDR_APPROVAL_TRUST_CLIENT_IDENTITY === '1';
  if (!trustClientIdentity) return null;

  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const userEmail = normalizeEmail(body.user_email || '');
  if (!userId && !userEmail) return null;

  return { source: 'client', email: userEmail, userId };
}

async function fetchActorAppUser(env, identity) {
  const supabaseUrl = resolveSupabaseUrl(env);
  let query;

  if (identity.email) {
    query =
      '/rest/v1/app_users?email=eq.' +
      encodeURIComponent(identity.email) +
      '&select=user_id,email,role,page_permissions&limit=1';
  } else if (identity.userId) {
    query =
      '/rest/v1/app_users?user_id=eq.' +
      encodeURIComponent(identity.userId) +
      '&select=user_id,email,role,page_permissions&limit=1';
  } else {
    return { ok: false, status: 401, error: 'Missing user identity for SDR write' };
  }

  const response = await fetch(supabaseUrl + query, {
    headers: serviceHeaders(env),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      error: 'Failed to verify SDR actor: ' + text,
    };
  }

  const rows = await response.json().catch(() => []);
  return { ok: true, row: rows[0] || null };
}

function isAuthorizedSdrActor(appUser) {
  if (!appUser) return false;
  if (appUser.role === 'admin') return true;
  if (!Array.isArray(appUser.page_permissions)) return false;
  return appUser.page_permissions.includes('sdr');
}

async function authorizeActor(request, body, env) {
  const identity = resolveActorIdentity(request, body, env);
  if (!identity) return { ok: false, status: 401, error: 'Unauthorized SDR write request. Missing verified actor identity.' };

  const actorLookup = await fetchActorAppUser(env, identity);
  if (!actorLookup.ok) return actorLookup;

  if (!isAuthorizedSdrActor(actorLookup.row)) {
    return { ok: false, status: 403, error: 'Forbidden. SDR permission required.' };
  }

  return { ok: true, actor: actorLookup.row };
}

function sanitizeInsertProspect(prospect) {
  const source = (prospect && typeof prospect === 'object') ? prospect : {};
  const row = {};

  for (const key of ALLOWED_INSERT_FIELDS) {
    if (source[key] !== undefined) row[key] = source[key];
  }

  if (typeof row.id !== 'string' || !row.id.trim()) return null;
  if (typeof row.nm !== 'string' || !row.nm.trim()) return null;
  if (typeof row.co !== 'string' || !row.co.trim()) return null;

  if (row.em !== undefined && typeof row.em !== 'string') return null;
  if (row.em !== undefined) row.em = row.em.trim().toLowerCase();

  row.lu = new Date().toISOString();
  if (!row.created_at) row.created_at = row.lu;
  if (!row.st) row.st = 'new';

  return row;
}

function sanitizePatch(rawPatch) {
  if (!rawPatch || typeof rawPatch !== 'object') return null;
  const patch = {};

  for (const [key, value] of Object.entries(rawPatch)) {
    if (!ALLOWED_UPDATE_FIELDS.has(key)) continue;
    patch[key] = value;
  }

  if (Object.keys(patch).length === 0) return null;
  patch.lu = new Date().toISOString();
  return patch;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertSupabaseConfigured(env);
  if (missing) return missing;

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON body', 400); }

  const authz = await authorizeActor(request, body, env);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const row = sanitizeInsertProspect(body.prospect);
  if (!row) return errorResponse('Invalid prospect payload', 400);

  const supabaseUrl = resolveSupabaseUrl(env);
  const response = await fetch(supabaseUrl + '/rest/v1/sdr_prospects', {
    method: 'POST',
    headers: {
      ...serviceHeaders(env),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return errorResponse('Insert failed: ' + text, response.status);
  }

  const rows = await response.json().catch(() => []);
  return jsonResponse({
    ok: true,
    actor_email: authz.actor?.email || null,
    prospect: rows[0] || null,
  }, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const missing = assertSupabaseConfigured(env);
  if (missing) return missing;

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON body', 400); }

  const authz = await authorizeActor(request, body, env);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const prospectId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!prospectId) return errorResponse('id required', 400);

  const patch = sanitizePatch(body.patch);
  if (!patch) return errorResponse('No allowed fields to update', 400);

  const supabaseUrl = resolveSupabaseUrl(env);
  const response = await fetch(
    supabaseUrl + '/rest/v1/sdr_prospects?id=eq.' + encodeURIComponent(prospectId),
    {
      method: 'PATCH',
      headers: {
        ...serviceHeaders(env),
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return errorResponse('Update failed: ' + text, response.status);
  }

  const rows = await response.json().catch(() => []);
  return jsonResponse({
    ok: true,
    actor_email: authz.actor?.email || null,
    prospect: rows[0] || null,
  });
}

