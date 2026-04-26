// POST /api/chat
// Body: { messages: [{role, content}], pageContext: string, accountData: object, conversationPath: object | null }
// Returns: { reply: string, model: string, timestamp: string }

import { getAiConfig, callAnthropic, jsonResponse, errorResponse } from './_shared/ai.js';

const MODULE_PATTERNS = {
  accounts: /\b(account planning|account list|portfolio|stakeholder|org chart|meeting transcript|opportunit(?:y|ies)|project(?:s)?)\b/i,
  hr: /\b(hr|people ops|candidate|applicant|interview|employee|onboard(?:ing)?|offboard(?:ing)?|device inventory|assignment)\b/i,
  sdr: /\b(sdr|prospect|lead|outreach|approval queue|draft email|reply rate|pipeline updates?)\b/i,
  slides: /\b(slide|slides|presentation|deck|html import|component json)\b/i,
  reviews: /\b(self-?led growth|growth review|review packet|focus area|focus areas|quarterly prompt|annual self review|performance review)\b/i,
  campaigns: /\b(campaign|content library|review queue|unclaimed content|claim content|mark as posted|posting reminder|ics|campaign report)\b/i,
  crm: /\b(crm|business development|bd roadmap|deal pipeline|proposal)\b/i,
  admin: /\b(admin|permission|access control|design token|token editor|component library|user manager)\b/i,
};

const MODULE_LABELS = {
  accounts: 'Account Strategy & Planning',
  hr: 'HR & People Ops',
  sdr: 'SDR & Outreach',
  slides: 'Slide Editor',
  reviews: 'Self-Led Growth & Review',
  campaigns: 'Campaign Content & Posting',
  crm: 'CRM & Business Development',
  admin: 'Admin',
};

const MODULE_DISCOVERABLE_BY_DEFAULT = {
  accounts: true,
  hr: true,
  sdr: true,
  slides: true,
  reviews: true,
  campaigns: true,
  crm: false,
  admin: true,
};

function parseModuleIdSet(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return new Set();
  const result = new Set();
  for (const value of rawValue.split(',')) {
    const id = value.trim().toLowerCase();
    if (MODULE_LABELS[id]) result.add(id);
  }
  return result;
}

function getDiscoverableModules(env) {
  const discoverable = new Set(
    Object.keys(MODULE_DISCOVERABLE_BY_DEFAULT).filter(moduleId => MODULE_DISCOVERABLE_BY_DEFAULT[moduleId] !== false),
  );
  const forceEnabled = parseModuleIdSet(env?.NEXT_PUBLIC_ENABLED_MODULES || env?.ENABLED_MODULES);
  const forceHubVisible = parseModuleIdSet(env?.NEXT_PUBLIC_HUB_VISIBLE_MODULES || env?.HUB_VISIBLE_MODULES);
  const disabled = parseModuleIdSet(env?.NEXT_PUBLIC_DISABLED_MODULES || env?.DISABLED_MODULES);
  for (const moduleId of forceEnabled) discoverable.add(moduleId);
  for (const moduleId of forceHubVisible) discoverable.add(moduleId);
  for (const moduleId of disabled) discoverable.delete(moduleId);
  return discoverable;
}

function buildPathScopeGuards(env) {
  const discoverableModules = getDiscoverableModules(env);
  return Object.keys(MODULE_LABELS).reduce((acc, moduleId) => {
    const guards = [];
    for (const candidateId of Object.keys(MODULE_LABELS)) {
      if (candidateId === moduleId) continue;
      const pattern = MODULE_PATTERNS[candidateId];
      if (!pattern) continue;
      guards.push({
        moduleId: candidateId,
        label: MODULE_LABELS[candidateId],
        pattern,
        discoverable: discoverableModules.has(candidateId),
      });
    }
    acc[moduleId] = guards;
    return acc;
  }, {});
}

function latestUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && msg.role === 'user' && typeof msg.content === 'string') return msg.content.trim();
  }
  return '';
}

function getScopeViolation(conversationPath, messages, env) {
  if (!conversationPath || typeof conversationPath.id !== 'string') return null;
  const text = latestUserText(messages);
  if (!text) return null;
  const pathScopeGuards = buildPathScopeGuards(env);
  const guards = pathScopeGuards[conversationPath.id] || [];

  for (const guard of guards) {
    if (!guard.pattern.test(text)) continue;
    if (!guard.discoverable) return { hidden: true };
    return { hidden: false, label: guard.label };
  }
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { messages, pageContext, accountData, conversationPath } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('messages array required', 400);
  }

  let config;
  try {
    config = await getAiConfig(env);
  } catch (e) {
    return errorResponse('Failed to load AI config: ' + e.message);
  }

  if (!config.apiKey) {
    return errorResponse('No Anthropic API key configured. Add one via the admin portal.', 503);
  }

  const scopeViolation = getScopeViolation(conversationPath, messages, env);
  if (scopeViolation) {
    const currentLabel = conversationPath?.label || pageContext || 'this module';
    return jsonResponse({
      reply: scopeViolation.hidden
        ? `This chat is scoped to ${currentLabel}. That workflow is not available in this environment.`
        : `This chat is scoped to ${currentLabel}. Open ${scopeViolation.label} to work on that workflow.`,
      model: config.model,
      timestamp: new Date().toISOString(),
    });
  }

  const systemParts = [
    'You are a senior V.Two operator embedded in the Ops dashboard.',
    'You have read every document, attended every meeting, and know every stakeholder.',
    'Your scope is limited to the current module context: ' + (pageContext || 'Account module') + '.',
    'Rules you never break: no buzzwords, no filler, no hedging, no apologies.',
    'Succinct and direct. Every sentence earns its place.',
    'Preserve exact phrasing from source material for ownership, commitments, and decisions.',
    'Do not write to the database directly. Surface information for user review.',
    'If you are unsure, say so plainly.',
  ];

  if (conversationPath && typeof conversationPath === 'object') {
    const allowedTopics = Array.isArray(conversationPath.allowedTopics)
      ? conversationPath.allowedTopics.join(', ')
      : '';
    systemParts.push('Active module: ' + (conversationPath.label || conversationPath.id || 'unknown') + '.');
    if (allowedTopics) {
      systemParts.push('Allowed topics for this module only: ' + allowedTopics + '.');
    }
    systemParts.push('If asked about another module, refuse briefly and instruct the user to open that module first.');
  }

  if (accountData) {
    systemParts.push('Current account context: ' + JSON.stringify(accountData).slice(0, 4000));
  }

  const system = systemParts.join('\n');

  let result;
  try {
    result = await callAnthropic({
      apiKey: config.apiKey,
      fallbackKey: config.fallbackKey,
      model: config.model,
      system,
      messages,
      maxTokens: 1024,
    });
  } catch (e) {
    return errorResponse('AI call failed: ' + e.message);
  }

  return jsonResponse({
    reply: result.text,
    model: result.model,
    timestamp: new Date().toISOString(),
  });
}
