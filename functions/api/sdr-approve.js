// POST /api/sdr-approve
// Body: { item_id?: string, id?: string, action: 'approve' | 'reject' }
// Returns: { ok: true, queued: true, draft_id, action }
//
// This endpoint dispatches the same v-two-sdr workflow path used by email-link
// approvals (approval-handler.yml). The workflow performs all side effects:
// - draft status update
// - approve/reject state transitions
// - send queue write on approval
//
// Authz:
// - Production path: caller identity from Cloudflare Access header
//   (`cf-access-authenticated-user-email`)
// - Caller must map to app_users and be admin or have sdr permission
// - Optional local/dev fallback (disabled by default):
//   set SDR_APPROVAL_TRUST_CLIENT_IDENTITY=1 and send user_id/user_email in body

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

function assertSupabaseConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/sdr-approve. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/sdr-approve. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
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
    return { ok: false, status: 401, error: 'Missing user identity for approval action' };
  }

  const response = await fetch(supabaseUrl + query, {
    headers: serviceHeaders(env),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      error: 'Failed to verify approval actor: ' + text,
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

function getDispatchConfig(env) {
  const token = env.SDR_GITHUB_PAT || env.GITHUB_PAT || '';
  const repo = env.SDR_GITHUB_REPO || env.GITHUB_REPO || 'oliver-chase/v-two-sdr';
  const ref = env.SDR_GITHUB_REF || 'main';
  const workflow = env.SDR_GITHUB_WORKFLOW || 'approval-handler.yml';
  return { token, repo, ref, workflow };
}

async function dispatchApprovalWorkflow(config, draftId, action) {
  if (!config.token) {
    return { ok: false, status: 503, error: 'Approval dispatch not configured (missing SDR_GITHUB_PAT or GITHUB_PAT)' };
  }

  const endpoint =
    'https://api.github.com/repos/' +
    encodeURIComponent(config.repo).replace('%2F', '/') +
    '/actions/workflows/' +
    encodeURIComponent(config.workflow) +
    '/dispatches';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.token,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'oliver-app-sdr-approve',
    },
    body: JSON.stringify({
      ref: config.ref,
      inputs: { draft_id: draftId, action },
    }),
  });

  if (response.status === 204 || response.status === 200) {
    return { ok: true };
  }

  const text = await response.text().catch(() => '');
  return {
    ok: false,
    status: response.status,
    error: 'Workflow dispatch failed: ' + (text || 'unknown GitHub API error'),
  };
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

  const itemId = body.item_id || body.id;
  const action = body.action;

  if (!itemId || typeof itemId !== 'string') return errorResponse('item_id or id required', 400);
  if (action !== 'approve' && action !== 'reject') return errorResponse('action must be approve or reject', 400);

  const identity = resolveActorIdentity(request, body, env);
  if (!identity) {
    return errorResponse(
      'Unauthorized approval request. Missing verified actor identity.',
      401,
    );
  }

  const actorLookup = await fetchActorAppUser(env, identity);
  if (!actorLookup.ok) {
    return errorResponse(actorLookup.error, actorLookup.status || 502);
  }

  if (!isAuthorizedSdrActor(actorLookup.row)) {
    return errorResponse('Forbidden. SDR approval permission required.', 403);
  }

  const dispatchConfig = getDispatchConfig(env);
  const dispatched = await dispatchApprovalWorkflow(dispatchConfig, itemId, action);
  if (!dispatched.ok) {
    return errorResponse(dispatched.error, dispatched.status || 502);
  }

  return jsonResponse({
    ok: true,
    queued: true,
    draft_id: itemId,
    action,
    actor_email: actorLookup.row?.email || null,
  });
}
