// POST /api/parse-image
// Body: { imageBase64: string, mediaType: string, contextInstruction: string }
// Returns: { result: ParsedImage, model: string }

import { getAiConfig, callAnthropic, jsonResponse, errorResponse } from './_shared/ai.js';

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EXTRACT_SYSTEM = `You are an org chart and directory extraction agent.
Analyze the image and extract all visible people records.
Return ONLY valid JSON matching the schema below. No prose, no markdown fences.

Schema:
{
  "people": [
    {
      "name": string,
      "title": string|null,
      "department": string|null,
      "reports_to": string|null,
      "tag": string|null
    }
  ],
  "org_notes": string|null
}

Rules:
- Extract every visible name, title, and department from the image.
- Infer reporting relationships from visual hierarchy (top = manager, direct children = reports).
- Apply any contextual instruction provided by the user as the "tag" field on all extracted records.
- If a field is not visible, use null.
- org_notes: brief description of any org structure observations.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse('Invalid JSON body', 400);
  }

  const { imageBase64, mediaType, contextInstruction } = body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return errorResponse('imageBase64 field required', 400);
  }

  const mt = mediaType || 'image/jpeg';
  if (!VALID_MEDIA_TYPES.includes(mt)) {
    return errorResponse('Unsupported media type. Use jpeg, png, gif, or webp.', 400);
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

  const userContent = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mt, data: imageBase64 },
    },
  ];

  if (contextInstruction) {
    userContent.push({
      type: 'text',
      text: 'Context instruction: ' + contextInstruction,
    });
  }

  let result;
  try {
    result = await callAnthropic({
      apiKey: config.apiKey,
      fallbackKey: config.fallbackKey,
      model: config.model,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 2048,
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
