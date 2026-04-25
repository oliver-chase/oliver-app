// /api/slides — slide persistence, template library, and audit operations.
//
// GET /api/slides?resource=slides|templates|audits|audit-presets|template-collaborators|template-approvals&search=&limit=&offset=
// POST /api/slides { action, actor, ...payload }

import { jsonResponse, errorResponse } from './_shared/ai.js';

const MAX_COMPONENTS_PER_SLIDE = 400;
const MAX_TITLE_LENGTH = 160;
const MAX_TEMPLATE_DESCRIPTION_LENGTH = 400;
const TEMPLATE_COLLABORATOR_ROLES = ['editor', 'reviewer', 'viewer'];
const TEMPLATE_APPROVAL_TYPES = ['transfer-template', 'upsert-collaborator', 'remove-collaborator'];
const TEMPLATE_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];
const AUDIT_PRESET_SCOPES = ['personal', 'shared'];
const AUDIT_ACTIONS = [
  'save',
  'autosave',
  'delete',
  'duplicate',
  'rename',
  'publish-template',
  'transfer-template',
  'upsert-collaborator',
  'remove-collaborator',
  'submit-approval',
  'approve-approval',
  'reject-approval',
  'export-html',
  'export-pdf',
];
const AUDIT_OUTCOMES = ['success', 'failure'];
const AUDIT_ENTITY_TYPES = ['slide', 'template'];

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
    return errorResponse('Supabase URL not configured for /api/slides. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/slides. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
  }
  return null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeActorBody(raw) {
  const actor = raw && typeof raw === 'object' ? raw : {};
  return {
    user_id: typeof actor.user_id === 'string' ? actor.user_id.trim() : '',
    user_email: normalizeEmail(actor.user_email || ''),
  };
}

function shouldTrustClientIdentity(env) {
  if (env.SLIDES_TRUST_CLIENT_IDENTITY === '1') return true;
  if (env.SLIDES_TRUST_CLIENT_IDENTITY === '0') return false;
  return env.USERS_TRUST_CLIENT_IDENTITY === '1';
}

function resolveActorIdentity(request, body, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', userId: '', email: cfAccessEmail };
  }

  const trustClientIdentity = shouldTrustClientIdentity(env);
  if (!trustClientIdentity) return null;

  const bodyActor = normalizeActorBody(body?.actor || body || {});
  const userId = bodyActor.user_id
    || (typeof body?.user_id === 'string' ? body.user_id.trim() : '')
    || (typeof body?.actor_user_id === 'string' ? body.actor_user_id.trim() : '')
    || (request.headers.get('x-user-id') || '').trim();
  const userEmail = bodyActor.user_email
    || normalizeEmail(body?.user_email || '')
    || normalizeEmail(body?.actor_email || '')
    || normalizeEmail(request.headers.get('x-user-email') || '');

  if (!userId && !userEmail) return null;
  return { source: 'client', userId, email: userEmail };
}

function resolveActorIdentityFromQuery(request, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', userId: '', email: cfAccessEmail };
  }

  const trustClientIdentity = shouldTrustClientIdentity(env);
  if (!trustClientIdentity) return null;

  const url = new URL(request.url);
  const userId = (
    request.headers.get('x-user-id')
    || url.searchParams.get('user_id')
    || url.searchParams.get('actor_user_id')
    || ''
  ).trim();
  const userEmail = normalizeEmail(
    request.headers.get('x-user-email')
    || url.searchParams.get('user_email')
    || url.searchParams.get('actor_email')
    || '',
  );

  if (!userId && !userEmail) return null;
  return { source: 'client', userId, email: userEmail };
}

async function fetchActorAppUser(env, identity) {
  const supabaseUrl = resolveSupabaseUrl(env);
  let path = '';

  if (identity.email) {
    path = '/rest/v1/app_users?email=eq.' + encodeURIComponent(identity.email) + '&select=user_id,email,role,page_permissions&limit=1';
  } else if (identity.userId) {
    path = '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(identity.userId) + '&select=user_id,email,role,page_permissions&limit=1';
  } else {
    return { ok: false, status: 401, error: 'Missing actor identity for slide operation.' };
  }

  const response = await fetch(supabaseUrl + path, { headers: serviceHeaders(env) });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, status: response.status, error: 'Actor lookup failed: ' + text };
  }

  const rows = await response.json().catch(() => []);
  return { ok: true, row: rows[0] || null };
}

async function readAppUserByIdentifier(env, userId, email) {
  const trimmedUserId = typeof userId === 'string' ? userId.trim() : '';
  const normalizedEmail = normalizeEmail(email || '');
  if (!trimmedUserId && !normalizedEmail) return null;

  const lookup = await fetchActorAppUser(env, {
    userId: trimmedUserId,
    email: normalizedEmail,
  });
  if (!lookup.ok) throw new Error(lookup.error || 'Target user lookup failed');
  return lookup.row || null;
}

function isAuthorizedSlidesActor(appUser) {
  if (!appUser) return false;
  if (appUser.role === 'admin') return true;
  if (!Array.isArray(appUser.page_permissions)) return false;
  return appUser.page_permissions.includes('slides');
}

async function authorizeActor(request, body, env) {
  const identity = resolveActorIdentity(request, body, env);
  if (!identity) return { ok: false, status: 401, error: 'Unauthorized slide write request. Missing verified actor identity.' };

  const actorLookup = await fetchActorAppUser(env, identity);
  if (!actorLookup.ok) return actorLookup;

  if (!isAuthorizedSlidesActor(actorLookup.row)) {
    return { ok: false, status: 403, error: 'Forbidden. Slides permission required.' };
  }

  return { ok: true, actor: actorLookup.row };
}

async function authorizeActorForRead(request, env) {
  const identity = resolveActorIdentityFromQuery(request, env);
  if (!identity) return { ok: false, status: 401, error: 'Unauthorized slide read request. Missing verified actor identity.' };

  const actorLookup = await fetchActorAppUser(env, identity);
  if (!actorLookup.ok) return actorLookup;

  if (!isAuthorizedSlidesActor(actorLookup.row)) {
    return { ok: false, status: 403, error: 'Forbidden. Slides permission required.' };
  }

  return { ok: true, actor: actorLookup.row };
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeCanvas(rawCanvas) {
  if (!isObject(rawCanvas)) return null;
  const width = Number(rawCanvas.width);
  const height = Number(rawCanvas.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function sanitizeComponents(rawComponents) {
  if (!Array.isArray(rawComponents)) return null;
  if (rawComponents.length > MAX_COMPONENTS_PER_SLIDE) return null;
  return rawComponents;
}

function sanitizeTitle(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_TITLE_LENGTH) return null;
  return trimmed;
}

function sanitizeTemplateDescription(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEMPLATE_DESCRIPTION_LENGTH) return null;
  return trimmed || fallback;
}

function sanitizeCollaboratorRole(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!TEMPLATE_COLLABORATOR_ROLES.includes(trimmed)) return null;
  return trimmed;
}

function sanitizeApprovalType(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!TEMPLATE_APPROVAL_TYPES.includes(trimmed)) return null;
  return trimmed;
}

function sanitizeApprovalStatus(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!TEMPLATE_APPROVAL_STATUSES.includes(trimmed)) return null;
  return trimmed;
}

function sanitizeAuditPresetScope(value, fallback = 'personal') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  if (!AUDIT_PRESET_SCOPES.includes(trimmed)) return fallback;
  return trimmed;
}

function sanitizeAuditPresetName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) return null;
  return trimmed;
}

function normalizeMetadata(rawMetadata) {
  if (!isObject(rawMetadata)) return {};
  return rawMetadata;
}

function normalizeSlideRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    title: row.title,
    canvas: row.canvas || { width: 1920, height: 1080 },
    components: Array.isArray(row.components_json) ? row.components_json : [],
    metadata: row.metadata || {},
    revision: row.revision || 1,
    source: row.source || 'manual',
    source_template_id: row.source_template_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_edited_at: row.last_edited_at,
  };
}

function normalizeTemplateRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    owner_user_id: row.owner_user_id || null,
    name: row.name,
    description: row.description || '',
    is_shared: !!row.is_shared,
    canvas: row.canvas || { width: 1920, height: 1080 },
    components: Array.isArray(row.components_json) ? row.components_json : [],
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeTemplateCollaboratorRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    template_id: row.template_id,
    user_id: row.user_id,
    user_email: row.user_email || null,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeTemplateApprovalRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    template_id: row.template_id,
    requested_by_user_id: row.requested_by_user_id,
    requested_by_email: row.requested_by_email || null,
    approval_type: row.approval_type,
    payload: row.payload || {},
    status: row.status,
    review_note: row.review_note || null,
    reviewed_by_user_id: row.reviewed_by_user_id || null,
    reviewed_at: row.reviewed_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeAuditPresetRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    name: row.name,
    scope: sanitizeAuditPresetScope(row.scope || 'personal'),
    search: typeof row.search === 'string' ? row.search : '',
    action: typeof row.action_filter === 'string' ? row.action_filter : 'all',
    outcome: typeof row.outcome_filter === 'string' ? row.outcome_filter : 'all',
    entity_type: typeof row.entity_type_filter === 'string' ? row.entity_type_filter : 'all',
    date_from: typeof row.date_from === 'string' ? row.date_from : '',
    date_to: typeof row.date_to === 'string' ? row.date_to : '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function supabaseFetch(env, path, init = {}) {
  const supabaseUrl = resolveSupabaseUrl(env);
  const response = await fetch(supabaseUrl + path, {
    ...init,
    headers: {
      ...serviceHeaders(env),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${init.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }

  return response;
}

async function readSlideById(env, slideId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slides?id=eq.' + encodeURIComponent(slideId) + '&select=*&limit=1',
  );
  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

async function readTemplateById(env, templateId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_templates?id=eq.' + encodeURIComponent(templateId) + '&is_archived=eq.false&select=*&limit=1',
  );
  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

async function readTemplateCollaborators(env, templateId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?template_id=eq.' + encodeURIComponent(templateId) + '&select=template_id,user_id,role,created_at,updated_at',
  );
  const rows = await response.json().catch(() => []);
  return rows.map(normalizeTemplateCollaboratorRow).filter(Boolean);
}

async function readActorTemplateRole(env, templateId, actorUserId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?template_id=eq.' +
      encodeURIComponent(templateId) +
      '&user_id=eq.' +
      encodeURIComponent(actorUserId) +
      '&select=role&limit=1',
  );
  const rows = await response.json().catch(() => []);
  const row = rows[0] || null;
  return row?.role || null;
}

async function readTemplateIdsByCollaborator(env, actorUserId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?user_id=eq.' + encodeURIComponent(actorUserId) + '&select=template_id',
  );
  const rows = await response.json().catch(() => []);
  return Array.from(new Set(rows.map((row) => row?.template_id).filter((value) => typeof value === 'string' && value)));
}

async function readAppUsersByIds(env, userIds) {
  const unique = Array.from(new Set(userIds.filter((value) => typeof value === 'string' && value.trim())));
  if (unique.length === 0) return new Map();
  const map = new Map();
  const rows = await Promise.all(unique.map(async (userId) => readAppUserByIdentifier(env, userId, '')));
  for (const row of rows) {
    if (row && typeof row.user_id === 'string' && !map.has(row.user_id)) {
      map.set(row.user_id, row.email || null);
    }
  }
  return map;
}

async function readTemplateApprovalById(env, approvalId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_template_approvals?id=eq.' + encodeURIComponent(approvalId) + '&select=*&limit=1',
  );
  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

async function readAuditPresetById(env, presetId) {
  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_audit_filter_presets?id=eq.' + encodeURIComponent(presetId) + '&is_archived=eq.false&select=*&limit=1',
  );
  const rows = await response.json().catch(() => []);
  return rows[0] || null;
}

async function isTemplateGovernanceManager(env, actor, template) {
  if (actor.role === 'admin') return true;
  if (!template) return false;
  return template.owner_user_id === actor.user_id;
}

async function insertAudit(env, payload) {
  try {
    await supabaseFetch(env, '/rest/v1/slide_audit_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // Do not block product flows if audit logging write fails.
  }
}

async function isTemplateVisibleToActor(env, template, actor) {
  if (!template) return false;
  if (actor.role === 'admin') return true;
  if (template.is_shared) return true;
  if (template.owner_user_id === actor.user_id) return true;
  const role = await readActorTemplateRole(env, template.id, actor.user_id);
  return typeof role === 'string' && TEMPLATE_COLLABORATOR_ROLES.includes(role);
}

async function handleSaveAction(env, actor, body) {
  const source = isObject(body.slide) ? body.slide : {};
  const title = sanitizeTitle(source.title);
  const canvas = sanitizeCanvas(source.canvas);
  const components = sanitizeComponents(source.components);
  const metadata = normalizeMetadata(source.metadata);

  if (!title) return errorResponse('Invalid title for slide save.', 400);
  if (!canvas) return errorResponse('Invalid canvas payload for slide save.', 400);
  if (!components) return errorResponse('Invalid components payload for slide save.', 400);

  const autosave = source.autosave === true;
  const overwrite = source.overwrite === true;
  const expectedRevision = Number.isFinite(source.revision) ? Number(source.revision) : null;

  const timestamp = new Date().toISOString();

  if (typeof source.id === 'string' && source.id.trim()) {
    const existing = await readSlideById(env, source.id.trim());
    if (!existing || existing.deleted_at) {
      return errorResponse('Slide not found for update.', 404);
    }

    const actorIsAdmin = actor.role === 'admin';
    if (!actorIsAdmin && existing.owner_user_id !== actor.user_id) {
      return errorResponse('Forbidden. You do not own this slide.', 403);
    }

    if (!overwrite && expectedRevision !== null && expectedRevision !== existing.revision) {
      const serverSlide = normalizeSlideRow(existing);
      await insertAudit(env, {
        actor_user_id: actor.user_id,
        actor_email: actor.email || null,
        entity_type: 'slide',
        entity_id: existing.id,
        action: autosave ? 'autosave' : 'save',
        outcome: 'failure',
        error_class: 'revision_conflict',
        details: { expected_revision: expectedRevision, actual_revision: existing.revision },
      });
      return jsonResponse({
        ok: false,
        message: 'Revision conflict. Reload or overwrite.',
        error: 'revision_conflict',
        server_slide: serverSlide,
      }, 409);
    }

    const updatePayload = {
      title,
      canvas,
      components_json: components,
      metadata,
      revision: existing.revision + 1,
      updated_by: actor.user_id,
      updated_at: timestamp,
      last_edited_at: timestamp,
    };

    const patchResponse = await supabaseFetch(
      env,
      '/rest/v1/slides?id=eq.' + encodeURIComponent(existing.id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(updatePayload),
      },
    );

    const rows = await patchResponse.json().catch(() => []);
    const next = normalizeSlideRow(rows[0] || null);

    await insertAudit(env, {
      actor_user_id: actor.user_id,
      actor_email: actor.email || null,
      entity_type: 'slide',
      entity_id: existing.id,
      action: autosave ? 'autosave' : 'save',
      outcome: 'success',
      details: { revision: next?.revision || updatePayload.revision },
    });

    return jsonResponse({ slide: next });
  }

  const insertPayload = {
    owner_user_id: actor.user_id,
    title,
    canvas,
    components_json: components,
    metadata,
    revision: 1,
    source: 'import',
    source_template_id: null,
    created_by: actor.user_id,
    updated_by: actor.user_id,
    last_edited_at: timestamp,
  };

  const insertResponse = await supabaseFetch(env, '/rest/v1/slides', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(insertPayload),
  });

  const rows = await insertResponse.json().catch(() => []);
  const created = normalizeSlideRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'slide',
    entity_id: created?.id || '',
    action: autosave ? 'autosave' : 'save',
    outcome: 'success',
    details: { revision: 1 },
  });

  return jsonResponse({ slide: created }, 201);
}

async function handleDuplicateSlideAction(env, actor, body) {
  const slideId = typeof body.slide_id === 'string' ? body.slide_id.trim() : '';
  if (!slideId) return errorResponse('slide_id required for duplicate-slide.', 400);

  const source = await readSlideById(env, slideId);
  if (!source || source.deleted_at) return errorResponse('Slide not found for duplicate.', 404);

  const actorIsAdmin = actor.role === 'admin';
  if (!actorIsAdmin && source.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this slide.', 403);
  }

  const timestamp = new Date().toISOString();
  const payload = {
    owner_user_id: actor.user_id,
    title: `${source.title} (Copy)`,
    canvas: source.canvas || { width: 1920, height: 1080 },
    components_json: Array.isArray(source.components_json) ? source.components_json : [],
    metadata: source.metadata || {},
    revision: 1,
    source: source.source || 'manual',
    source_template_id: source.source_template_id || null,
    created_by: actor.user_id,
    updated_by: actor.user_id,
    last_edited_at: timestamp,
  };

  const response = await supabaseFetch(env, '/rest/v1/slides', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  const rows = await response.json().catch(() => []);
  const created = normalizeSlideRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'slide',
    entity_id: created?.id || '',
    action: 'duplicate',
    outcome: 'success',
    details: { source_slide_id: slideId },
  });

  return jsonResponse({ slide: created }, 201);
}

async function handleDuplicateTemplateAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for duplicate-template.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for duplicate.', 404);

  const visibleToActor = await isTemplateVisibleToActor(env, template, actor);
  if (!visibleToActor) {
    return errorResponse('Forbidden. Template is not visible to this user.', 403);
  }

  const timestamp = new Date().toISOString();
  const payload = {
    owner_user_id: actor.user_id,
    title: `${template.name} (Copy)`,
    canvas: template.canvas || { width: 1920, height: 1080 },
    components_json: Array.isArray(template.components_json) ? template.components_json : [],
    metadata: {
      source_template_id: template.id,
      ...(template.metadata || {}),
    },
    revision: 1,
    source: 'template',
    source_template_id: template.id,
    created_by: actor.user_id,
    updated_by: actor.user_id,
    last_edited_at: timestamp,
  };

  const response = await supabaseFetch(env, '/rest/v1/slides', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  const rows = await response.json().catch(() => []);
  const created = normalizeSlideRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'duplicate',
    outcome: 'success',
    details: { slide_id: created?.id || '' },
  });

  return jsonResponse({ slide: created }, 201);
}

async function handleRenameSlideAction(env, actor, body) {
  const slideId = typeof body.slide_id === 'string' ? body.slide_id.trim() : '';
  const title = sanitizeTitle(body.title);
  if (!slideId) return errorResponse('slide_id required for rename-slide.', 400);
  if (!title) return errorResponse('title required for rename-slide.', 400);

  const existing = await readSlideById(env, slideId);
  if (!existing || existing.deleted_at) return errorResponse('Slide not found for rename.', 404);

  if (actor.role !== 'admin' && existing.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this slide.', 403);
  }

  const payload = {
    title,
    revision: existing.revision + 1,
    updated_by: actor.user_id,
    updated_at: new Date().toISOString(),
    last_edited_at: new Date().toISOString(),
  };

  const response = await supabaseFetch(
    env,
    '/rest/v1/slides?id=eq.' + encodeURIComponent(existing.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    },
  );

  const rows = await response.json().catch(() => []);
  const updated = normalizeSlideRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'slide',
    entity_id: existing.id,
    action: 'rename',
    outcome: 'success',
    details: { title },
  });

  return jsonResponse({ slide: updated });
}

async function handleDeleteSlideAction(env, actor, body) {
  const slideId = typeof body.slide_id === 'string' ? body.slide_id.trim() : '';
  if (!slideId) return errorResponse('slide_id required for delete-slide.', 400);

  const existing = await readSlideById(env, slideId);
  if (!existing || existing.deleted_at) return errorResponse('Slide not found for delete.', 404);

  if (actor.role !== 'admin' && existing.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this slide.', 403);
  }

  await supabaseFetch(
    env,
    '/rest/v1/slides?id=eq.' + encodeURIComponent(existing.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        revision: existing.revision + 1,
        updated_by: actor.user_id,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'slide',
    entity_id: existing.id,
    action: 'delete',
    outcome: 'success',
    details: {},
  });

  return jsonResponse({ ok: true });
}

async function handlePublishTemplateAction(env, actor, body) {
  const slideId = typeof body.slide_id === 'string' ? body.slide_id.trim() : '';
  const explicitName = typeof body.name === 'string' ? body.name.trim() : '';
  const explicitDescription = sanitizeTemplateDescription(body.description, 'Published from My Slides');
  const requestedShared = body.is_shared === true;
  if (!slideId) return errorResponse('slide_id required for publish-template.', 400);
  if (explicitDescription === null) return errorResponse('Invalid template description.', 400);

  const slide = await readSlideById(env, slideId);
  if (!slide || slide.deleted_at) return errorResponse('Slide not found for publish-template.', 404);

  if (actor.role !== 'admin' && slide.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this slide.', 403);
  }
  if (requestedShared && actor.role !== 'admin') {
    return errorResponse('Forbidden. Only admins can publish shared templates.', 403);
  }

  const templateName = sanitizeTitle(explicitName || `${slide.title} Template`);
  if (!templateName) return errorResponse('Invalid template name.', 400);

  const payload = {
    owner_user_id: actor.user_id,
    name: templateName,
    description: explicitDescription,
    is_shared: requestedShared,
    canvas: slide.canvas || { width: 1920, height: 1080 },
    components_json: Array.isArray(slide.components_json) ? slide.components_json : [],
    metadata: {
      source_slide_id: slide.id,
      ...(slide.metadata || {}),
    },
    created_by: actor.user_id,
    updated_by: actor.user_id,
  };

  const response = await supabaseFetch(env, '/rest/v1/slide_templates', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  const rows = await response.json().catch(() => []);
  const template = normalizeTemplateRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template?.id || '',
    action: 'publish-template',
    outcome: 'success',
    details: { source_slide_id: slide.id },
  });

  return jsonResponse({ template }, 201);
}

async function handleUpdateTemplateAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for update-template.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for update.', 404);

  const actorIsAdmin = actor.role === 'admin';
  const actorIsOwner = template.owner_user_id === actor.user_id;
  const actorRole = actorIsAdmin || actorIsOwner ? null : await readActorTemplateRole(env, template.id, actor.user_id);
  const canEditContent = actorIsAdmin || actorIsOwner || actorRole === 'editor';
  if (!canEditContent) {
    return errorResponse('Forbidden. You do not own this template.', 403);
  }

  const nextName = typeof body.name === 'string' ? sanitizeTitle(body.name) : null;
  if (typeof body.name === 'string' && !nextName) return errorResponse('Invalid template name.', 400);

  const nextDescription = Object.prototype.hasOwnProperty.call(body, 'description')
    ? sanitizeTemplateDescription(body.description, template.description || '')
    : undefined;
  if (nextDescription === null) return errorResponse('Invalid template description.', 400);

  const hasSharedInput = Object.prototype.hasOwnProperty.call(body, 'is_shared');
  const requestedShared = hasSharedInput ? body.is_shared === true : undefined;
  if (typeof requestedShared === 'boolean' && !actorIsAdmin && !actorIsOwner) {
    return errorResponse('Forbidden. Only owners/admins can change template visibility.', 403);
  }
  if (requestedShared === true && !actorIsAdmin) {
    return errorResponse('Forbidden. Only admins can set template visibility to shared.', 403);
  }

  const updatePayload = {
    ...(nextName ? { name: nextName } : {}),
    ...(typeof nextDescription === 'string' ? { description: nextDescription } : {}),
    ...(typeof requestedShared === 'boolean' ? { is_shared: requestedShared } : {}),
    updated_by: actor.user_id,
    updated_at: new Date().toISOString(),
  };

  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_templates?id=eq.' + encodeURIComponent(template.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(updatePayload),
    },
  );

  const rows = await response.json().catch(() => []);
  const updated = normalizeTemplateRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'rename',
    outcome: 'success',
    details: {
      operation: 'update-template',
      changed_shared_visibility: typeof requestedShared === 'boolean',
    },
  });

  return jsonResponse({ template: updated });
}

async function handleArchiveTemplateAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for archive-template.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for archive.', 404);

  const actorIsAdmin = actor.role === 'admin';
  if (!actorIsAdmin && template.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this template.', 403);
  }

  await supabaseFetch(
    env,
    '/rest/v1/slide_templates?id=eq.' + encodeURIComponent(template.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        is_archived: true,
        updated_by: actor.user_id,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?template_id=eq.' + encodeURIComponent(template.id),
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    },
  );

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'delete',
    outcome: 'success',
    details: { operation: 'archive-template' },
  });

  return jsonResponse({ ok: true });
}

async function handleTransferTemplateOwnershipAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for transfer-template-owner.', 400);

  const targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
  const targetUserEmail = normalizeEmail(body.target_user_email || '');
  if (!targetUserId && !targetUserEmail) {
    return errorResponse('target_user_id or target_user_email is required for transfer-template-owner.', 400);
  }

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for ownership transfer.', 404);

  const actorIsAdmin = actor.role === 'admin';
  if (!actorIsAdmin && template.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You do not own this template.', 403);
  }

  let targetUser;
  try {
    targetUser = await readAppUserByIdentifier(env, targetUserId, targetUserEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Target user lookup failed';
    return errorResponse(message, 502);
  }
  if (!targetUser) {
    return errorResponse('Target user not found for ownership transfer.', 404);
  }
  if (!isAuthorizedSlidesActor(targetUser)) {
    return errorResponse('Target user does not have slides access.', 403);
  }

  if (template.owner_user_id === targetUser.user_id) {
    return jsonResponse({ template: normalizeTemplateRow(template) });
  }

  await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?template_id=eq.' +
      encodeURIComponent(template.id) +
      '&user_id=eq.' +
      encodeURIComponent(targetUser.user_id),
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    },
  );

  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_templates?id=eq.' + encodeURIComponent(template.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        owner_user_id: targetUser.user_id,
        updated_by: actor.user_id,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  const rows = await response.json().catch(() => []);
  const updated = normalizeTemplateRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'transfer-template',
    outcome: 'success',
    details: {
      previous_owner_user_id: template.owner_user_id,
      next_owner_user_id: targetUser.user_id,
      next_owner_email: targetUser.email || null,
    },
  });

  return jsonResponse({ template: updated });
}

async function handleUpsertTemplateCollaboratorAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for upsert-template-collaborator.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for collaborator update.', 404);
  const actorIsAdmin = actor.role === 'admin';
  const actorIsOwner = template.owner_user_id === actor.user_id;
  if (!actorIsAdmin && !actorIsOwner) {
    return errorResponse('Forbidden. Only owners/admins can manage collaborators.', 403);
  }

  const role = sanitizeCollaboratorRole(body.role);
  if (!role) {
    return errorResponse('role is required and must be one of editor, reviewer, viewer.', 400);
  }

  const targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
  const targetUserEmail = normalizeEmail(body.target_user_email || '');
  if (!targetUserId && !targetUserEmail) {
    return errorResponse('target_user_id or target_user_email is required for collaborator upsert.', 400);
  }

  let targetUser;
  try {
    targetUser = await readAppUserByIdentifier(env, targetUserId, targetUserEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Target user lookup failed';
    return errorResponse(message, 502);
  }
  if (!targetUser) return errorResponse('Target user not found for collaborator upsert.', 404);
  if (!isAuthorizedSlidesActor(targetUser)) return errorResponse('Target user does not have slides access.', 403);
  if (targetUser.user_id === template.owner_user_id) {
    return errorResponse('Template owner already has full access; collaborator role is not needed.', 400);
  }

  const response = await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        template_id: template.id,
        user_id: targetUser.user_id,
        role,
        created_by: actor.user_id,
        updated_by: actor.user_id,
      }),
    },
  );
  const rows = await response.json().catch(() => []);
  const collaborator = normalizeTemplateCollaboratorRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'upsert-collaborator',
    outcome: 'success',
    details: {
      collaborator_user_id: targetUser.user_id,
      collaborator_email: targetUser.email || null,
      role,
    },
  });

  const usersById = await readAppUsersByIds(env, [targetUser.user_id]);
  return jsonResponse({
    collaborator: collaborator
      ? { ...collaborator, user_email: usersById.get(collaborator.user_id) || null }
      : null,
  });
}

async function handleRemoveTemplateCollaboratorAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for remove-template-collaborator.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for collaborator removal.', 404);
  const actorIsAdmin = actor.role === 'admin';
  const actorIsOwner = template.owner_user_id === actor.user_id;
  if (!actorIsAdmin && !actorIsOwner) {
    return errorResponse('Forbidden. Only owners/admins can manage collaborators.', 403);
  }

  const targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
  const targetUserEmail = normalizeEmail(body.target_user_email || '');
  if (!targetUserId && !targetUserEmail) {
    return errorResponse('target_user_id or target_user_email is required for collaborator removal.', 400);
  }

  let targetUser;
  try {
    targetUser = await readAppUserByIdentifier(env, targetUserId, targetUserEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Target user lookup failed';
    return errorResponse(message, 502);
  }
  if (!targetUser) return errorResponse('Target user not found for collaborator removal.', 404);

  await supabaseFetch(
    env,
    '/rest/v1/slide_template_collaborators?template_id=eq.' +
      encodeURIComponent(template.id) +
      '&user_id=eq.' +
      encodeURIComponent(targetUser.user_id),
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    },
  );

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'remove-collaborator',
    outcome: 'success',
    details: {
      collaborator_user_id: targetUser.user_id,
      collaborator_email: targetUser.email || null,
    },
  });

  return jsonResponse({ ok: true });
}

async function applyTemplateApprovalOperation(env, actor, approvalType, templateId, payload) {
  if (approvalType === 'transfer-template') {
    return handleTransferTemplateOwnershipAction(env, actor, {
      template_id: templateId,
      target_user_id: payload.target_user_id || null,
      target_user_email: payload.target_user_email || null,
    });
  }
  if (approvalType === 'upsert-collaborator') {
    return handleUpsertTemplateCollaboratorAction(env, actor, {
      template_id: templateId,
      target_user_id: payload.target_user_id || null,
      target_user_email: payload.target_user_email || null,
      role: payload.role || null,
    });
  }
  if (approvalType === 'remove-collaborator') {
    return handleRemoveTemplateCollaboratorAction(env, actor, {
      template_id: templateId,
      target_user_id: payload.target_user_id || null,
      target_user_email: payload.target_user_email || null,
    });
  }
  return errorResponse('Unsupported approval operation.', 400);
}

async function handleSubmitTemplateApprovalAction(env, actor, body) {
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  if (!templateId) return errorResponse('template_id required for submit-template-approval.', 400);

  const template = await readTemplateById(env, templateId);
  if (!template) return errorResponse('Template not found for approval submission.', 404);
  const canManage = await isTemplateGovernanceManager(env, actor, template);
  if (!canManage) return errorResponse('Forbidden. Only owners/admins can submit governance approvals.', 403);

  const approvalType = sanitizeApprovalType(body.approval_type);
  if (!approvalType) return errorResponse('approval_type must be transfer-template, upsert-collaborator, or remove-collaborator.', 400);

  const targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
  const targetUserEmail = normalizeEmail(body.target_user_email || '');
  const role = sanitizeCollaboratorRole(body.role);

  if (!targetUserId && !targetUserEmail) {
    return errorResponse('target_user_id or target_user_email is required for approval submission.', 400);
  }
  if (approvalType === 'upsert-collaborator' && !role) {
    return errorResponse('role is required for upsert-collaborator approvals.', 400);
  }

  let targetUser;
  try {
    targetUser = await readAppUserByIdentifier(env, targetUserId, targetUserEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Target user lookup failed';
    return errorResponse(message, 502);
  }
  if (!targetUser) return errorResponse('Target user not found for approval submission.', 404);
  if (!isAuthorizedSlidesActor(targetUser)) return errorResponse('Target user does not have slides access.', 403);

  const payload = {
    target_user_id: targetUser.user_id,
    target_user_email: targetUser.email || null,
    ...(role ? { role } : {}),
  };

  const response = await supabaseFetch(env, '/rest/v1/slide_template_approvals', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      template_id: template.id,
      requested_by_user_id: actor.user_id,
      requested_by_email: actor.email || null,
      approval_type: approvalType,
      payload,
      status: 'pending',
    }),
  });
  const rows = await response.json().catch(() => []);
  const approval = normalizeTemplateApprovalRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: template.id,
    action: 'submit-approval',
    outcome: 'success',
    details: {
      approval_id: approval?.id || null,
      approval_type: approvalType,
      target_user_id: payload.target_user_id,
      target_user_email: payload.target_user_email,
      role: payload.role || null,
    },
  });

  return jsonResponse({ approval }, 201);
}

async function handleResolveTemplateApprovalAction(env, actor, body) {
  if (actor.role !== 'admin') {
    return errorResponse('Forbidden. Only admins can resolve template approvals.', 403);
  }

  const approvalId = typeof body.approval_id === 'string' ? body.approval_id.trim() : '';
  if (!approvalId) return errorResponse('approval_id required for resolve-template-approval.', 400);
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  if (decision !== 'approve' && decision !== 'reject') {
    return errorResponse('decision must be approve or reject.', 400);
  }
  const reviewNote = typeof body.review_note === 'string' ? body.review_note.trim() : '';

  const approval = await readTemplateApprovalById(env, approvalId);
  if (!approval) return errorResponse('Approval not found for resolution.', 404);
  if (approval.status !== 'pending') return errorResponse('Approval is not pending and cannot be resolved.', 409);

  if (decision === 'reject') {
    const rejectResponse = await supabaseFetch(
      env,
      '/rest/v1/slide_template_approvals?id=eq.' + encodeURIComponent(approval.id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'rejected',
          reviewed_by_user_id: actor.user_id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    const rows = await rejectResponse.json().catch(() => []);
    const rejected = normalizeTemplateApprovalRow(rows[0] || null);

    await insertAudit(env, {
      actor_user_id: actor.user_id,
      actor_email: actor.email || null,
      entity_type: 'template',
      entity_id: approval.template_id,
      action: 'reject-approval',
      outcome: 'success',
      details: { approval_id: approval.id, approval_type: approval.approval_type, review_note: reviewNote || null },
    });

    return jsonResponse({ approval: rejected });
  }

  const payload = isObject(approval.payload) ? approval.payload : {};
  const operationResponse = await applyTemplateApprovalOperation(env, actor, approval.approval_type, approval.template_id, payload);
  if (!operationResponse.ok) {
    const text = await operationResponse.text().catch(() => 'Approval operation failed');
    return errorResponse(text || 'Approval operation failed', operationResponse.status || 500);
  }

  const approveResponse = await supabaseFetch(
    env,
    '/rest/v1/slide_template_approvals?id=eq.' + encodeURIComponent(approval.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'approved',
        reviewed_by_user_id: actor.user_id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  const rows = await approveResponse.json().catch(() => []);
  const approved = normalizeTemplateApprovalRow(rows[0] || null);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'template',
    entity_id: approval.template_id,
    action: 'approve-approval',
    outcome: 'success',
    details: { approval_id: approval.id, approval_type: approval.approval_type, review_note: reviewNote || null },
  });

  return jsonResponse({ approval: approved });
}

async function handleUpsertAuditPresetAction(env, actor, body) {
  const name = sanitizeAuditPresetName(body.name);
  if (!name) return errorResponse('Valid preset name is required for upsert-audit-preset.', 400);

  const scope = sanitizeAuditPresetScope(body.scope || 'personal');
  if (scope === 'shared' && actor.role !== 'admin') {
    return errorResponse('Forbidden. Only admins can save shared audit presets.', 403);
  }

  const search = typeof body.search === 'string' ? body.search.trim() : '';
  const actionFilter = typeof body.action_filter === 'string' && (body.action_filter === 'all' || AUDIT_ACTIONS.includes(body.action_filter))
    ? body.action_filter
    : 'all';
  const outcomeFilter = typeof body.outcome === 'string' && (body.outcome === 'all' || AUDIT_OUTCOMES.includes(body.outcome))
    ? body.outcome
    : 'all';
  const entityTypeFilter = typeof body.entity_type === 'string' && (body.entity_type === 'all' || AUDIT_ENTITY_TYPES.includes(body.entity_type))
    ? body.entity_type
    : 'all';
  const dateFrom = typeof body.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date_from.trim())
    ? body.date_from.trim()
    : null;
  const dateTo = typeof body.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date_to.trim())
    ? body.date_to.trim()
    : null;

  let existing = null;
  const explicitPresetId = typeof body.preset_id === 'string' ? body.preset_id.trim() : '';
  if (explicitPresetId) {
    existing = await readAuditPresetById(env, explicitPresetId);
    if (!existing) return errorResponse('Audit preset not found for update.', 404);
    if (actor.role !== 'admin' && existing.owner_user_id !== actor.user_id) {
      return errorResponse('Forbidden. You can only update your own audit presets.', 403);
    }
    if (existing.scope === 'shared' && actor.role !== 'admin') {
      return errorResponse('Forbidden. Only admins can update shared audit presets.', 403);
    }
  } else {
    const dedupePath = '/rest/v1/slide_audit_filter_presets?is_archived=eq.false&owner_user_id=eq.' +
      encodeURIComponent(actor.user_id) +
      '&scope=eq.' +
      encodeURIComponent(scope) +
      '&name=eq.' +
      encodeURIComponent(name) +
      '&select=*&limit=1';
    const dedupeResponse = await supabaseFetch(env, dedupePath);
    const dedupeRows = await dedupeResponse.json().catch(() => []);
    existing = dedupeRows[0] || null;
  }

  const timestamp = new Date().toISOString();
  if (existing) {
    const response = await supabaseFetch(
      env,
      '/rest/v1/slide_audit_filter_presets?id=eq.' + encodeURIComponent(existing.id),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          scope,
          search,
          action_filter: actionFilter,
          outcome_filter: outcomeFilter,
          entity_type_filter: entityTypeFilter,
          date_from: dateFrom,
          date_to: dateTo,
          updated_by: actor.user_id,
          updated_at: timestamp,
        }),
      },
    );
    const rows = await response.json().catch(() => []);
    const preset = normalizeAuditPresetRow(rows[0] || null);
    return jsonResponse({ preset });
  }

  const response = await supabaseFetch(env, '/rest/v1/slide_audit_filter_presets', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_user_id: actor.user_id,
      name,
      scope,
      search,
      action_filter: actionFilter,
      outcome_filter: outcomeFilter,
      entity_type_filter: entityTypeFilter,
      date_from: dateFrom,
      date_to: dateTo,
      created_by: actor.user_id,
      updated_by: actor.user_id,
    }),
  });
  const rows = await response.json().catch(() => []);
  const preset = normalizeAuditPresetRow(rows[0] || null);
  return jsonResponse({ preset }, 201);
}

async function handleDeleteAuditPresetAction(env, actor, body) {
  const presetId = typeof body.preset_id === 'string' ? body.preset_id.trim() : '';
  if (!presetId) return errorResponse('preset_id required for delete-audit-preset.', 400);

  const preset = await readAuditPresetById(env, presetId);
  if (!preset) return errorResponse('Audit preset not found for delete.', 404);
  if (actor.role !== 'admin' && preset.owner_user_id !== actor.user_id) {
    return errorResponse('Forbidden. You can only delete your own audit presets.', 403);
  }
  if (preset.scope === 'shared' && actor.role !== 'admin') {
    return errorResponse('Forbidden. Only admins can delete shared audit presets.', 403);
  }

  await supabaseFetch(
    env,
    '/rest/v1/slide_audit_filter_presets?id=eq.' + encodeURIComponent(preset.id),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        is_archived: true,
        updated_by: actor.user_id,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  return jsonResponse({ ok: true });
}

async function handleRecordExportAction(env, actor, body) {
  const slideId = typeof body.slide_id === 'string' ? body.slide_id.trim() : '';
  const format = body.format === 'pdf' ? 'pdf' : 'html';
  const outcome = body.outcome === 'failure' ? 'failure' : 'success';
  const errorClass = typeof body.error_class === 'string' ? body.error_class : null;

  if (!slideId) return errorResponse('slide_id required for record-export.', 400);

  await insertAudit(env, {
    actor_user_id: actor.user_id,
    actor_email: actor.email || null,
    entity_type: 'slide',
    entity_id: slideId,
    action: format === 'pdf' ? 'export-pdf' : 'export-html',
    outcome,
    error_class: errorClass,
    details: { format },
  });

  return jsonResponse({ ok: true });
}

function addSearch(path, field, query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return path;
  return path + '&' + field + '=ilike.*' + encodeURIComponent(trimmed) + '*';
}

function addAuditSearch(path, query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return path;
  const clause = `(action.ilike.*${trimmed}*,entity_id.ilike.*${trimmed}*,actor_email.ilike.*${trimmed}*,error_class.ilike.*${trimmed}*)`;
  return path + '&or=' + encodeURIComponent(clause);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = assertSupabaseConfigured(env);
  if (missing) return missing;

  const authz = await authorizeActorForRead(request, env);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const actor = authz.actor;
  const url = new URL(request.url);
  const resource = (url.searchParams.get('resource') || 'slides').toLowerCase();
  const search = url.searchParams.get('search') || '';
  const limitRaw = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
  const offsetRaw = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  if (resource === 'slides') {
    let path = '/rest/v1/slides?deleted_at=is.null&select=*&order=updated_at.desc&limit=' + String(limit);
    if (actor.role !== 'admin') {
      path += '&owner_user_id=eq.' + encodeURIComponent(actor.user_id);
    }
    path = addSearch(path, 'title', search);

    const response = await supabaseFetch(env, path);
    const rows = await response.json().catch(() => []);
    const items = rows.map(normalizeSlideRow).filter(Boolean);
    return jsonResponse({ items });
  }

  if (resource === 'templates') {
    let path = '/rest/v1/slide_templates?is_archived=eq.false&select=*&order=updated_at.desc';
    if (actor.role !== 'admin') {
      path += '&or=' + encodeURIComponent(`(is_shared.eq.true,owner_user_id.eq.${actor.user_id})`);
    }
    path = addSearch(path, 'name', search);
    path += '&limit=' + String(limit);

    const response = await supabaseFetch(env, path);
    const baseRows = await response.json().catch(() => []);

    let combined = Array.isArray(baseRows) ? baseRows.slice() : [];
    if (actor.role !== 'admin') {
      const collaboratorTemplateIds = await readTemplateIdsByCollaborator(env, actor.user_id);
      if (collaboratorTemplateIds.length > 0) {
        const inClause = '(' + collaboratorTemplateIds.map((value) => `"${encodeURIComponent(value)}"`).join(',') + ')';
        let collabPath = '/rest/v1/slide_templates?is_archived=eq.false&id=in.' + inClause + '&select=*&order=updated_at.desc';
        collabPath = addSearch(collabPath, 'name', search);
        const collabResponse = await supabaseFetch(env, collabPath);
        const collabRows = await collabResponse.json().catch(() => []);
        combined = combined.concat(Array.isArray(collabRows) ? collabRows : []);
      }
    }

    const dedupedById = new Map();
    for (const row of combined) {
      if (row && typeof row.id === 'string') dedupedById.set(row.id, row);
    }

    const visible = Array.from(dedupedById.values());

    visible.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const items = visible.slice(0, limit).map(normalizeTemplateRow).filter(Boolean);
    return jsonResponse({ items });
  }

  if (resource === 'template-collaborators') {
    const templateId = (url.searchParams.get('template_id') || '').trim();
    if (!templateId) {
      return errorResponse('template_id is required for template-collaborators resource.', 400);
    }

    const template = await readTemplateById(env, templateId);
    if (!template) return errorResponse('Template not found for collaborator read.', 404);
    const visibleToActor = await isTemplateVisibleToActor(env, template, actor);
    if (!visibleToActor) return errorResponse('Forbidden. Template is not visible to this user.', 403);

    const collaborators = await readTemplateCollaborators(env, templateId);
    const usersById = await readAppUsersByIds(env, collaborators.map((entry) => entry.user_id));
    const items = collaborators.map((entry) => ({
      ...entry,
      user_email: usersById.get(entry.user_id) || null,
    }));

    return jsonResponse({ items });
  }

  if (resource === 'template-approvals') {
    const templateId = (url.searchParams.get('template_id') || '').trim();
    const status = sanitizeApprovalStatus(url.searchParams.get('status') || 'pending');

    let path = '/rest/v1/slide_template_approvals?select=*&order=created_at.desc';
    if (templateId) {
      path += '&template_id=eq.' + encodeURIComponent(templateId);
    }
    if (status) {
      path += '&status=eq.' + encodeURIComponent(status);
    }
    if (actor.role !== 'admin') {
      path += '&requested_by_user_id=eq.' + encodeURIComponent(actor.user_id);
    }
    path += '&limit=' + String(limit) + '&offset=' + String(offset);

    const response = await supabaseFetch(env, path);
    const rows = await response.json().catch(() => []);
    const items = rows.map(normalizeTemplateApprovalRow).filter(Boolean);
    return jsonResponse({ items });
  }

  if (resource === 'audit-presets') {
    let path = '/rest/v1/slide_audit_filter_presets?is_archived=eq.false&select=*&order=updated_at.desc&limit=100';
    path += '&or=' + encodeURIComponent(`(scope.eq.shared,owner_user_id.eq.${actor.user_id})`);

    const response = await supabaseFetch(env, path);
    const rows = await response.json().catch(() => []);
    const items = rows.map(normalizeAuditPresetRow).filter(Boolean);
    return jsonResponse({ items });
  }

  if (resource === 'audits') {
    const action = (url.searchParams.get('action') || '').trim();
    const outcome = (url.searchParams.get('outcome') || '').trim();
    const entityType = (url.searchParams.get('entity_type') || '').trim();
    const dateFrom = (url.searchParams.get('date_from') || '').trim();
    const dateTo = (url.searchParams.get('date_to') || '').trim();

    let path = '/rest/v1/slide_audit_events?select=*&order=created_at.desc&limit=' + String(limit + 1) + '&offset=' + String(offset);
    if (actor.role !== 'admin') {
      path += '&actor_user_id=eq.' + encodeURIComponent(actor.user_id);
    }
    if (action && AUDIT_ACTIONS.includes(action)) {
      path += '&action=eq.' + encodeURIComponent(action);
    }
    if (outcome && AUDIT_OUTCOMES.includes(outcome)) {
      path += '&outcome=eq.' + encodeURIComponent(outcome);
    }
    if (entityType && AUDIT_ENTITY_TYPES.includes(entityType)) {
      path += '&entity_type=eq.' + encodeURIComponent(entityType);
    }
    if (dateFrom && dateTo) {
      const dateClause = `(created_at.gte.${dateFrom}T00:00:00.000Z,created_at.lte.${dateTo}T23:59:59.999Z)`;
      path += '&and=' + encodeURIComponent(dateClause);
    } else if (dateFrom) {
      path += '&created_at=gte.' + encodeURIComponent(dateFrom + 'T00:00:00.000Z');
    } else if (dateTo) {
      path += '&created_at=lte.' + encodeURIComponent(dateTo + 'T23:59:59.999Z');
    }
    path = addAuditSearch(path, search);

    const response = await supabaseFetch(env, path);
    const rows = await response.json().catch(() => []);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return jsonResponse({
      items,
      pagination: {
        offset,
        limit,
        has_more: hasMore,
        next_offset: offset + items.length,
      },
    });
  }

  return errorResponse('Unsupported resource for /api/slides. Use slides, templates, audits, audit-presets, template-collaborators, or template-approvals.', 400);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertSupabaseConfigured(env);
  if (missing) return missing;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const authz = await authorizeActor(request, body, env);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const actor = authz.actor;
  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';

  if (action === 'save') return handleSaveAction(env, actor, body);
  if (action === 'duplicate-slide') return handleDuplicateSlideAction(env, actor, body);
  if (action === 'duplicate-template') return handleDuplicateTemplateAction(env, actor, body);
  if (action === 'rename-slide') return handleRenameSlideAction(env, actor, body);
  if (action === 'delete-slide') return handleDeleteSlideAction(env, actor, body);
  if (action === 'publish-template') return handlePublishTemplateAction(env, actor, body);
  if (action === 'update-template') return handleUpdateTemplateAction(env, actor, body);
  if (action === 'archive-template') return handleArchiveTemplateAction(env, actor, body);
  if (action === 'transfer-template-owner') return handleTransferTemplateOwnershipAction(env, actor, body);
  if (action === 'upsert-template-collaborator') return handleUpsertTemplateCollaboratorAction(env, actor, body);
  if (action === 'remove-template-collaborator') return handleRemoveTemplateCollaboratorAction(env, actor, body);
  if (action === 'submit-template-approval') return handleSubmitTemplateApprovalAction(env, actor, body);
  if (action === 'resolve-template-approval') return handleResolveTemplateApprovalAction(env, actor, body);
  if (action === 'upsert-audit-preset') return handleUpsertAuditPresetAction(env, actor, body);
  if (action === 'delete-audit-preset') return handleDeleteAuditPresetAction(env, actor, body);
  if (action === 'record-export') return handleRecordExportAction(env, actor, body);

  return errorResponse('Unsupported action for /api/slides.', 400);
}
