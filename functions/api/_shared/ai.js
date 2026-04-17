// Shared AI helpers for Cloudflare Pages Functions
// All endpoints use Haiku only — never Sonnet or Opus

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Fetch active API key from Supabase ai_config table.
// Falls back to env.ANTHROPIC_API_KEY if no DB record.
// Returns { apiKey, fallbackKey, model }.
export async function getAiConfig(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        supabaseUrl + '/rest/v1/ai_config?is_active=eq.true&order=created_at.desc&limit=1',
        { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows.length > 0) {
          return {
            apiKey: rows[0].api_key,
            fallbackKey: rows[0].fallback_key || null,
            model: rows[0].model || DEFAULT_MODEL,
          };
        }
      }
    } catch (_) {
      // fall through to env fallback
    }
  }

  return {
    apiKey: env.ANTHROPIC_API_KEY || null,
    fallbackKey: null,
    model: DEFAULT_MODEL,
  };
}

// Call Anthropic Messages API. Retries once with fallbackKey on auth/rate error.
export async function callAnthropic({ apiKey, fallbackKey, model, system, messages, maxTokens = 2048 }) {
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  };

  async function attempt(key) {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
    return res;
  }

  let res = await attempt(apiKey);

  if ((res.status === 401 || res.status === 429) && fallbackKey) {
    res = await attempt(fallbackKey);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Anthropic API error ' + res.status + ': ' + err);
  }

  const data = await res.json();
  return {
    text: data.content[0].text,
    model: data.model,
    usage: data.usage,
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}
