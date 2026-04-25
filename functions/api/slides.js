// /api/slides — slide persistence, template library, and audit operations.
//
// GET /api/slides?resource=slides|templates|audits&search=&limit=&offset=
// POST /api/slides { action, actor, ...payload }

import { jsonResponse, errorResponse } from './_shared/ai.js';

const MAX_COMPONENTS_PER_SLIDE = 400;
const MAX_TITLE_LENGTH = 160;
const MAX_TEMPLATE_DESCRIPTION_LENGTH = 400;

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

function resolveActorIdentity(request, body, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', userId: '', email: cfAccessEmail };
  }

  const trustClientIdentity = env.SLIDES_TRUST_CLIENT_IDENTITY === '1';
  if (!trustClientIdentity) return null;

  const bodyActor = normalizeActorBody(body?.actor || body || {});
  const userId = bodyActor.user_id || (typeof body?.user_id === 'string' ? body.user_id.trim() : '');
  const userEmail = bodyActor.user_email || normalizeEmail(body?.user_email || '');

  if (!userId && !userEmail) return null;
  return { source: 'client', userId, email: userEmail };
}

function resolveActorIdentityFromQuery(request, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', userId: '', email: cfAccessEmail };
  }

  const trustClientIdentity = env.SLIDES_TRUST_CLIENT_IDENTITY === '1';
  if (!trustClientIdentity) return null;

  const url = new URL(request.url);
  const userId = (url.searchParams.get('user_id') || '').trim();
  const userEmail = normalizeEmail(url.searchParams.get('user_email') || '');

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

  if (!template.is_shared && template.owner_user_id !== actor.user_id && actor.role !== 'admin') {
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
  if (!actorIsAdmin && template.owner_user_id !== actor.user_id) {
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
    let path = '/rest/v1/slide_templates?is_archived=eq.false&select=*&order=updated_at.desc&limit=' + String(limit);
    if (actor.role !== 'admin') {
      path += '&or=' + encodeURIComponent(`(is_shared.eq.true,owner_user_id.eq.${actor.user_id})`);
    }
    path = addSearch(path, 'name', search);

    const response = await supabaseFetch(env, path);
    const rows = await response.json().catch(() => []);

    const visible = rows.filter((row) => {
      if (actor.role === 'admin') return true;
      if (row.is_shared) return true;
      return row.owner_user_id === actor.user_id;
    });

    const items = visible.map(normalizeTemplateRow).filter(Boolean);
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
    if (action && ['save', 'autosave', 'delete', 'duplicate', 'rename', 'publish-template', 'export-html', 'export-pdf'].includes(action)) {
      path += '&action=eq.' + encodeURIComponent(action);
    }
    if (outcome && ['success', 'failure'].includes(outcome)) {
      path += '&outcome=eq.' + encodeURIComponent(outcome);
    }
    if (entityType && ['slide', 'template'].includes(entityType)) {
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

  return errorResponse('Unsupported resource for /api/slides. Use slides, templates, or audits.', 400);
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
  if (action === 'record-export') return handleRecordExportAction(env, actor, body);

  return errorResponse('Unsupported action for /api/slides.', 400);
}
