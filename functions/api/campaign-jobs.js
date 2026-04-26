// /api/campaign-jobs — scheduled campaign jobs (reminders + missed detection)
//
// POST /api/campaign-jobs { action: 'all'|'dispatch-reminders'|'detect-missed', dryRun?: boolean, actor?: {...} }

import { jsonResponse, errorResponse } from './_shared/ai.js';

const REMINDER_BATCH_LIMIT = 500;
const MISSED_BATCH_LIMIT = 1000;

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
    return errorResponse('Supabase URL not configured for /api/campaign-jobs. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase admin key not configured for /api/campaign-jobs. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY.', 503);
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

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function shouldTrustClientIdentity(env) {
  if (env.CAMPAIGN_JOBS_TRUST_CLIENT_IDENTITY === '1') return true;
  if (env.CAMPAIGN_JOBS_TRUST_CLIENT_IDENTITY === '0') return false;
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

function validateJobSecret(request, env) {
  const configured = asString(env.CAMPAIGN_JOBS_SECRET || '');
  if (!configured) return { ok: false, reason: 'not-configured' };

  const headerSecret = asString(request.headers.get('x-campaign-jobs-secret') || '');
  if (headerSecret && headerSecret === configured) return { ok: true, reason: 'header-secret' };

  const authHeader = asString(request.headers.get('authorization') || '');
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer === configured) return { ok: true, reason: 'bearer-secret' };
  }

  return { ok: false, reason: 'invalid-secret' };
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
    return { ok: false, status: 401, error: 'Missing actor identity for campaign job trigger.' };
  }

  const lookup = await supabaseJson(env, path);
  if (!lookup.ok) {
    return { ok: false, status: lookup.status, error: 'Failed to verify campaign job actor: ' + lookup.text };
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

async function authorizeManualActor(request, env, body) {
  const identity = resolveActorIdentity(request, body, env);
  if (!identity) {
    return { ok: false, status: 401, error: 'Unauthorized campaign job trigger. Missing secret or verified actor.' };
  }

  const lookup = await fetchActorAppUser(env, identity);
  if (!lookup.ok) return lookup;

  if (!isAuthorizedCampaignActor(lookup.row)) {
    return { ok: false, status: 403, error: 'Forbidden. Campaign permission required for manual job trigger.' };
  }

  return { ok: true, actor: lookup.row };
}

function channelEnabled(reminderType, env) {
  if (reminderType === 'in-app' || reminderType === 'ics') return true;
  if (reminderType === 'slack') return env.CAMPAIGN_ENABLE_SLACK_REMINDERS === '1';
  if (reminderType === 'email') return env.CAMPAIGN_ENABLE_EMAIL_REMINDERS === '1';
  return false;
}

function ymdRangeUtc(inputDate) {
  const base = inputDate ? new Date(inputDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function updateReminderState(env, reminderId, patch) {
  return supabaseJson(
    env,
    '/rest/v1/campaign_reminders?id=eq.' + encodeURIComponent(reminderId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    },
  );
}

async function insertActivityLogs(env, logs) {
  if (!logs.length) return { ok: true };
  return supabaseJson(env, '/rest/v1/campaign_activity_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(logs),
  });
}

async function runReminderDispatchJob(env, options) {
  const range = ymdRangeUtc(options.runDate || '');
  if (!range) {
    return { ok: false, error: 'Invalid runDate for reminder dispatch.' };
  }

  const lookup = await supabaseJson(
    env,
    '/rest/v1/campaign_reminders?select=id,content_id,user_id,reminder_type,scheduled_for,status,campaign_content_items(id,title,status,scheduled_for,archived_at,posting_owner_id)'
      + '&status=eq.pending'
      + '&scheduled_for=gte.' + encodeURIComponent(range.startIso)
      + '&scheduled_for=lt.' + encodeURIComponent(range.endIso)
      + '&order=scheduled_for.asc'
      + '&limit=' + REMINDER_BATCH_LIMIT,
  );

  if (!lookup.ok) {
    return { ok: false, error: 'Failed to load reminders: ' + lookup.text };
  }

  const reminders = Array.isArray(lookup.data) ? lookup.data : [];
  const result = {
    inspected: reminders.length,
    sent: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
    errors: [],
  };

  const activityLogs = [];

  for (const reminder of reminders) {
    const content = reminder.campaign_content_items || null;
    const dueContentInvalid = !content || content.status !== 'claimed' || !!content.archived_at;

    if (dueContentInvalid) {
      if (!options.dryRun) {
        const cancelled = await updateReminderState(env, reminder.id, {
          status: 'cancelled',
          failure_reason: 'content-no-longer-claimable',
        });
        if (!cancelled.ok) {
          result.failed += 1;
          result.errors.push('cancel ' + reminder.id + ': ' + cancelled.text);
          continue;
        }
      }
      result.cancelled += 1;
      continue;
    }

    const enabled = channelEnabled(reminder.reminder_type, env);
    if (!enabled) {
      if (!options.dryRun) {
        const failed = await updateReminderState(env, reminder.id, {
          status: 'failed',
          failure_reason: 'channel-disabled-' + reminder.reminder_type,
        });
        if (!failed.ok) {
          result.failed += 1;
          result.errors.push('fail ' + reminder.id + ': ' + failed.text);
          continue;
        }
      }
      result.failed += 1;
      activityLogs.push({
        entity_type: 'campaign-content',
        entity_id: reminder.content_id,
        action_type: 'reminder-failed',
        performed_by: reminder.user_id,
        metadata: {
          reminder_id: reminder.id,
          reminder_type: reminder.reminder_type,
          reason: 'channel-disabled',
          scheduled_for: reminder.scheduled_for,
        },
      });
      continue;
    }

    if (!options.dryRun) {
      const sent = await updateReminderState(env, reminder.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      if (!sent.ok) {
        result.failed += 1;
        result.errors.push('sent ' + reminder.id + ': ' + sent.text);
        continue;
      }
    }

    result.sent += 1;
    activityLogs.push({
      entity_type: 'campaign-content',
      entity_id: reminder.content_id,
      action_type: 'reminder-sent',
      performed_by: reminder.user_id,
      metadata: {
        reminder_id: reminder.id,
        reminder_type: reminder.reminder_type,
        scheduled_for: reminder.scheduled_for,
      },
    });
  }

  if (!options.dryRun && activityLogs.length > 0) {
    const inserted = await insertActivityLogs(env, activityLogs);
    if (!inserted.ok) {
      result.errors.push('activity logs: ' + inserted.text);
    }
  }

  return {
    ok: true,
    ...result,
  };
}

function buildInFilter(values) {
  if (!Array.isArray(values) || values.length === 0) return '';
  return '(' + values.map((value) => `\"${String(value).replaceAll('\"', '\\\"')}\"`).join(',') + ')';
}

async function runMissedDetectionJob(env, options) {
  const graceMinutes = Number.parseInt(asString(env.CAMPAIGN_MISSED_GRACE_MINUTES || ''), 10);
  const effectiveGraceMinutes = Number.isFinite(graceMinutes) && graceMinutes >= 0 ? graceMinutes : 90;

  const now = new Date();
  const threshold = new Date(now.getTime() - effectiveGraceMinutes * 60 * 1000).toISOString();

  const lookup = await supabaseJson(
    env,
    '/rest/v1/campaign_content_items?select=id,scheduled_for,posting_owner_id,status,archived_at'
      + '&status=eq.claimed'
      + '&scheduled_for=lt.' + encodeURIComponent(threshold)
      + '&order=scheduled_for.asc'
      + '&limit=' + MISSED_BATCH_LIMIT,
  );

  if (!lookup.ok) {
    return { ok: false, error: 'Failed to load claimed content for missed detection: ' + lookup.text };
  }

  const rows = (Array.isArray(lookup.data) ? lookup.data : []).filter((row) => !row.archived_at);
  const candidateIds = rows.map((row) => row.id);
  const result = {
    inspected: rows.length,
    newly_missed: 0,
    already_marked: 0,
    errors: [],
  };

  if (candidateIds.length === 0) return { ok: true, ...result };

  const existingLookup = await supabaseJson(
    env,
    '/rest/v1/campaign_activity_log?select=entity_id'
      + '&entity_type=eq.campaign-content'
      + '&action_type=eq.content-missed-detected'
      + '&entity_id=in.' + encodeURIComponent(buildInFilter(candidateIds)),
  );

  if (!existingLookup.ok) {
    return { ok: false, error: 'Failed to load existing missed logs: ' + existingLookup.text };
  }

  const existingRows = Array.isArray(existingLookup.data) ? existingLookup.data : [];
  const existingSet = new Set(existingRows.map((row) => row.entity_id));

  const toInsert = [];
  for (const row of rows) {
    if (existingSet.has(row.id)) {
      result.already_marked += 1;
      continue;
    }
    result.newly_missed += 1;
    toInsert.push({
      entity_type: 'campaign-content',
      entity_id: row.id,
      action_type: 'content-missed-detected',
      performed_by: row.posting_owner_id || null,
      metadata: {
        scheduled_for: row.scheduled_for,
        grace_minutes: effectiveGraceMinutes,
        detected_at: now.toISOString(),
      },
    });
  }

  if (!options.dryRun && toInsert.length > 0) {
    const inserted = await insertActivityLogs(env, toInsert);
    if (!inserted.ok) {
      result.errors.push(inserted.text);
    }
  }

  return { ok: true, ...result };
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

  const secretAuth = validateJobSecret(request, env);
  let trigger = null;

  if (secretAuth.ok) {
    trigger = { source: secretAuth.reason, actor: null };
  } else {
    const manualAuth = await authorizeManualActor(request, env, body);
    if (!manualAuth.ok) return errorResponse(manualAuth.error, manualAuth.status || 403);
    trigger = { source: 'manual-actor', actor: manualAuth.actor };
  }

  const action = asString(body.action || 'all') || 'all';
  const dryRun = !!body.dryRun;
  const runDate = asString(body.runDate || body.run_date || '');

  const output = {
    ok: true,
    action,
    dry_run: dryRun,
    trigger_source: trigger.source,
    actor_user_id: trigger.actor?.user_id || null,
    jobs: {},
  };

  if (action === 'all' || action === 'dispatch-reminders') {
    const reminders = await runReminderDispatchJob(env, { dryRun, runDate });
    output.jobs.reminders = reminders;
    if (!reminders.ok) return errorResponse(reminders.error || 'Reminder dispatch failed.', 500);
  }

  if (action === 'all' || action === 'detect-missed') {
    const missed = await runMissedDetectionJob(env, { dryRun, runDate });
    output.jobs.missed_posts = missed;
    if (!missed.ok) return errorResponse(missed.error || 'Missed detection failed.', 500);
  }

  if (action !== 'all' && action !== 'dispatch-reminders' && action !== 'detect-missed') {
    return errorResponse('Unknown action: ' + action, 400);
  }

  return jsonResponse(output);
}
