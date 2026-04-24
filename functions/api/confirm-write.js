// POST /api/confirm-write
// Body: { accountId: string, payload: ParsedDocument|ParsedImage, dryRun?: boolean }
// Returns: { conflicts: [], summary: {}, written: boolean }
// dryRun=true: conflict-check only, no write.

import { jsonResponse, errorResponse } from './_shared/ai.js';

const ACCOUNT_TABLES = ['notes', 'actions', 'stakeholders', 'opportunities', 'projects'];

function resolveSupabaseUrl(env) {
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || null;
}

function resolveServiceKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY || null;
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

function assertSupabaseConfigured(env) {
  if (!resolveSupabaseUrl(env)) {
    return errorResponse('Supabase URL not configured for /api/confirm-write.', 503);
  }
  if (!resolveServiceKey(env)) {
    return errorResponse('Supabase key not configured for /api/confirm-write.', 503);
  }
  return null;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function boolString(value) {
  return value ? 'true' : '';
}

function inferExecutive(title) {
  return /\b(ceo|cfo|cto|coo|ciso|cmo|cro|president|founder|owner|chief|evp|svp|vice president|vp)\b/i.test(title || '');
}

function mapSentiment(value) {
  const normalized = lower(value);
  if (normalized === 'champion') return 'Champion';
  if (normalized === 'supporter') return 'Supporter';
  if (normalized === 'neutral') return 'Neutral';
  if (normalized === 'detractor') return 'Detractor';
  return 'Unknown';
}

function mapProjectStatus(value) {
  const normalized = lower(value);
  if (normalized.includes('complete') || normalized.includes('done') || normalized.includes('closed')) return 'Complete';
  if (normalized.includes('hold') || normalized.includes('blocked')) return 'On Hold';
  return 'Active';
}

function mapOpportunityStatus(value) {
  const normalized = lower(value);
  if (normalized.includes('won') || normalized.includes('closed positive')) return 'Won';
  if (normalized.includes('lost') || normalized.includes('closed negative') || normalized.includes('no reply') || normalized.includes('bounced')) return 'Lost';
  if (normalized.includes('pursu') || normalized.includes('active')) return 'Pursuing';
  return 'Identified';
}

function nonEmptyLines(lines) {
  return lines.map(line => normalizeText(line)).filter(Boolean);
}

function buildTemplateData(payload) {
  const sections = [];
  const attendees = Array.isArray(payload.metadata?.attendees) ? payload.metadata.attendees.map(normalizeText).filter(Boolean) : [];
  if (attendees.length > 0) {
    sections.push({
      heading: 'Attendees',
      bullets: attendees.map(text => ({ text, indent: 0 })),
    });
  }

  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  notes.forEach((note) => {
    const heading = normalizeText(note.topic) || 'Discussion';
    const content = normalizeText(note.content);
    if (!content) return;
    const speaker = normalizeText(note.speaker);
    sections.push({
      heading,
      bullets: [{ text: speaker ? speaker + ': ' + content : content, indent: 0 }],
    });
  });

  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  if (decisions.length > 0) {
    sections.push({
      heading: 'Decisions',
      bullets: decisions
        .map((decision) => {
          const text = normalizeText(decision.decision);
          const context = normalizeText(decision.context);
          if (!text) return null;
          return { text: context ? text + ' — ' + context : text, indent: 0 };
        })
        .filter(Boolean),
    });
  }

  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  if (actions.length > 0) {
    sections.push({
      heading: 'Action Items',
      bullets: actions
        .map((action) => {
          const task = normalizeText(action.task);
          if (!task) return null;
          const owner = normalizeText(action.owner);
          const due = normalizeText(action.due);
          const suffix = [owner ? 'owner ' + owner : '', due ? 'due ' + due : ''].filter(Boolean).join(' · ');
          return { text: suffix ? task + ' (' + suffix + ')' : task, indent: 0 };
        })
        .filter(Boolean),
    });
  }

  return JSON.stringify({ sections: sections.filter(section => Array.isArray(section.bullets) && section.bullets.length > 0) });
}

function buildNoteBody(payload) {
  const lines = [];
  if (normalizeText(payload.metadata?.title)) lines.push(payload.metadata.title);
  if (normalizeText(payload.metadata?.date)) lines.push('Date: ' + payload.metadata.date);

  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  notes.forEach((note) => {
    const topic = normalizeText(note.topic);
    const content = normalizeText(note.content);
    const speaker = normalizeText(note.speaker);
    if (!content) return;
    lines.push((topic ? topic + ': ' : '') + (speaker ? speaker + ' — ' : '') + content);
  });

  const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  decisions.forEach((decision) => {
    const text = normalizeText(decision.decision);
    if (text) lines.push('Decision: ' + text);
  });

  return nonEmptyLines(lines).join('\n');
}

function mergePeoplePayload(payload) {
  const merged = new Map();

  const apply = (raw) => {
    const name = normalizeText(raw.name);
    if (!name) return;
    const key = lower(name);
    const existing = merged.get(key) || {
      name,
      title: '',
      department: '',
      reports_to_name: '',
      tag: '',
      sentiment: '',
    };
    existing.name = name;
    existing.title = normalizeText(raw.title || raw.role) || existing.title;
    existing.department = normalizeText(raw.department) || existing.department;
    existing.reports_to_name = normalizeText(raw.reports_to) || existing.reports_to_name;
    existing.tag = normalizeText(raw.tag) || existing.tag;
    existing.sentiment = normalizeText(raw.sentiment) || existing.sentiment;
    merged.set(key, existing);
  };

  const directPeople = Array.isArray(payload.people) ? payload.people : [];
  directPeople.forEach(apply);

  const updatedPeople = Array.isArray(payload.updates?.people) ? payload.updates.people : [];
  updatedPeople.forEach(apply);

  const orgLinks = Array.isArray(payload.updates?.org) ? payload.updates.org : [];
  orgLinks.forEach(apply);

  return Array.from(merged.values());
}

async function fetchJsonOrText(response) {
  const text = await response.text().catch(() => '');
  if (!text) return '';
  try { return JSON.parse(text); } catch (_) { return text; }
}

async function fetchAccountData(supabaseUrl, env, accountId) {
  const results = {};
  await Promise.all(ACCOUNT_TABLES.map(async (table) => {
    const res = await fetch(
      supabaseUrl + '/rest/v1/' + table + '?account_id=eq.' + encodeURIComponent(accountId),
      { headers: serviceHeaders(env) },
    );
    if (!res.ok) {
      const body = await fetchJsonOrText(res);
      throw new Error('[confirm-write] fetch ' + table + ' failed: ' + (typeof body === 'string' ? body : JSON.stringify(body)));
    }
    results[table] = await res.json().catch(() => []);
  }));
  return results;
}

function detectConflicts(existing, payload) {
  const conflicts = [];

  const title = lower(payload.metadata?.title);
  const date = normalizeText(payload.metadata?.date);
  if (title && Array.isArray(existing.notes)) {
    const dup = existing.notes.find((note) => lower(note.title) === title && (!date || note.date === date));
    if (dup) {
      conflicts.push({
        section: 'notes',
        field: 'title',
        existing: dup.title || '',
        incoming: payload.metadata?.title || '',
      });
    }
  }

  const importedPeople = mergePeoplePayload(payload);
  if (Array.isArray(existing.stakeholders)) {
    importedPeople.forEach((person) => {
      const match = existing.stakeholders.find((stakeholder) => lower(stakeholder.name) === lower(person.name));
      if (!match) return;
      if (person.title && match.title && lower(person.title) !== lower(match.title)) {
        conflicts.push({ section: 'stakeholders', field: 'title', existing: match.title, incoming: person.title, name: person.name });
      }
      if (person.department && match.department && lower(person.department) !== lower(match.department)) {
        conflicts.push({ section: 'stakeholders', field: 'department', existing: match.department, incoming: person.department, name: person.name });
      }
    });
  }

  const projectUpdates = Array.isArray(payload.updates?.projects) ? payload.updates.projects : [];
  if (Array.isArray(existing.projects)) {
    projectUpdates.forEach((project) => {
      const name = normalizeText(project.name);
      if (!name) return;
      const match = existing.projects.find((row) => lower(row.project_name) === lower(name));
      const incomingStatus = mapProjectStatus(project.status);
      if (match && match.status && lower(match.status) !== lower(incomingStatus)) {
        conflicts.push({ section: 'projects', field: 'status', existing: match.status, incoming: incomingStatus, name });
      }
    });
  }

  const opportunityUpdates = Array.isArray(payload.updates?.opportunities) ? payload.updates.opportunities : [];
  if (Array.isArray(existing.opportunities)) {
    opportunityUpdates.forEach((opportunity) => {
      const name = normalizeText(opportunity.name);
      if (!name) return;
      const match = existing.opportunities.find((row) => lower(row.description) === lower(name));
      const incomingStatus = mapOpportunityStatus(opportunity.status);
      if (match && match.status && lower(match.status) !== lower(incomingStatus)) {
        conflicts.push({ section: 'opportunities', field: 'status', existing: match.status, incoming: incomingStatus, name });
      }
    });
  }

  return conflicts;
}

function buildSummary(payload) {
  return {
    notes: Array.isArray(payload.notes) ? payload.notes.length : 0,
    decisions: Array.isArray(payload.decisions) ? payload.decisions.length : 0,
    actions: Array.isArray(payload.actions) ? payload.actions.length : 0,
    people: mergePeoplePayload(payload).length,
    projects: Array.isArray(payload.updates?.projects) ? payload.updates.projects.filter((project) => normalizeText(project.name)).length : 0,
    opportunities: Array.isArray(payload.updates?.opportunities) ? payload.updates.opportunities.filter((opportunity) => normalizeText(opportunity.name)).length : 0,
  };
}

async function restWrite(supabaseUrl, env, table, method, body, query = '') {
  const response = await fetch(
    supabaseUrl + '/rest/v1/' + table + query,
    {
      method,
      headers: serviceHeaders(env, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const payload = await fetchJsonOrText(response);
    throw new Error(table + ' write failed: ' + (typeof payload === 'string' ? payload : JSON.stringify(payload)));
  }
  return response.json().catch(() => []);
}

async function writePayload(supabaseUrl, env, accountId, payload, existing) {
  const now = new Date().toISOString();
  const todayIso = now.slice(0, 10);

  if (payload.metadata || (Array.isArray(payload.notes) && payload.notes.length > 0) || (Array.isArray(payload.decisions) && payload.decisions.length > 0)) {
    const noteRecord = {
      note_id: 'NOTE-' + crypto.randomUUID(),
      account_id: accountId,
      engagement_id: '',
      date: normalizeText(payload.metadata?.date) || todayIso,
      type: 'Meeting',
      title: normalizeText(payload.metadata?.title) || 'Meeting Notes',
      template_data: buildTemplateData(payload),
      body: buildNoteBody(payload),
      transcript_link: '',
      created_date: now,
      last_updated: now,
    };
    await restWrite(supabaseUrl, env, 'notes', 'POST', noteRecord);
  }

  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  if (actions.length > 0) {
    const actionRecords = actions
      .map((action) => {
        const description = normalizeText(action.task);
        if (!description) return null;
        return {
          action_id: 'ACT-' + crypto.randomUUID(),
          account_id: accountId,
          engagement_id: '',
          description,
          owner: normalizeText(action.owner),
          status: 'Open',
          closed_date: '',
          created_date: now,
          last_updated: now,
        };
      })
      .filter(Boolean);
    if (actionRecords.length > 0) await restWrite(supabaseUrl, env, 'actions', 'POST', actionRecords);
  }

  const importedPeople = mergePeoplePayload(payload);
  if (importedPeople.length > 0) {
    const existingByName = new Map((existing.stakeholders || []).map((stakeholder) => [lower(stakeholder.name), stakeholder]));
    const stakeholderIdsByName = new Map((existing.stakeholders || []).map((stakeholder) => [lower(stakeholder.name), stakeholder.stakeholder_id]));

    importedPeople.forEach((person) => {
      if (!stakeholderIdsByName.has(lower(person.name))) {
        stakeholderIdsByName.set(lower(person.name), 'SH-' + crypto.randomUUID());
      }
    });

    const stakeholderRecords = importedPeople.map((person) => {
      const match = existingByName.get(lower(person.name));
      const tagNote = person.tag ? 'Import tag: ' + person.tag : '';
      const existingNotes = normalizeText(match?.notes);
      const mergedNotes = [existingNotes, tagNote].filter(Boolean).join('\n');
      return {
        stakeholder_id: match?.stakeholder_id || stakeholderIdsByName.get(lower(person.name)),
        account_id: accountId,
        engagement_id: '',
        name: person.name,
        title: person.title || match?.title || '',
        department: person.department || match?.department || '',
        organization: match?.organization || '',
        is_executive: boolString(inferExecutive(person.title || match?.title || '')),
        sentiment: mapSentiment(person.sentiment || match?.sentiment),
        primary_owner: match?.primary_owner || '',
        secondary_owner: match?.secondary_owner || '',
        reports_to: lower(person.reports_to_name) ? (stakeholderIdsByName.get(lower(person.reports_to_name)) || match?.reports_to || '') : (match?.reports_to || ''),
        notes: mergedNotes,
        created_date: match?.created_date || now,
        last_updated: now,
      };
    });

    await restWrite(supabaseUrl, env, 'stakeholders', 'POST', stakeholderRecords);
  }

  const projectUpdates = Array.isArray(payload.updates?.projects) ? payload.updates.projects : [];
  if (projectUpdates.length > 0) {
    const existingByName = new Map((existing.projects || []).map((project) => [lower(project.project_name), project]));
    const projectRecords = projectUpdates
      .map((project) => {
        const name = normalizeText(project.name);
        if (!name) return null;
        const match = existingByName.get(lower(name));
        return {
          project_id: match?.project_id || 'PROJ-' + crypto.randomUUID(),
          account_id: accountId,
          engagement_id: '',
          project_name: name,
          status: mapProjectStatus(project.status || match?.status),
          client_stakeholder_ids: match?.client_stakeholder_ids || [],
          notes: normalizeText(project.notes) || match?.notes || '',
          year: match?.year || String(new Date().getFullYear()),
          created_date: match?.created_date || now,
          last_updated: now,
        };
      })
      .filter(Boolean);
    if (projectRecords.length > 0) await restWrite(supabaseUrl, env, 'projects', 'POST', projectRecords);
  }

  const opportunityUpdates = Array.isArray(payload.updates?.opportunities) ? payload.updates.opportunities : [];
  if (opportunityUpdates.length > 0) {
    const existingByName = new Map((existing.opportunities || []).map((opportunity) => [lower(opportunity.description), opportunity]));
    const opportunityRecords = opportunityUpdates
      .map((opportunity) => {
        const name = normalizeText(opportunity.name);
        if (!name) return null;
        const match = existingByName.get(lower(name));
        return {
          opportunity_id: match?.opportunity_id || 'OPP-' + crypto.randomUUID(),
          account_id: accountId,
          engagement_id: '',
          description: name,
          status: mapOpportunityStatus(opportunity.status || match?.status),
          owners: match?.owners || [],
          value: match?.value || '',
          close_date: match?.close_date || '',
          year: match?.year || String(new Date().getFullYear()),
          notes: normalizeText(opportunity.notes) || match?.notes || '',
          created_date: match?.created_date || now,
          last_updated: now,
        };
      })
      .filter(Boolean);
    if (opportunityRecords.length > 0) await restWrite(supabaseUrl, env, 'opportunities', 'POST', opportunityRecords);
  }
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

  const { accountId, payload, dryRun = false } = body;
  if (!accountId || typeof accountId !== 'string') return errorResponse('accountId required', 400);
  if (!payload || typeof payload !== 'object') return errorResponse('payload required', 400);

  const supabaseUrl = resolveSupabaseUrl(env);

  let existing;
  try {
    existing = await fetchAccountData(supabaseUrl, env, accountId);
  } catch (e) {
    return errorResponse('Failed to fetch existing account data: ' + e.message, 502);
  }

  const conflicts = detectConflicts(existing, payload);
  const summary = buildSummary(payload);

  if (dryRun || conflicts.length > 0) {
    return jsonResponse({ conflicts, summary, written: false });
  }

  try {
    await writePayload(supabaseUrl, env, accountId, payload, existing);
  } catch (e) {
    return errorResponse('Write failed: ' + e.message, 502);
  }

  return jsonResponse({ conflicts: [], summary, written: true, message: 'Import saved to the account workspace.' });
}
