// /api/campaigns — service-role campaign reporting/export API.
//
// GET  /api/campaigns?resource=summary|exports|export&...
// POST /api/campaigns { action, actor, ...payload }

import { jsonResponse, errorResponse } from './_shared/ai.js';

const MAX_EXPORT_LIMIT = 200;
const MAX_REPORT_ROWS = 10000;
const EXPORT_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function resolveServiceKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || null;
}

function resolveSupabaseUrl(env) {
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || null;
}

function serviceHeaders(env, extra = {}) {
  const key = resolveServiceKey(env);
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function assertConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/campaigns. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/campaigns. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
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

function shouldTrustClientIdentity(env) {
  if (env.CAMPAIGNS_TRUST_CLIENT_IDENTITY === '1') return true;
  if (env.CAMPAIGNS_TRUST_CLIENT_IDENTITY === '0') return false;
  if (env.USERS_TRUST_CLIENT_IDENTITY === '1') return true;
  if (env.USERS_TRUST_CLIENT_IDENTITY === '0') return false;
  return false;
}

function resolveActorIdentity(request, body, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', email: cfAccessEmail, userId: '' };
  }

  if (!shouldTrustClientIdentity(env)) return null;

  const source = body && typeof body === 'object' ? body : {};
  const actor = source.actor && typeof source.actor === 'object' ? source.actor : {};
  const userId = normalizeUserId(
    actor.user_id
      || source.user_id
      || source.actor_user_id
      || request.headers.get('x-user-id')
      || '',
  );
  const userEmail = normalizeEmail(
    actor.user_email
      || source.user_email
      || source.actor_email
      || request.headers.get('x-user-email')
      || '',
  );

  if (!userId && !userEmail) return null;
  return { source: 'client', email: userEmail, userId };
}

function resolveActorIdentityFromQuery(request, env) {
  const cfAccessEmail = normalizeEmail(request.headers.get('cf-access-authenticated-user-email') || '');
  if (cfAccessEmail) {
    return { source: 'cf-access', email: cfAccessEmail, userId: '' };
  }

  if (!shouldTrustClientIdentity(env)) return null;

  const url = new URL(request.url);
  const userId = normalizeUserId(
    request.headers.get('x-user-id')
      || url.searchParams.get('user_id')
      || url.searchParams.get('actor_user_id')
      || '',
  );
  const userEmail = normalizeEmail(
    request.headers.get('x-user-email')
      || url.searchParams.get('user_email')
      || url.searchParams.get('actor_email')
      || '',
  );

  if (!userId && !userEmail) return null;
  return { source: 'client', email: userEmail, userId };
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
  const select = 'user_id,email,role,page_permissions';
  let path = '';

  if (identity.email && identity.userId) {
    path = '/rest/v1/app_users?or=(email.eq.' + encodeURIComponent(identity.email) + ',user_id.eq.' + encodeURIComponent(identity.userId) + ')&select=' + select + '&limit=1';
  } else if (identity.email) {
    path = '/rest/v1/app_users?email=eq.' + encodeURIComponent(identity.email) + '&select=' + select + '&limit=1';
  } else if (identity.userId) {
    path = '/rest/v1/app_users?user_id=eq.' + encodeURIComponent(identity.userId) + '&select=' + select + '&limit=1';
  } else {
    return { ok: false, status: 401, error: 'Missing actor identity for campaign operation.' };
  }

  const lookup = await supabaseJson(env, path);
  if (!lookup.ok) {
    return { ok: false, status: lookup.status, error: 'Failed to verify campaign actor: ' + lookup.text };
  }

  const rows = Array.isArray(lookup.data) ? lookup.data : [];
  return { ok: true, row: rows[0] || null };
}

function isAuthorizedCampaignActor(appUser) {
  if (!appUser || typeof appUser !== 'object') return false;
  if (appUser.role === 'admin') return true;
  if (!Array.isArray(appUser.page_permissions)) return false;
  return appUser.page_permissions.includes('campaigns');
}

async function authorizeActor(request, env, body = null) {
  const identity = body
    ? resolveActorIdentity(request, body, env)
    : resolveActorIdentityFromQuery(request, env);

  if (!identity) {
    return { ok: false, status: 401, error: 'Unauthorized campaign request. Missing verified actor identity.' };
  }

  const actorLookup = await fetchActorAppUser(env, identity);
  if (!actorLookup.ok) return actorLookup;

  if (!isAuthorizedCampaignActor(actorLookup.row)) {
    return { ok: false, status: 403, error: 'Forbidden. Campaign permission required.' };
  }

  return { ok: true, actor: actorLookup.row };
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseFilters(input) {
  const source = input && typeof input === 'object' ? input : {};
  const startDate = asString(source.startDate || source.start_date || '');
  const endDate = asString(source.endDate || source.end_date || '');
  const campaignId = asString(source.campaignId || source.campaign_id || '');
  const contentType = asString(source.contentType || source.content_type || '');

  return {
    startDate,
    endDate,
    campaignId,
    contentType,
  };
}

function parseJourneyTimelineFilters(input) {
  const source = input && typeof input === 'object' ? input : {};
  const startDate = asString(source.startDate || source.start_date || '');
  const endDate = asString(source.endDate || source.end_date || '');
  const nodeType = asString(source.nodeType || source.node_type || '');
  const branchOutcome = asString(source.branchOutcome || source.branch_outcome || '');
  const limit = Number.parseInt(String(source.limit ?? '50'), 10);
  const offset = Number.parseInt(String(source.offset ?? '0'), 10);

  return {
    startDate,
    endDate,
    nodeType,
    branchOutcome,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50,
    offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
  };
}

function canonicalizeForJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeForJson);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalizeForJson(nested)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function buildExportFingerprint(input) {
  const canonicalFilters = canonicalizeForJson(input && typeof input === 'object' ? input : {});
  return JSON.stringify({
    format: asString(input.format || 'markdown') || 'markdown',
    filters: canonicalFilters,
  });
}

function dateToIsoOrNull(value, endOfDay = false) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = trimmed.includes('T')
    ? trimmed
    : (endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`);

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function canonicalLifecycleStatus(row) {
  if (typeof row?.lifecycle_status === 'string' && row.lifecycle_status.trim()) return row.lifecycle_status;
  if (row?.status === 'draft') return 'draft';
  if (row?.status === 'needs_review') return 'in_review';
  if (row?.status === 'unclaimed') return 'approved';
  if (row?.status === 'claimed') return 'scheduled';
  if (row?.status === 'posted' && row?.archived_at) return 'archived';
  if (row?.status === 'posted') return 'posted';
  return 'draft';
}

async function fetchContentRows(env, filters) {
  const parts = [
    '/rest/v1/campaign_content_items?select=id,status,lifecycle_status,review_status,created_at,updated_at,posted_at,scheduled_for,campaign_id,content_type,topic,created_by,posting_owner_id,archived_at',
    '&order=created_at.desc',
    '&limit=' + MAX_REPORT_ROWS,
  ];

  if (filters.campaignId) parts.push('&campaign_id=eq.' + encodeURIComponent(filters.campaignId));
  if (filters.contentType) parts.push('&content_type=eq.' + encodeURIComponent(filters.contentType));

  const startIso = dateToIsoOrNull(filters.startDate, false);
  const endIso = dateToIsoOrNull(filters.endDate, true);
  if (startIso) parts.push('&created_at=gte.' + encodeURIComponent(startIso));
  if (endIso) parts.push('&created_at=lte.' + encodeURIComponent(endIso));

  const lookup = await supabaseJson(env, parts.join(''));
  if (!lookup.ok) {
    return {
      ok: false,
      status: lookup.status,
      error: 'Failed to load campaign content rows: ' + lookup.text,
      rows: [],
    };
  }

  return {
    ok: true,
    rows: Array.isArray(lookup.data) ? lookup.data : [],
  };
}

function computeSummary(rows, nowIso) {
  const now = new Date(nowIso).getTime();

  const waitingReview = rows.filter((row) => canonicalLifecycleStatus(row) === 'in_review').length;
  const unclaimed = rows.filter((row) => canonicalLifecycleStatus(row) === 'approved').length;
  const claimed = rows.filter((row) => canonicalLifecycleStatus(row) === 'scheduled').length;
  const posted = rows.filter((row) => {
    const status = canonicalLifecycleStatus(row);
    return status === 'posted' || status === 'archived';
  }).length;
  const submitted = waitingReview + unclaimed + claimed + posted;
  const approved = unclaimed + claimed + posted;
  const missed = rows.filter((row) => {
    if (canonicalLifecycleStatus(row) !== 'scheduled') return false;
    if (!row.scheduled_for) return false;
    return new Date(row.scheduled_for).getTime() < now;
  }).length;

  return {
    created_count: rows.length,
    submitted_count: submitted,
    approved_count: approved,
    claimed_count: claimed,
    posted_count: posted,
    missed_count: missed,
    unclaimed_count: unclaimed,
    waiting_review_count: waitingReview,
  };
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function computeGroupings(rows) {
  return {
    by_campaign: countBy(rows, (row) => row.campaign_id || 'unassigned'),
    by_topic: countBy(rows, (row) => row.topic || 'untagged'),
    by_user: countBy(rows, (row) => row.posting_owner_id || row.created_by || 'unknown'),
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildMarkdownExport(summary, groupings, filters) {
  const lines = [
    '# Campaign Execution Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Filters',
    `- Start: ${filters.startDate || 'all'}`,
    `- End: ${filters.endDate || 'all'}`,
    `- Campaign: ${filters.campaignId || 'all'}`,
    `- Content Type: ${filters.contentType || 'all'}`,
    '',
    '## Summary Metrics',
    '| Metric | Count |',
    '| --- | ---: |',
    `| Created | ${summary.created_count} |`,
    `| Submitted | ${summary.submitted_count} |`,
    `| Approved | ${summary.approved_count} |`,
    `| Waiting Review | ${summary.waiting_review_count} |`,
    `| Unclaimed | ${summary.unclaimed_count} |`,
    `| Claimed | ${summary.claimed_count} |`,
    `| Posted | ${summary.posted_count} |`,
    `| Missed | ${summary.missed_count} |`,
    '',
    '## Grouping: Campaign',
    ...groupings.by_campaign.map((row) => `- ${row.key}: ${row.count}`),
    '',
    '## Grouping: Topic',
    ...groupings.by_topic.map((row) => `- ${row.key}: ${row.count}`),
    '',
    '## Grouping: User',
    ...groupings.by_user.map((row) => `- ${row.key}: ${row.count}`),
  ];

  return lines.join('\n');
}

function buildHtmlExport(summary, groupings, filters) {
  const metricRows = [
    ['Created', summary.created_count],
    ['Submitted', summary.submitted_count],
    ['Approved', summary.approved_count],
    ['Waiting Review', summary.waiting_review_count],
    ['Unclaimed', summary.unclaimed_count],
    ['Claimed', summary.claimed_count],
    ['Posted', summary.posted_count],
    ['Missed', summary.missed_count],
  ]
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td style="text-align:right">${escapeHtml(value)}</td></tr>`)
    .join('');

  const listSection = (title, items) => [
    `<h3>${escapeHtml(title)}</h3>`,
    '<ul>',
    ...items.map((row) => `<li>${escapeHtml(row.key)}: ${escapeHtml(row.count)}</li>`),
    '</ul>',
  ].join('');

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8" />',
    '<title>Campaign Execution Summary</title>',
    '<style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}table{border-collapse:collapse;width:100%;max-width:560px}td,th{border:1px solid #d1d5db;padding:8px}h1,h2,h3{margin:0 0 12px 0}ul{margin:8px 0 20px 20px}</style>',
    '</head><body>',
    '<h1>Campaign Execution Summary</h1>',
    `<p>Generated: ${escapeHtml(new Date().toISOString())}</p>`,
    '<h2>Filters</h2>',
    `<p>Start: ${escapeHtml(filters.startDate || 'all')}<br/>End: ${escapeHtml(filters.endDate || 'all')}<br/>Campaign: ${escapeHtml(filters.campaignId || 'all')}<br/>Content Type: ${escapeHtml(filters.contentType || 'all')}</p>`,
    '<h2>Summary Metrics</h2>',
    `<table><tbody>${metricRows}</tbody></table>`,
    listSection('Grouping: Campaign', groupings.by_campaign),
    listSection('Grouping: Topic', groupings.by_topic),
    listSection('Grouping: User', groupings.by_user),
    '</body></html>',
  ].join('');
}

async function insertCampaignActivity(env, payload) {
  await supabaseJson(env, '/rest/v1/campaign_activity_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
}

function normalizeExportRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    requested_by_user_id: row.requested_by_user_id,
    format: row.format,
    filters: row.filters || {},
    status: row.status,
    file_name: row.file_name || null,
    file_payload: row.file_payload || null,
    error_message: row.error_message || null,
    requested_at: row.requested_at || null,
    completed_at: row.completed_at || null,
  };
}

function isFingerprintColumnMissing(result) {
  const message = String(result?.text || '').toLowerCase();
  return (
    message.includes('request_fingerprint')
    && (
      message.includes('column')
      || message.includes('schema cache')
      || message.includes('does not exist')
      || message.includes('pgrst')
    )
  );
}

async function findExistingExportByFingerprint(env, input) {
  const now = Date.now();
  const cutoffIso = new Date(now - EXPORT_DEDUPE_WINDOW_MS).toISOString();
  const path = [
    '/rest/v1/campaign_report_exports?select=id,requested_by_user_id,format,filters,status,file_name,file_payload,error_message,requested_at,completed_at',
    '&requested_by_user_id=eq.' + encodeURIComponent(input.requestedBy),
    '&request_fingerprint=eq.' + encodeURIComponent(input.fingerprint),
    '&status=in.(queued,running,completed)',
    '&requested_at=gte.' + encodeURIComponent(cutoffIso),
    '&order=requested_at.desc',
    '&limit=1',
  ].join('');

  const existing = await supabaseJson(env, path);
  if (!existing.ok) {
    if (isFingerprintColumnMissing(existing)) {
      return { ok: true, row: null, fingerprintSupported: false };
    }
    return {
      ok: false,
      status: existing.status,
      error: 'Failed to load existing campaign export dedupe rows: ' + existing.text,
      row: null,
      fingerprintSupported: true,
    };
  }

  const rows = Array.isArray(existing.data) ? existing.data : [];
  return { ok: true, row: normalizeExportRow(rows[0] || null), fingerprintSupported: true };
}

async function createExportJob(env, input) {
  const existing = await findExistingExportByFingerprint(env, {
    requestedBy: input.requestedBy,
    fingerprint: input.fingerprint,
  });
  if (!existing.ok) {
    return {
      ok: false,
      status: existing.status,
      error: existing.error,
      row: null,
      deduped: false,
    };
  }
  if (existing.row) {
    return {
      ok: true,
      row: existing.row,
      deduped: true,
    };
  }

  const insert = await supabaseJson(env, '/rest/v1/campaign_report_exports', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      requested_by_user_id: input.requestedBy,
      format: input.format,
      filters: input.filters,
      request_fingerprint: existing.fingerprintSupported ? input.fingerprint : null,
      status: 'completed',
      file_name: input.fileName,
      file_payload: input.payload,
      completed_at: new Date().toISOString(),
    }),
  });

  if (!insert.ok) {
    return {
      ok: false,
      status: insert.status,
      error: 'Failed to store campaign export job: ' + insert.text,
      row: null,
      deduped: false,
    };
  }

  const rows = Array.isArray(insert.data) ? insert.data : [];
  return { ok: true, row: normalizeExportRow(rows[0] || null), deduped: false };
}

function parseFormat(raw) {
  const normalized = asString(raw).toLowerCase();
  if (normalized === 'html') return 'html';
  return 'markdown';
}

function parseJourneyExportFormat(raw) {
  const normalized = asString(raw).toLowerCase();
  if (normalized === 'json') return 'json';
  return 'csv';
}

function normalizeTimelineRow(row) {
  const metadata = row && typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
  const nodeType = asString(metadata.journey_node_type || '');
  const branchOutcome = asString(metadata.branch_outcome || '');
  const actorType = asString(metadata.actor_type || '') === 'system' ? 'system' : 'user';
  const message = asString(metadata.message || '')
    || (row.action_type === 'campaign-journey-published'
      ? `Journey published as version ${metadata.after_graph_version || 'unknown'}`
      : `${nodeType || 'node'} execution recorded`);

  return {
    id: row.id,
    campaign_id: row.entity_id,
    node_id: asString(metadata.journey_node_id || '') || null,
    node_type: nodeType || null,
    branch_outcome: row.action_type === 'campaign-journey-published' ? 'n/a' : (branchOutcome || 'n/a'),
    actor_type: actorType,
    actor_user_id: row.performed_by || null,
    action_type: row.action_type,
    message,
    timestamp: row.timestamp,
    metadata,
  };
}

async function fetchJourneyTimelineRows(env, campaignId, filters = {}) {
  const pageLimit = Math.max(1, Math.min(Number(filters.limit || 50), 200));
  const pageOffset = Math.max(0, Number(filters.offset || 0));
  const queryLimit = pageLimit + 1;

  const parts = [
    '/rest/v1/campaign_activity_log?select=id,entity_id,action_type,performed_by,timestamp,metadata',
    '&entity_id=eq.' + encodeURIComponent(campaignId),
    '&action_type=in.(campaign-journey-node-executed,campaign-journey-published)',
    '&order=timestamp.desc',
    '&limit=' + queryLimit,
    '&offset=' + pageOffset,
  ];

  const startIso = dateToIsoOrNull(filters.startDate || '', false);
  const endIso = dateToIsoOrNull(filters.endDate || '', true);
  if (startIso) parts.push('&timestamp=gte.' + encodeURIComponent(startIso));
  if (endIso) parts.push('&timestamp=lte.' + encodeURIComponent(endIso));

  const nodeType = asString(filters.nodeType || '');
  const branchOutcome = asString(filters.branchOutcome || '');
  if (nodeType) parts.push('&metadata->>journey_node_type=eq.' + encodeURIComponent(nodeType));
  if (branchOutcome && branchOutcome !== 'n/a') parts.push('&metadata->>branch_outcome=eq.' + encodeURIComponent(branchOutcome));

  const loaded = await supabaseJson(env, parts.join(''));
  if (!loaded.ok) {
    return {
      ok: false,
      status: loaded.status,
      error: 'Failed to load campaign journey timeline rows: ' + loaded.text,
      items: [],
      hasMore: false,
    };
  }

  const rows = Array.isArray(loaded.data) ? loaded.data : [];
  const hasMore = rows.length > pageLimit;
  return {
    ok: true,
    items: rows.slice(0, pageLimit).map(normalizeTimelineRow),
    hasMore,
  };
}

function buildJourneyTimelineCsv(items) {
  const headers = [
    'id',
    'campaign_id',
    'timestamp',
    'node_id',
    'node_type',
    'branch_outcome',
    'actor_type',
    'actor_user_id',
    'action_type',
    'message',
  ];

  const escapeCsv = (value) => `"${String(value || '').replaceAll('"', '""')}"`;
  const lines = [
    headers.join(','),
    ...items.map((item) => headers.map((header) => escapeCsv(item[header] || '')).join(',')),
  ];
  return lines.join('\n');
}

async function generateSummaryAndGroupings(env, filters) {
  const loaded = await fetchContentRows(env, filters);
  if (!loaded.ok) return loaded;

  const summary = computeSummary(loaded.rows, new Date().toISOString());
  const groupings = computeGroupings(loaded.rows);
  return {
    ok: true,
    rows: loaded.rows,
    summary,
    groupings,
  };
}

function capLimit(value) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(parsed, MAX_EXPORT_LIMIT);
}

async function listExports(env, actor, limit) {
  const parts = [
    '/rest/v1/campaign_report_exports?select=id,requested_by_user_id,format,filters,status,file_name,error_message,requested_at,completed_at',
    '&order=requested_at.desc',
    '&limit=' + limit,
  ];

  if (actor.role !== 'admin') {
    parts.push('&requested_by_user_id=eq.' + encodeURIComponent(actor.user_id));
  }

  return supabaseJson(env, parts.join(''));
}

async function loadExportById(env, exportId) {
  return supabaseJson(
    env,
    '/rest/v1/campaign_report_exports?id=eq.' + encodeURIComponent(exportId)
      + '&select=id,requested_by_user_id,format,filters,status,file_name,file_payload,error_message,requested_at,completed_at'
      + '&limit=1',
  );
}

function canAccessExport(actor, exportRow) {
  if (actor.role === 'admin') return true;
  return exportRow.requested_by_user_id === actor.user_id;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  const authz = await authorizeActor(request, env, null);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const url = new URL(request.url);
  const resource = asString(url.searchParams.get('resource') || 'summary') || 'summary';

  if (resource === 'summary') {
    const filters = parseFilters({
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      campaignId: url.searchParams.get('campaignId') || '',
      contentType: url.searchParams.get('contentType') || '',
    });

    const result = await generateSummaryAndGroupings(env, filters);
    if (!result.ok) return errorResponse(result.error, result.status || 500);

    return jsonResponse({
      ok: true,
      summary: result.summary,
      groupings: result.groupings,
      filters,
    });
  }

  if (resource === 'exports') {
    const limit = capLimit(url.searchParams.get('limit') || '');
    const rows = await listExports(env, authz.actor, limit);
    if (!rows.ok) return errorResponse('Failed to list campaign exports: ' + rows.text, rows.status || 500);

    return jsonResponse({ ok: true, items: Array.isArray(rows.data) ? rows.data : [] });
  }

  if (resource === 'export') {
    const exportId = asString(url.searchParams.get('export_id') || url.searchParams.get('id') || '');
    if (!exportId) return errorResponse('export_id is required', 400);

    const loaded = await loadExportById(env, exportId);
    if (!loaded.ok) return errorResponse('Failed to load campaign export: ' + loaded.text, loaded.status || 500);

    const rows = Array.isArray(loaded.data) ? loaded.data : [];
    const exportRow = rows[0] || null;
    if (!exportRow) return errorResponse('Campaign export job not found.', 404);
    if (!canAccessExport(authz.actor, exportRow)) return errorResponse('Forbidden. Cannot access this campaign export job.', 403);

    return jsonResponse({
      ok: true,
      item: exportRow,
    });
  }

  return errorResponse('Unknown resource: ' + resource, 400);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const authz = await authorizeActor(request, env, body);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);

  const action = asString(body.action || '');
  if (!action) return errorResponse('action is required', 400);

  if (action === 'get-report-summary') {
    const filters = parseFilters(body.filters || {});
    const result = await generateSummaryAndGroupings(env, filters);
    if (!result.ok) return errorResponse(result.error, result.status || 500);

    return jsonResponse({
      ok: true,
      summary: result.summary,
      groupings: result.groupings,
      filters,
    });
  }

  if (action === 'get-journey-timeline') {
    const campaignId = asString(body.campaign_id || body.campaignId || '');
    if (!campaignId) return errorResponse('campaign_id is required', 400);

    const filters = parseJourneyTimelineFilters(body.filters || {});
    const loaded = await fetchJourneyTimelineRows(env, campaignId, filters);
    if (!loaded.ok) return errorResponse(loaded.error, loaded.status || 500);

    return jsonResponse({
      ok: true,
      items: loaded.items,
      hasMore: loaded.hasMore,
      generatedAt: new Date().toISOString(),
      filters,
    });
  }

  if (action === 'request-report-export') {
    const filters = parseFilters(body.filters || {});
    const format = parseFormat(body.format || 'markdown');
    const fingerprint = buildExportFingerprint({ format, filters });

    const result = await generateSummaryAndGroupings(env, filters);
    if (!result.ok) return errorResponse(result.error, result.status || 500);

    const payload = format === 'html'
      ? buildHtmlExport(result.summary, result.groupings, filters)
      : buildMarkdownExport(result.summary, result.groupings, filters);

    const stamp = new Date().toISOString().slice(0, 10);
    const extension = format === 'html' ? 'html' : 'md';
    const fileName = `campaign-summary-${stamp}.${extension}`;

    const created = await createExportJob(env, {
      requestedBy: authz.actor.user_id,
      format,
      filters,
      fingerprint,
      fileName,
      payload,
    });
    if (!created.ok) return errorResponse(created.error, created.status || 500);

    await insertCampaignActivity(env, {
      entity_type: 'campaign-report',
      entity_id: created.row?.id || 'unknown',
      action_type: created.deduped ? 'report-export-deduped' : 'report-export-generated',
      performed_by: authz.actor.user_id,
      metadata: {
        format,
        filters,
        deduped: !!created.deduped,
      },
    });

    return jsonResponse({
      ok: true,
      job: created.row,
      deduped: !!created.deduped,
      summary: result.summary,
      groupings: result.groupings,
    }, created.deduped ? 200 : 201);
  }

  if (action === 'request-journey-timeline-export') {
    const campaignId = asString(body.campaign_id || body.campaignId || '');
    if (!campaignId) return errorResponse('campaign_id is required', 400);

    const filters = parseJourneyTimelineFilters(body.filters || {});
    const format = parseJourneyExportFormat(body.format || 'csv');
    const loaded = await fetchJourneyTimelineRows(env, campaignId, { ...filters, limit: 200, offset: 0 });
    if (!loaded.ok) return errorResponse(loaded.error, loaded.status || 500);

    const stamp = new Date().toISOString().slice(0, 10);
    const payload = format === 'json'
      ? JSON.stringify({
        generated_at: new Date().toISOString(),
        campaign_id: campaignId,
        filters,
        items: loaded.items,
      }, null, 2)
      : buildJourneyTimelineCsv(loaded.items);
    const fileName = `campaign-journey-timeline-${stamp}.${format}`;
    const fingerprint = buildExportFingerprint({
      format,
      filters: { ...filters, campaign_id: campaignId, export_type: 'journey-timeline' },
    });

    const created = await createExportJob(env, {
      requestedBy: authz.actor.user_id,
      format,
      filters: { ...filters, campaign_id: campaignId, export_type: 'journey-timeline' },
      fingerprint,
      fileName,
      payload,
    });
    if (!created.ok) return errorResponse(created.error, created.status || 500);

    await insertCampaignActivity(env, {
      entity_type: 'campaign-report',
      entity_id: created.row?.id || 'unknown',
      action_type: created.deduped ? 'journey-timeline-export-deduped' : 'journey-timeline-export-generated',
      performed_by: authz.actor.user_id,
      metadata: {
        campaign_id: campaignId,
        format,
        filters,
        deduped: !!created.deduped,
      },
    });

    return jsonResponse({
      ok: true,
      job: created.row,
      deduped: !!created.deduped,
      count: loaded.items.length,
    }, created.deduped ? 200 : 201);
  }

  if (action === 'download-report-export') {
    const exportId = asString(body.export_id || body.id || '');
    if (!exportId) return errorResponse('export_id is required', 400);

    const loaded = await loadExportById(env, exportId);
    if (!loaded.ok) return errorResponse('Failed to load campaign export: ' + loaded.text, loaded.status || 500);

    const rows = Array.isArray(loaded.data) ? loaded.data : [];
    const exportRow = rows[0] || null;
    if (!exportRow) return errorResponse('Campaign export job not found.', 404);
    if (!canAccessExport(authz.actor, exportRow)) return errorResponse('Forbidden. Cannot access this campaign export job.', 403);
    if (exportRow.status !== 'completed') return errorResponse('Campaign export job is not ready for download.', 409);

    return jsonResponse({
      ok: true,
      filename: exportRow.file_name || 'campaign-summary.md',
      content: exportRow.file_payload || '',
      format: exportRow.format || 'markdown',
      filters: exportRow.filters || {},
    });
  }

  return errorResponse('Unknown action: ' + action, 400);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const missing = assertConfigured(env);
  if (missing) return missing;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const authz = await authorizeActor(request, env, body);
  if (!authz.ok) return errorResponse(authz.error, authz.status || 403);
  if (authz.actor.role !== 'admin') return errorResponse('Forbidden. Admin required.', 403);

  const action = asString(body.action || '');
  if (!action) return errorResponse('action is required', 400);

  if (action === 'mark-export-failed') {
    const exportId = asString(body.export_id || '');
    if (!exportId) return errorResponse('export_id is required', 400);

    const patch = await supabaseJson(
      env,
      '/rest/v1/campaign_report_exports?id=eq.' + encodeURIComponent(exportId),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'failed',
          error_message: asString(body.error_message || 'marked-failed-by-admin'),
          completed_at: new Date().toISOString(),
        }),
      },
    );

    if (!patch.ok) return errorResponse('Failed to mark export failed: ' + patch.text, patch.status || 500);
    const rows = Array.isArray(patch.data) ? patch.data : [];

    return jsonResponse({ ok: true, job: rows[0] || null });
  }

  return errorResponse('Unknown action: ' + action, 400);
}
