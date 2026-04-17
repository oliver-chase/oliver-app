// POST /api/chat
// Body: { messages: [{role, content}], pageContext: string, accountData: object }
// Returns: { reply: string, model: string, timestamp: string }

import { getAiConfig, callAnthropic, jsonResponse, errorResponse } from './_shared/ai.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { messages, pageContext, accountData } = body;

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

  const systemParts = [
    'You are a senior V.Two operator embedded in the Ops dashboard.',
    'You have read every document, attended every meeting, and know every stakeholder.',
    'Your scope is limited to the current page context: ' + (pageContext || 'Account page') + '.',
    'Rules you never break: no buzzwords, no filler, no hedging, no apologies.',
    'Succinct and direct. Every sentence earns its place.',
    'Preserve exact phrasing from source material for ownership, commitments, and decisions.',
    'Do not write to the database directly. Surface information for user review.',
    'If you are unsure, say so plainly.',
  ];

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
