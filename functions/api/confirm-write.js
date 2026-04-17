// POST /api/confirm-write
// Body: { accountId?, payload: ParsedDocument|ParsedImage, section?: string, dryRun?: boolean }
// Returns: { conflicts: [], summary: {}, written: boolean }
// dryRun=true: conflict-check only, no write.

import { jsonResponse, errorResponse } from './_shared/ai.js';

async function fetchAccountData(supabaseUrl, supabaseKey, accountId) {
  const tables = ['notes', 'actions', 'people', 'opportunities', 'projects'];
  const results = {};

  await Promise.all(tables.map(async (table) => {
    const res = await fetch(
      supabaseUrl + '/rest/v1/' + table + '?account_id=eq.' + accountId,
      { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
    );
    results[table] = res.ok ? await res.json() : [];
  }));

  return results;
}

function detectConflicts(existing, payload) {
  const conflicts = [];

  if (payload.metadata && existing.notes) {
    const inTitle = (payload.metadata.title || '').toLowerCase();
    const inDate = payload.metadata.date;
    const dup = existing.notes.find(n =>
      (n.title || '').toLowerCase() === inTitle &&
      (!inDate || n.date === inDate)
    );
    if (dup) {
      conflicts.push({ section: 'notes', field: 'title', existing: dup.title, incoming: payload.metadata.title });
    }
  }

  if (payload.updates && payload.updates.people && existing.people) {
    payload.updates.people.forEach(p => {
      const match = existing.people.find(e =>
        (e.name || '').toLowerCase() === (p.name || '').toLowerCase()
      );
      if (match) {
        if (p.role && match.role && p.role !== match.role) {
          conflicts.push({ section: 'people', field: 'role', name: p.name, existing: match.role, incoming: p.role });
        }
        if (p.department && match.department && p.department !== match.department) {
          conflicts.push({ section: 'people', field: 'department', name: p.name, existing: match.department, incoming: p.department });
        }
      }
    });
  }

  return conflicts;
}

async function writePayload(supabaseUrl, supabaseKey, accountId, payload) {
  const writes = [];
  const newId = () => crypto.randomUUID();
  const now = new Date().toISOString();

  if (payload.metadata && (payload.notes || payload.decisions)) {
    const noteRecord = {
      note_id: newId(),
      account_id: accountId,
      title: payload.metadata.title || 'Meeting Notes',
      date: payload.metadata.date || now.slice(0, 10),
      attendees: JSON.stringify(payload.metadata.attendees || []),
      content: JSON.stringify({ notes: payload.notes || [], decisions: payload.decisions || [] }),
      created_date: now,
    };
    writes.push(fetch(supabaseUrl + '/rest/v1/notes', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(noteRecord),
    }));
  }

  if (payload.actions && payload.actions.length > 0) {
    const actionRecords = payload.actions.map(a => ({
      action_id: newId(),
      account_id: accountId,
      task: a.task,
      owner: a.owner || null,
      due_date: a.due || null,
      status: 'Open',
      created_date: now,
    }));
    writes.push(fetch(supabaseUrl + '/rest/v1/actions', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(actionRecords),
    }));
  }

  const incomingPeople = (payload.updates && payload.updates.people) || (payload.people) || [];
  if (incomingPeople.length > 0) {
    const peopleRecords = incomingPeople.map(p => ({
      person_id: newId(),
      account_id: accountId,
      name: p.name,
      role: p.role || null,
      department: p.department || null,
      reports_to_name: p.reports_to || null,
      tag: p.tag || null,
      sentiment: p.sentiment || 'Unknown',
      created_date: now,
    }));
    writes.push(fetch(supabaseUrl + '/rest/v1/people', {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(peopleRecords),
    }));
  }

  await Promise.all(writes);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { accountId, payload, section, dryRun = false } = body;

  if (!payload) return errorResponse('payload required', 400);
  if (!section && !accountId) return errorResponse('accountId or section required', 400);

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return errorResponse('Supabase not configured', 503);

  let existing;
  try {
    existing = await fetchAccountData(supabaseUrl, supabaseKey, accountId);
  } catch (e) {
    return errorResponse('Failed to fetch existing data: ' + e.message);
  }

  const conflicts = detectConflicts(existing, payload);
  const summary = {
    notes: payload.notes ? payload.notes.length : 0,
    decisions: payload.decisions ? payload.decisions.length : 0,
    actions: payload.actions ? payload.actions.length : 0,
    people: (payload.updates && payload.updates.people) ? payload.updates.people.length : (payload.people ? payload.people.length : 0),
  };

  if (dryRun || conflicts.length > 0) {
    return jsonResponse({ conflicts, summary, written: false });
  }

  try {
    await writePayload(supabaseUrl, supabaseKey, accountId, payload);
  } catch (e) {
    return errorResponse('Write failed: ' + e.message);
  }

  return jsonResponse({ conflicts: [], summary, written: true });
}
