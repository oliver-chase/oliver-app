// /api/users — app_users CRUD via Supabase service role.
//
// Authz:
// - Production: requires Cloudflare Access identity header:
//   cf-access-authenticated-user-email
// - Optional local/dev fallback (disabled by default):
//   set USERS_TRUST_CLIENT_IDENTITY=1 and send actor_email/actor_user_id
//   through query/body or x-user-email/x-user-id headers.
//
// Access rules:
// - GET /api/users                   -> admin only (list all users)
// - GET /api/users?user_id=...       -> self or admin
// - GET /api/users?email=...         -> self or admin
// - POST /api/users                  -> self bootstrap/upsert or admin upsert
// - PATCH /api/users                 -> admin only
//
// Owner policy:
// - OWNER_EMAILS CSV and OWNER_USER_IDS CSV define immutable owners.
// - Owners are always returned as admin with full module permissions.
// - Owner demotion or permission stripping is blocked.

import { jsonResponse, errorResponse } from './_shared/ai.js';

const VALID_PAGE_PERMISSIONS = new Set(['accounts', 'hr', 'sdr', 'crm', 'slides']);
const ALL_PAGE_PERMISSIONS = ['accounts', 'hr', 'sdr', 'crm', 'slides'];
const USER_FIELDS = 'user_id,email,name,role,page_permissions,created_at,updated_at';

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
    return errorResponse('Supabase URL not configured for /api/users. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/users. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeUserId(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function uniquePermissions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim().toLowerCase();
    if (!VALID_PAGE_PERMISSIONS.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function parseOwnerPolicy(env) {
  const ownerEmails = new Set(
    (env.OWNER_EMAILS || '')
      .split(',')
      .map(item => normalizeEmail(item))
      .filter(Boolean),
  );
  const ownerUserIds = new Set(
    (env.OWNER_USER_IDS || '')
      .split(',')
      .map(item => normalizeUserId(item))
      .filter(Boolean),
  );
  return { ownerEmails, ownerUserIds };
}

function normalizeUserRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    user_id: normalizeUserId(row.user_id),
    email: normalizeEmail(row.email),
    name: typeof row.name === 'string' ? row.name : '',
    role: row.role === 'admin' ? 'admin' : 'user',
    page_permissions: uniquePermissions(row.page_permissions),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function isOwnerIdentity(identity, ownerPolicy) {
  if (!identity) return false;
  if (identity.email && ownerPolicy.ownerEmails.has(identity.email)) return true;
  if (identity.userId && ownerPolicy.ownerUserIds.has(identity.userId)) return true;
  return false;
}

function isOwnerUser(user, ownerPolicy) {
  if (!user) return false;
  return isOwnerIdentity({ email: user.email, userId: user.user_id }, ownerPolicy);
}

function hasFullPermissions(pagePermissions) {
  return ALL_PAGE_PERMISSIONS.every(permission => pagePermissions.includes(permission));
}

function toEffectiveUser(user, ownerPolicy) {
  if (!user) return null;
  const owner = isOwnerUser(user, ownerPolicy);
  const effectiveRole = owner ? 'admin' : user.role;
  const effectivePermissions = owner ? [...ALL_PAGE_PERMISSIONS] : [...user.page_permissions];
  return {
    ...user,
    role: effectiveRole,
    page_permissions: effectivePermissions,
    is_owner: owner,
    effective_role: effectiveRole,
    effective_page_permissions: effectivePermissions,
  };
}

function isAdminUser(user, ownerPolicy) {
  const effective = toEffectiveUser(user, ownerPolicy);
  return !!effective && effective.effective_role === 'admin';
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

function resolveActorIdentity(request, env, opts = {}) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', email: cfAccessEmail, userId: '' };
  }

  if (env.USERS_TRUST_CLIENT_IDENTITY !== '1') return null;

  const url = opts.url || new URL(request.url);
  const body = opts.body && typeof opts.body === 'object' ? opts.body : {};
  const actorEmail = normalizeEmail(
    request.headers.get('x-user-email')
    || body.actor_email
    || url.searchParams.get('actor_email')
    || '',
  );
  const actorUserId = normalizeUserId(
    request.headers.get('x-user-id')
    || body.actor_user_id
    || url.searchParams.get('actor_user_id')
    || '',
  );

  if (!actorEmail && !actorUserId) return null;
  return { source: 'trusted-client', email: actorEmail, userId: actorUserId };
}

function buildIdentityLookupPath(identity) {
  if (identity.email && identity.userId) {
    return '/rest/v1/app_users?or=(email.eq.' + encodeURIComponent(identity.email) + ',user_id.eq.' + encodeURIComponent(identity.userId) + ')&select=' + USER_FIELDS + '&limit=1';
  }
  if (identity.email) {
    return '/rest/v1/app_users?email=eq.' + encodeURIComponent(identity.email) + '&select=' + USER_FIELDS + '&limit=1';
  }
  if (identity.userId) {
    return '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(identity.userId) + '&select=' + USER_FIELDS + '&limit=1';
  }
  return '';
}

async function fetchActorUser(env, identity, ownerPolicy) {
  const lookupPath = buildIdentityLookupPath(identity);
  if (!lookupPath) return null;
  const lookup = await supabaseJson(env, lookupPath);
  if (!lookup.ok) return null;
  const row = Array.isArray(lookup.data) ? normalizeUserRow(lookup.data[0]) : null;
  return await enforceOwnerInvariant(env, row, ownerPolicy);
}

async function enforceOwnerInvariant(env, user, ownerPolicy) {
  const normalized = normalizeUserRow(user);
  if (!normalized) return null;
  if (!isOwnerUser(normalized, ownerPolicy)) return toEffectiveUser(normalized, ownerPolicy);

  const needsRepair = normalized.role !== 'admin' || !hasFullPermissions(normalized.page_permissions);
  if (!needsRepair) return toEffectiveUser(normalized, ownerPolicy);

  const patch = await supabaseJson(
    env,
    '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(normalized.user_id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        role: 'admin',
        page_permissions: ALL_PAGE_PERMISSIONS,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (patch.ok) {
    const repairedRows = Array.isArray(patch.data) ? patch.data : [];
    const repaired = normalizeUserRow(repairedRows[0]);
    if (repaired) return toEffectiveUser(repaired, ownerPolicy);
  }

  return toEffectiveUser({
    ...normalized,
    role: 'admin',
    page_permissions: [...ALL_PAGE_PERMISSIONS],
  }, ownerPolicy);
}

function buildTargetLookupPath(userId, email) {
  const hasUserId = !!userId;
  const hasEmail = !!email;
  if (!hasUserId && !hasEmail) return '';
  if (hasUserId && hasEmail) {
    return '/rest/v1/app_users?or=(user_id.eq.' + encodeURIComponent(userId) + ',email.eq.' + encodeURIComponent(email) + ')&select=' + USER_FIELDS + '&limit=1';
  }
  if (hasUserId) {
    return '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(userId) + '&select=' + USER_FIELDS + '&limit=1';
  }
  return '/rest/v1/app_users?email=eq.' + encodeURIComponent(email) + '&select=' + USER_FIELDS + '&limit=1';
}

function parseBodyRole(value) {
  if (value === undefined) return null;
  if (value !== 'admin' && value !== 'user') return undefined;
  return value;
}

function parseBodyPermissions(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return undefined;
  const normalized = uniquePermissions(value);
  if (normalized.length !== value.length) return undefined;
  return normalized;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const ownerPolicy = parseOwnerPolicy(env);

  const url = new URL(request.url);
  const requestedUserId = normalizeUserId(url.searchParams.get('user_id') || '');
  const requestedEmail = normalizeEmail(url.searchParams.get('email') || '');

  const actorIdentity = resolveActorIdentity(request, env, { url });
  if (!actorIdentity) return errorResponse('Unauthorized request. Missing verified actor identity.', 401);

  const actor = await fetchActorUser(env, actorIdentity, ownerPolicy);
  const actorAdmin = isAdminUser(actor, ownerPolicy) || isOwnerIdentity(actorIdentity, ownerPolicy);

  if (!requestedUserId && !requestedEmail) {
    if (!actorAdmin) return errorResponse('Forbidden. Admin access required.', 403);
    const list = await supabaseJson(env, '/rest/v1/app_users?order=created_at.asc&select=' + USER_FIELDS);
    if (!list.ok) return errorResponse('Fetch failed: ' + list.text, list.status);
    const rows = Array.isArray(list.data) ? list.data : [];
    const users = [];
    for (const row of rows) {
      const effective = await enforceOwnerInvariant(env, row, ownerPolicy);
      if (effective) users.push(effective);
    }
    return jsonResponse(users);
  }

  let lookupPath = '';
  if (actorAdmin) {
    lookupPath = buildTargetLookupPath(requestedUserId, requestedEmail);
  } else {
    if (actorIdentity.email && requestedEmail && requestedEmail !== actorIdentity.email) {
      return errorResponse('Forbidden. You can only read your own user profile.', 403);
    }

    const selfUserId = actor?.user_id
      || actorIdentity.userId
      || (actorIdentity.email ? '' : requestedUserId);
    const selfEmail = actor?.email || actorIdentity.email || requestedEmail;
    lookupPath = buildTargetLookupPath(selfUserId, selfEmail);
  }

  if (!lookupPath) return errorResponse('user_id or email required', 400);
  const lookup = await supabaseJson(env, lookupPath);
  if (!lookup.ok) return errorResponse('Fetch failed: ' + lookup.text, lookup.status);

  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  const effective = await enforceOwnerInvariant(env, rows[0], ownerPolicy);
  return jsonResponse(effective || null);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const ownerPolicy = parseOwnerPolicy(env);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  const userId = normalizeUserId(body.user_id);
  const email = normalizeEmail(body.email);
  const name = typeof body.name === 'string' ? body.name : '';
  if (!userId || !email) return errorResponse('user_id and email required', 400);

  const actorIdentity = resolveActorIdentity(request, env, { body });
  if (!actorIdentity) return errorResponse('Unauthorized request. Missing verified actor identity.', 401);
  const actor = await fetchActorUser(env, actorIdentity, ownerPolicy);
  const actorAdmin = isAdminUser(actor, ownerPolicy) || isOwnerIdentity(actorIdentity, ownerPolicy);
  const selfRequest = (
    (actorIdentity.email && email === actorIdentity.email)
    || (actorIdentity.userId && userId === actorIdentity.userId)
  );

  if (!actorAdmin && !selfRequest) {
    return errorResponse('Forbidden. Self-upsert or admin access required.', 403);
  }

  const existing = await supabaseJson(
    env,
    '/rest/v1/app_users?or=(user_id.eq.' + encodeURIComponent(userId) + ',email.eq.' + encodeURIComponent(email) + ')&select=' + USER_FIELDS,
  );
  if (!existing.ok) return errorResponse('Lookup failed: ' + existing.text, existing.status);
  const existingRows = Array.isArray(existing.data) ? existing.data : [];

  if (existingRows.length > 0) {
    const row = normalizeUserRow(existingRows[0]);
    const update = await supabaseJson(
      env,
      '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(row.user_id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: userId,
          email,
          name: name || row.name,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!update.ok) return errorResponse('Update failed: ' + update.text, update.status);
    const updatedRows = Array.isArray(update.data) ? update.data : [];
    const effective = await enforceOwnerInvariant(env, updatedRows[0], ownerPolicy);
    return jsonResponse(effective || null);
  }

  const isOwner = ownerPolicy.ownerEmails.has(email) || ownerPolicy.ownerUserIds.has(userId);
  const insert = await supabaseJson(
    env,
    '/rest/v1/app_users',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        email,
        name,
        role: isOwner ? 'admin' : 'user',
        page_permissions: isOwner ? ALL_PAGE_PERMISSIONS : [],
      }),
    },
  );
  if (!insert.ok) return errorResponse('Insert failed: ' + insert.text, insert.status);
  const insertedRows = Array.isArray(insert.data) ? insert.data : [];
  const effective = await enforceOwnerInvariant(env, insertedRows[0], ownerPolicy);
  return jsonResponse(effective || null, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;
  const ownerPolicy = parseOwnerPolicy(env);

  let body;
  try { body = await request.json(); } catch (_) { return errorResponse('Invalid JSON', 400); }

  const actorIdentity = resolveActorIdentity(request, env, { body });
  if (!actorIdentity) return errorResponse('Unauthorized request. Missing verified actor identity.', 401);
  const actor = await fetchActorUser(env, actorIdentity, ownerPolicy);
  const actorAdmin = isAdminUser(actor, ownerPolicy) || isOwnerIdentity(actorIdentity, ownerPolicy);
  if (!actorAdmin) return errorResponse('Forbidden. Admin access required.', 403);

  const userId = normalizeUserId(body.user_id);
  if (!userId) return errorResponse('user_id required', 400);

  const role = parseBodyRole(body.role);
  if (role === undefined) return errorResponse('invalid role', 400);
  const permissions = parseBodyPermissions(body.page_permissions);
  if (permissions === undefined) return errorResponse('page_permissions must be an array of valid module IDs', 400);

  const targetLookup = await supabaseJson(
    env,
    '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(userId) + '&select=' + USER_FIELDS + '&limit=1',
  );
  if (!targetLookup.ok) return errorResponse('Lookup failed: ' + targetLookup.text, targetLookup.status);
  const targetRows = Array.isArray(targetLookup.data) ? targetLookup.data : [];
  const targetUser = normalizeUserRow(targetRows[0]);
  if (!targetUser) return errorResponse('User not found', 404);

  const targetIsOwner = isOwnerUser(targetUser, ownerPolicy);
  if (targetIsOwner) {
    if (role && role !== 'admin') {
      return errorResponse('Forbidden. Owner role cannot be changed.', 403);
    }
    if (permissions && !hasFullPermissions(permissions)) {
      return errorResponse('Forbidden. Owner must retain full module permissions.', 403);
    }
  }

  if (role === 'user' && targetUser.role === 'admin' && !targetIsOwner) {
    const adminRowsLookup = await supabaseJson(
      env,
      '/rest/v1/app_users?role=eq.admin&select=' + USER_FIELDS,
    );
    if (!adminRowsLookup.ok) {
      return errorResponse('Failed to verify admin invariants: ' + adminRowsLookup.text, adminRowsLookup.status);
    }
    const adminRows = Array.isArray(adminRowsLookup.data) ? adminRowsLookup.data : [];
    let otherEffectiveAdmins = 0;
    for (const row of adminRows) {
      const normalized = normalizeUserRow(row);
      if (!normalized) continue;
      if (normalized.user_id === userId) continue;
      if (isAdminUser(normalized, ownerPolicy)) otherEffectiveAdmins += 1;
    }
    if (otherEffectiveAdmins === 0) {
      return errorResponse('Forbidden. Cannot demote the last effective admin user.', 403);
    }
  }

  const fields = {};
  if (role) fields.role = role;
  if (permissions) fields.page_permissions = permissions;
  if (Object.keys(fields).length === 0) return errorResponse('no updatable fields', 400);

  const update = await supabaseJson(
    env,
    '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(userId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(fields),
    },
  );
  if (!update.ok) return errorResponse('Update failed: ' + update.text, update.status);
  const updatedRows = Array.isArray(update.data) ? update.data : [];
  const effective = await enforceOwnerInvariant(env, updatedRows[0], ownerPolicy);
  return jsonResponse({ ok: true, user: effective || null });
}
