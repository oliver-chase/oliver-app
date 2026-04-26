// /api/users — app_users CRUD via Supabase service role.
//
// Authz:
// - Preferred: Cloudflare Access identity header:
//   cf-access-authenticated-user-email
// - Microsoft-asserted fallback (for environments where CF Access headers are unavailable):
//   requires actor_microsoft_tid plus actor_microsoft_oid or actor_microsoft_sub,
//   and actor identity via user id/email.
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

const VALID_PAGE_PERMISSIONS = new Set(['accounts', 'hr', 'sdr', 'crm', 'slides', 'reviews', 'campaigns']);
const ALL_PAGE_PERMISSIONS = ['accounts', 'hr', 'sdr', 'crm', 'slides', 'reviews', 'campaigns'];
const USER_FIELDS = 'user_id,email,name,role,page_permissions,created_at,updated_at';
const IDENTITY_FIELDS = 'identity_id,person_id,provider,tenant_id,subject_key,subject_key_type';
const DEFAULT_OWNER_EMAILS = ['kiana.micari@vtwo.co'];
let cachedAppUsersPersonIdSupport = null;

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

function normalizeTenantId(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeMicrosoftSubject(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizePersonId(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function parseMicrosoftIdentity(input) {
  const source = input && typeof input === 'object' ? input : {};
  const microsoftOid = normalizeMicrosoftSubject(source.microsoft_oid);
  const microsoftTid = normalizeTenantId(source.microsoft_tid);
  const microsoftSub = normalizeMicrosoftSubject(source.microsoft_sub);
  return { microsoftOid, microsoftTid, microsoftSub };
}

function parseActorMicrosoftIdentity(request, opts = {}) {
  const url = opts.url || new URL(request.url);
  const body = opts.body && typeof opts.body === 'object' ? opts.body : {};
  return {
    microsoftOid: normalizeMicrosoftSubject(
      request.headers.get('x-user-microsoft-oid')
      || body.actor_microsoft_oid
      || url.searchParams.get('actor_microsoft_oid')
      || '',
    ),
    microsoftTid: normalizeTenantId(
      request.headers.get('x-user-microsoft-tid')
      || body.actor_microsoft_tid
      || url.searchParams.get('actor_microsoft_tid')
      || '',
    ),
    microsoftSub: normalizeMicrosoftSubject(
      request.headers.get('x-user-microsoft-sub')
      || body.actor_microsoft_sub
      || url.searchParams.get('actor_microsoft_sub')
      || '',
    ),
  };
}

function hasMicrosoftIdentity(identity) {
  if (!identity) return false;
  if (!identity.microsoftTid) return false;
  return !!(identity.microsoftOid || identity.microsoftSub);
}

function microsoftSubjects(identity) {
  if (!identity) return [];
  const subjects = [];
  if (identity.microsoftOid) subjects.push(identity.microsoftOid);
  if (identity.microsoftSub && identity.microsoftSub !== identity.microsoftOid) subjects.push(identity.microsoftSub);
  return subjects;
}

function hasSharedMicrosoftSubject(left, right) {
  if (!left || !right) return false;
  if (!left.microsoftTid || !right.microsoftTid) return false;
  if (left.microsoftTid !== right.microsoftTid) return false;
  const rightSet = new Set(microsoftSubjects(right));
  for (const subject of microsoftSubjects(left)) {
    if (rightSet.has(subject)) return true;
  }
  return false;
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
    [...DEFAULT_OWNER_EMAILS, ...(env.OWNER_EMAILS || '').split(',')]
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
    person_id: normalizePersonId(row.person_id) || null,
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

function normalizedActorIdentityForAudit(identity, actor) {
  return {
    source: identity?.source || 'unknown',
    actor_user_id: normalizeUserId(actor?.user_id || identity?.userId || ''),
    actor_email: normalizeEmail(actor?.email || identity?.email || ''),
    actor_microsoft_oid: normalizeMicrosoftSubject(identity?.microsoftOid || ''),
    actor_microsoft_tid: normalizeTenantId(identity?.microsoftTid || ''),
    actor_microsoft_sub: normalizeMicrosoftSubject(identity?.microsoftSub || ''),
  };
}

function logPrivilegedWriteAudit(event, args = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...args,
  };
  try {
    console.info('[users-audit]', JSON.stringify(payload));
  } catch {
    // Do not block user-management writes if log serialization fails.
  }
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

async function appUsersSupportsPersonId(env) {
  if (cachedAppUsersPersonIdSupport !== null) return cachedAppUsersPersonIdSupport;
  const probe = await supabaseJson(env, '/rest/v1/app_users?select=person_id&limit=1');
  if (probe.ok) {
    cachedAppUsersPersonIdSupport = true;
    return true;
  }

  const message = (probe.text || '').toLowerCase();
  if (message.includes('person_id') && message.includes('does not exist')) {
    cachedAppUsersPersonIdSupport = false;
    return false;
  }

  // Unknown failure: avoid false negatives that would skip canonical linkage.
  cachedAppUsersPersonIdSupport = true;
  return true;
}

function buildMicrosoftIdentityCandidates(identity) {
  if (!identity || !identity.microsoftTid) return [];
  const out = [];
  if (identity.microsoftOid) out.push({ subjectKeyType: 'oid', subjectKey: identity.microsoftOid });
  if (identity.microsoftSub && identity.microsoftSub !== identity.microsoftOid) {
    out.push({ subjectKeyType: 'sub', subjectKey: identity.microsoftSub });
  }
  return out;
}

async function fetchIdentityRow(env, microsoftTid, subjectKey) {
  const lookup = await supabaseJson(
    env,
    '/rest/v1/person_identities?provider=eq.microsoft'
      + '&tenant_id=eq.' + encodeURIComponent(microsoftTid)
      + '&subject_key=eq.' + encodeURIComponent(subjectKey)
      + '&select=' + IDENTITY_FIELDS
      + '&limit=1',
  );
  if (!lookup.ok) {
    return {
      ok: false,
      status: lookup.status,
      error: 'Identity lookup failed: ' + lookup.text,
      row: null,
    };
  }
  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  return { ok: true, row: rows[0] || null };
}

async function fetchIdentitySlotForPerson(env, personId, microsoftTid, subjectKeyType) {
  const lookup = await supabaseJson(
    env,
    '/rest/v1/person_identities?person_id=eq.' + encodeURIComponent(personId)
      + '&provider=eq.microsoft'
      + '&tenant_id=eq.' + encodeURIComponent(microsoftTid)
      + '&subject_key_type=eq.' + encodeURIComponent(subjectKeyType)
      + '&select=' + IDENTITY_FIELDS
      + '&limit=1',
  );
  if (!lookup.ok) {
    return {
      ok: false,
      status: lookup.status,
      error: 'Identity slot lookup failed: ' + lookup.text,
      row: null,
    };
  }
  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  return { ok: true, row: rows[0] || null };
}

async function createPerson(env, name, email) {
  const insert = await supabaseJson(
    env,
    '/rest/v1/people',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        full_name: name || '',
        primary_email: email || '',
      }),
    },
  );
  if (!insert.ok) {
    return {
      ok: false,
      status: insert.status,
      error: 'Person create failed: ' + insert.text,
      personId: '',
    };
  }
  const rows = Array.isArray(insert.data) ? insert.data : [];
  const personId = normalizePersonId(rows[0]?.person_id);
  if (!personId) {
    return {
      ok: false,
      status: 500,
      error: 'Person create failed: missing person_id in response.',
      personId: '',
    };
  }
  return { ok: true, personId };
}

async function fetchPersonByEmail(env, email) {
  if (!email) return { ok: true, personId: '' };
  const lookup = await supabaseJson(
    env,
    '/rest/v1/people?primary_email=eq.' + encodeURIComponent(email)
      + '&select=person_id'
      + '&limit=1',
  );
  if (!lookup.ok) {
    return {
      ok: false,
      status: lookup.status,
      error: 'Person lookup failed: ' + lookup.text,
      personId: '',
    };
  }
  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  return {
    ok: true,
    personId: normalizePersonId(rows[0]?.person_id),
  };
}

async function ensurePersonByEmail(env, name, email) {
  const existing = await fetchPersonByEmail(env, email);
  if (!existing.ok) return existing;
  if (existing.personId) {
    await patchPersonProfile(env, existing.personId, name, email);
    return existing;
  }
  return createPerson(env, name, email);
}

async function patchPersonProfile(env, personId, name, email) {
  await supabaseJson(
    env,
    '/rest/v1/people?person_id=eq.' + encodeURIComponent(personId),
    {
      method: 'PATCH',
      body: JSON.stringify({
        full_name: name || '',
        primary_email: email || '',
      }),
    },
  );
}

async function syncMicrosoftIdentityCandidate(env, args) {
  const {
    personId,
    microsoftTid,
    candidate,
    email,
    identitySource,
    mappingDecision,
  } = args;

  const now = new Date().toISOString();
  const existing = await fetchIdentityRow(env, microsoftTid, candidate.subjectKey);
  if (!existing.ok) return existing;

  if (existing.row) {
    const rowPersonId = normalizePersonId(existing.row.person_id);
    if (rowPersonId && rowPersonId !== personId) {
      return {
        ok: false,
        status: 409,
        error: 'Identity conflict: Microsoft subject already linked to a different person record.',
      };
    }
    const patch = await supabaseJson(
      env,
      '/rest/v1/person_identities?identity_id=eq.' + encodeURIComponent(existing.row.identity_id),
      {
        method: 'PATCH',
        body: JSON.stringify({
          identity_source: identitySource,
          mapping_decision: mappingDecision,
          email_snapshot: email || '',
          metadata: {
            protocol: 'microsoft-oid-tid-v1',
            subject_key_type: candidate.subjectKeyType,
          },
          last_seen_at: now,
        }),
      },
    );
    if (!patch.ok) {
      return {
        ok: false,
        status: patch.status,
        error: 'Identity update failed: ' + patch.text,
      };
    }
    return { ok: true };
  }

  const slot = await fetchIdentitySlotForPerson(env, personId, microsoftTid, candidate.subjectKeyType);
  if (!slot.ok) return slot;
  if (slot.row && slot.row.subject_key !== candidate.subjectKey) {
    return {
      ok: false,
      status: 409,
      error: 'Identity conflict: this person already has a different Microsoft '
        + candidate.subjectKeyType + ' value in the same tenant.',
    };
  }

  const insert = await supabaseJson(
    env,
    '/rest/v1/person_identities',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        person_id: personId,
        provider: 'microsoft',
        tenant_id: microsoftTid,
        subject_key: candidate.subjectKey,
        subject_key_type: candidate.subjectKeyType,
        identity_source: identitySource,
        mapping_decision: mappingDecision,
        email_snapshot: email || '',
        metadata: {
          protocol: 'microsoft-oid-tid-v1',
          subject_key_type: candidate.subjectKeyType,
        },
        last_seen_at: now,
      }),
    },
  );
  if (!insert.ok) {
    return {
      ok: false,
      status: insert.status,
      error: 'Identity insert failed: ' + insert.text,
    };
  }
  return { ok: true };
}

async function resolvePersonFromMicrosoftIdentity(env, microsoftIdentity, email) {
  if (!hasMicrosoftIdentity(microsoftIdentity)) {
    return { ok: true, personId: '', matchSource: 'no-microsoft-claims' };
  }

  const candidates = buildMicrosoftIdentityCandidates(microsoftIdentity);
  const matchedRows = [];
  for (const candidate of candidates) {
    const lookup = await fetchIdentityRow(env, microsoftIdentity.microsoftTid, candidate.subjectKey);
    if (!lookup.ok) return lookup;
    if (lookup.row) matchedRows.push({ candidate, row: lookup.row });
  }

  const personIds = [...new Set(
    matchedRows
      .map(item => normalizePersonId(item.row.person_id))
      .filter(Boolean),
  )];

  if (personIds.length > 1) {
    return {
      ok: false,
      status: 409,
      error: 'Identity conflict: Microsoft oid/sub claims resolve to different person records.',
    };
  }

  if (personIds.length === 0) {
    const byEmail = await fetchPersonByEmail(env, email);
    if (!byEmail.ok) return byEmail;
    if (byEmail.personId) return { ok: true, personId: byEmail.personId, matchSource: 'matched-email' };
    return { ok: true, personId: '', matchSource: 'new-person-required' };
  }

  const matchedBy = matchedRows.find(item => normalizePersonId(item.row.person_id) === personIds[0]);
  return {
    ok: true,
    personId: personIds[0],
    matchSource: matchedBy?.candidate?.subjectKeyType === 'sub' ? 'matched-sub' : 'matched-oid',
  };
}

async function syncMicrosoftIdentitySlice(env, args) {
  const { email, name, microsoftIdentity, identitySource } = args;
  if ((microsoftIdentity.microsoftOid || microsoftIdentity.microsoftSub) && !microsoftIdentity.microsoftTid) {
    return {
      ok: false,
      status: 400,
      error: 'microsoft_tid is required when microsoft_oid or microsoft_sub is provided.',
      personId: '',
      mappingDecision: 'invalid-request',
    };
  }

  if (!hasMicrosoftIdentity(microsoftIdentity)) {
    const ensuredPerson = await ensurePersonByEmail(env, name, email);
    if (!ensuredPerson.ok) {
      return {
        ok: false,
        status: ensuredPerson.status || 500,
        error: ensuredPerson.error || 'Person ensure failed.',
        personId: '',
        mappingDecision: 'person-ensure-failed',
      };
    }
    return {
      ok: true,
      personId: ensuredPerson.personId || '',
      mappingDecision: 'email-only-fallback',
    };
  }

  const resolved = await resolvePersonFromMicrosoftIdentity(env, microsoftIdentity, email);
  if (!resolved.ok) {
    return {
      ok: false,
      status: resolved.status || 409,
      error: resolved.error || 'Identity resolution failed.',
      personId: '',
      mappingDecision: 'identity-conflict',
    };
  }

  let personId = resolved.personId;
  if (!personId) {
    const createResult = await createPerson(env, name, email);
    if (!createResult.ok) {
      return {
        ok: false,
        status: createResult.status || 500,
        error: createResult.error || 'Person create failed.',
        personId: '',
        mappingDecision: 'create-person-failed',
      };
    }
    personId = createResult.personId;
  } else {
    await patchPersonProfile(env, personId, name, email);
  }

  const mappingDecision = resolved.matchSource === 'new-person-required'
    ? 'created-person'
    : resolved.matchSource;
  const candidates = buildMicrosoftIdentityCandidates(microsoftIdentity);
  for (const candidate of candidates) {
    const syncResult = await syncMicrosoftIdentityCandidate(env, {
      personId,
      microsoftTid: microsoftIdentity.microsoftTid,
      candidate,
      email,
      identitySource,
      mappingDecision,
    });
    if (!syncResult.ok) {
      return {
        ok: false,
        status: syncResult.status || 409,
        error: syncResult.error || 'Identity sync failed.',
        personId,
        mappingDecision: 'identity-sync-failed',
      };
    }
  }

  return {
    ok: true,
    personId,
    mappingDecision,
  };
}

async function fetchUserByMicrosoftIdentity(env, identity, ownerPolicy) {
  if (!hasMicrosoftIdentity(identity)) return null;
  const canReadPersonId = await appUsersSupportsPersonId(env);
  const candidates = buildMicrosoftIdentityCandidates(identity);
  for (const candidate of candidates) {
    const identityLookup = await fetchIdentityRow(env, identity.microsoftTid, candidate.subjectKey);
    if (!identityLookup.ok) continue;
    if (!identityLookup.row) continue;
    const personId = normalizePersonId(identityLookup.row.person_id);
    if (!personId) continue;

    if (canReadPersonId) {
      const lookup = await supabaseJson(
        env,
        '/rest/v1/app_users?person_id=eq.' + encodeURIComponent(personId)
        + '&select=' + USER_FIELDS
        + '&limit=1',
      );
      if (lookup.ok) {
        const rows = Array.isArray(lookup.data) ? lookup.data : [];
        const row = normalizeUserRow(rows[0]);
        const effective = await enforceOwnerInvariant(env, row, ownerPolicy);
        if (effective) return effective;
      }
    }

    // Legacy fallback before app_users.person_id rollout is complete.
    const legacyLookup = await supabaseJson(
      env,
      '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(candidate.subjectKey)
      + '&select=' + USER_FIELDS
      + '&limit=1',
    );
    if (!legacyLookup.ok) continue;
    const legacyRows = Array.isArray(legacyLookup.data) ? legacyLookup.data : [];
    const legacyRow = normalizeUserRow(legacyRows[0]);
    const legacyEffective = await enforceOwnerInvariant(env, legacyRow, ownerPolicy);
    if (legacyEffective) return legacyEffective;
  }
  return null;
}

function resolveActorIdentity(request, env, opts = {}) {
  const actorMicrosoft = parseActorMicrosoftIdentity(request, opts);
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return {
      source: 'cf-access',
      email: cfAccessEmail,
      userId: '',
      microsoftOid: actorMicrosoft.microsoftOid,
      microsoftTid: actorMicrosoft.microsoftTid,
      microsoftSub: actorMicrosoft.microsoftSub,
    };
  }

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

  // This path is stricter than the plain trusted-client fallback:
  // require Microsoft subject claim (oid/sub) plus actor identity fields.
  // tenant_id is preferred but not guaranteed in every MSAL account shape.
  if ((actorMicrosoft.microsoftOid || actorMicrosoft.microsoftSub) && (actorEmail || actorUserId)) {
    return {
      source: 'microsoft-asserted-client',
      email: actorEmail,
      userId: actorUserId,
      microsoftOid: actorMicrosoft.microsoftOid,
      microsoftTid: actorMicrosoft.microsoftTid,
      microsoftSub: actorMicrosoft.microsoftSub,
    };
  }

  if (env.USERS_TRUST_CLIENT_IDENTITY !== '1') return null;

  if (!actorEmail && !actorUserId && !hasMicrosoftIdentity(actorMicrosoft)) return null;
  return {
    source: 'trusted-client',
    email: actorEmail,
    userId: actorUserId,
    microsoftOid: actorMicrosoft.microsoftOid,
    microsoftTid: actorMicrosoft.microsoftTid,
    microsoftSub: actorMicrosoft.microsoftSub,
  };
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
  const identityUser = await fetchUserByMicrosoftIdentity(env, identity, ownerPolicy);
  if (identityUser) return identityUser;
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
  const requestedMicrosoftIdentity = parseMicrosoftIdentity({
    microsoft_oid: url.searchParams.get('microsoft_oid') || '',
    microsoft_tid: url.searchParams.get('microsoft_tid') || '',
    microsoft_sub: url.searchParams.get('microsoft_sub') || '',
  });

  const actorIdentity = resolveActorIdentity(request, env, { url });
  if (!actorIdentity) return errorResponse('Unauthorized request. Missing verified actor identity.', 401);

  const actor = await fetchActorUser(env, actorIdentity, ownerPolicy);
  const actorAdmin = isAdminUser(actor, ownerPolicy) || isOwnerIdentity(actorIdentity, ownerPolicy);

  if (!requestedUserId && !requestedEmail && !hasMicrosoftIdentity(requestedMicrosoftIdentity)) {
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
    if (hasMicrosoftIdentity(requestedMicrosoftIdentity)) {
      const identityUser = await fetchUserByMicrosoftIdentity(env, requestedMicrosoftIdentity, ownerPolicy);
      if (identityUser) return jsonResponse(identityUser);
    }
    lookupPath = buildTargetLookupPath(requestedUserId, requestedEmail);
  } else {
    if (actorIdentity.email && requestedEmail && requestedEmail !== actorIdentity.email) {
      return errorResponse('Forbidden. You can only read your own user profile.', 403);
    }
    if (hasMicrosoftIdentity(requestedMicrosoftIdentity) && !hasSharedMicrosoftSubject(actorIdentity, requestedMicrosoftIdentity)) {
      return errorResponse('Forbidden. You can only read your own Microsoft identity profile.', 403);
    }
    if (hasMicrosoftIdentity(requestedMicrosoftIdentity)) {
      const identityUser = await fetchUserByMicrosoftIdentity(env, requestedMicrosoftIdentity, ownerPolicy);
      if (identityUser) return jsonResponse(identityUser);
    }

    const selfUserId = actor?.user_id
      || actorIdentity.userId
      || (actorIdentity.email ? '' : requestedUserId);
    const selfEmail = actor?.email || actorIdentity.email || requestedEmail;
    lookupPath = buildTargetLookupPath(selfUserId, selfEmail);
  }

  if (!lookupPath) {
    if (hasMicrosoftIdentity(requestedMicrosoftIdentity)) return jsonResponse(null);
    return errorResponse('user_id or email required', 400);
  }
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
  const microsoftIdentity = parseMicrosoftIdentity(body);
  if (!userId || !email) return errorResponse('user_id and email required', 400);

  const actorIdentity = resolveActorIdentity(request, env, { body });
  if (!actorIdentity) return errorResponse('Unauthorized request. Missing verified actor identity.', 401);
  const actor = await fetchActorUser(env, actorIdentity, ownerPolicy);
  const actorAdmin = isAdminUser(actor, ownerPolicy) || isOwnerIdentity(actorIdentity, ownerPolicy);
  const selfRequest = (
    (actorIdentity.email && email === actorIdentity.email)
    || (actorIdentity.userId && userId === actorIdentity.userId)
    || hasSharedMicrosoftSubject(actorIdentity, microsoftIdentity)
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
  if (existingRows.length > 1) {
    return errorResponse(
      'Identity conflict: user_id and email point to different app_users rows. Resolve in Admin before retrying.',
      409,
    );
  }

  const identitySync = await syncMicrosoftIdentitySlice(env, {
    userId,
    email,
    name,
    microsoftIdentity,
    identitySource: actorIdentity.source === 'cf-access' ? 'cf-access' : 'msal-id-token',
  });
  if (!identitySync.ok) {
    return errorResponse(identitySync.error || 'Identity sync failed.', identitySync.status || 409);
  }
  if (!identitySync.personId) {
    return errorResponse('Identity sync failed: missing canonical person_id.', 500);
  }
  const canWritePersonId = await appUsersSupportsPersonId(env);

  if (existingRows.length > 0) {
    const row = normalizeUserRow(existingRows[0]);
    if (!row) return errorResponse('Lookup failed: invalid app_users row.', 500);
    if (!actorAdmin && row.email === email && row.user_id !== userId) {
      return errorResponse(
        'Identity conflict: this email is already linked to a different user_id. Admin reconciliation required.',
        409,
      );
    }

    const updatePayload = {
      user_id: userId,
      email,
      name: name || row.name,
      updated_at: new Date().toISOString(),
    };
    if (canWritePersonId) updatePayload.person_id = identitySync.personId || row.person_id || null;

    const update = await supabaseJson(
      env,
      '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(row.user_id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(updatePayload),
      },
    );
    if (!update.ok) return errorResponse('Update failed: ' + update.text, update.status);
    const updatedRows = Array.isArray(update.data) ? update.data : [];
    const effective = await enforceOwnerInvariant(env, updatedRows[0], ownerPolicy);
    if (actorAdmin) {
      logPrivilegedWriteAudit('app_users.upsert.update', {
        actor: normalizedActorIdentityForAudit(actorIdentity, actor),
        target_user_id: normalizeUserId(effective?.user_id || userId),
        target_email: normalizeEmail(effective?.email || email),
        identity_mapping_decision: identitySync.mappingDecision,
      });
    }
    return jsonResponse(
      effective
        ? { ...effective, identity_mapping_decision: identitySync.mappingDecision }
        : null,
    );
  }

  const isOwner = ownerPolicy.ownerEmails.has(email) || ownerPolicy.ownerUserIds.has(userId);
  const insertPayload = {
    user_id: userId,
    email,
    name,
    role: isOwner ? 'admin' : 'user',
    page_permissions: isOwner ? ALL_PAGE_PERMISSIONS : [],
  };
  if (canWritePersonId) insertPayload.person_id = identitySync.personId;

  const insert = await supabaseJson(
    env,
    '/rest/v1/app_users',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(insertPayload),
    },
  );
  if (!insert.ok) return errorResponse('Insert failed: ' + insert.text, insert.status);
  const insertedRows = Array.isArray(insert.data) ? insert.data : [];
  const effective = await enforceOwnerInvariant(env, insertedRows[0], ownerPolicy);
  if (actorAdmin) {
    logPrivilegedWriteAudit('app_users.upsert.insert', {
      actor: normalizedActorIdentityForAudit(actorIdentity, actor),
      target_user_id: normalizeUserId(effective?.user_id || userId),
      target_email: normalizeEmail(effective?.email || email),
      identity_mapping_decision: identitySync.mappingDecision,
    });
  }
  return jsonResponse(
    effective
      ? { ...effective, identity_mapping_decision: identitySync.mappingDecision }
      : null,
    201,
  );
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
  logPrivilegedWriteAudit('app_users.patch', {
    actor: normalizedActorIdentityForAudit(actorIdentity, actor),
    target_user_id: normalizeUserId(effective?.user_id || userId),
    target_email: normalizeEmail(effective?.email || ''),
    changed_fields: Object.keys(fields),
    role_after: effective?.role || null,
    permission_count_after: Array.isArray(effective?.page_permissions) ? effective.page_permissions.length : null,
  });
  return jsonResponse({ ok: true, user: effective || null });
}
