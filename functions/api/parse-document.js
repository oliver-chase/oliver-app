// POST /api/parse-document
// Body: { text: string, filename: string, accountContext: object }
// Returns: { result: ParsedDocument, model: string }

import { getAiConfig, callAnthropic, jsonResponse, errorResponse } from './_shared/ai.js';

const EXTRACT_SYSTEM = `You are a senior operator embedded in the V.Two Ops dashboard.
You have read every document, attended every meeting, and know every stakeholder.
Read every word of the provided transcript before extracting anything.
Return ONLY valid JSON matching the schema below. No prose, no markdown fences.

Schema:
{
  "metadata": { "title": string, "date": string, "attendees": string[] },
  "notes": [{ "topic": string, "content": string, "speaker": string|null }],
  "decisions": [{ "decision": string, "context": string|null }],
  "actions": [{ "task": string, "owner": string|null, "due": string|null }],
  "assignments": [{ "person": string, "items": string[] }],
  "updates": {
    "people": [{ "name": string, "role": string|null, "department": string|null, "sentiment": string|null }],
    "projects": [{ "name": string, "status": string|null, "notes": string|null }],
    "opportunities": [{ "name": string, "status": string|null, "notes": string|null }],
    "org": [{ "name": string, "reports_to": string|null }]
  }
}

Rules — never break these:
- Read every line before extracting. Partial reads produce wrong conclusions.
- Deduplicate: one entry per topic. If a topic appears multiple times, consolidate.
- Infer ownership from natural language: "I'll take that", "that's on [name]", "can you handle", "we said [name] would".
- Preserve the speaker's exact phrasing in action items and decisions. Do not paraphrase.
- A decision is only a decision if someone said yes. Unresolved discussion = note, not decision.
- Risk and relationship notes: if concern, hesitation, friction, or political dynamics appear — capture them.
- If a field cannot be determined, return null — never guess, never omit the key.
- date: ISO 8601 if determinable, otherwise null.
- No buzzwords. No filler. No summary prose. Schema only.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { text, filename } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return errorResponse('text field required', 400);
  }

  if (text.length > 80000) {
    return errorResponse('Document too large (max 80,000 characters)', 413);
  }

  let config;
  try {
    config = await getAiConfig(env);
  } catch (e) {
    return errorResponse('Failed to load AI config: ' + e.message);
  }

  if (!config.apiKey) {
    return errorResponse('No Anthropic API key configured', 503);
  }

  const userContent = (filename ? 'File: ' + filename + '\n\n' : '') + text;

  let result;
  try {
    result = await callAnthropic({
      apiKey: config.apiKey,
      fallbackKey: config.fallbackKey,
      model: config.model,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 4096,
    });
  } catch (e) {
    return errorResponse('AI call failed: ' + e.message);
  }

  let parsed;
  try {
    const clean = result.text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    return errorResponse('AI returned invalid JSON: ' + e.message);
  }

  return jsonResponse({ result: parsed, model: result.model });
}
