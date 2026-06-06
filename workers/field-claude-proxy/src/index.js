// field-claude-proxy — Cloudflare Worker v8
// Source of truth: workers/field-claude-proxy/src/index.js
// Auto-deployed via .github/workflows/deploy-proxy.yml on push to workers/**
//
// CHANGES IN v8 (May 31 2026):
//   Model: gemini-2.5-flash-lite → gemini-3.1-flash-lite (GA May 7 2026)
//   API endpoint: v1beta (AI Studio keys require v1beta, not v1) (GA models served on v1)
//   ALLOWED_ORIGINS: added field-deploy.jeffunglesbee.workers.dev (v7)
//   hasVision: vision requests route to Claude directly (v7)
//   429 handling: FIXED — returns 429 to client, does NOT fall back to Claude
//     (v7 had fallback-to-Claude on 429 which caused all rate-limited calls
//      to silently use Claude Sonnet 4. Fixed in v8.)
//
// SECRETS (set in Cloudflare dashboard):
//   GEMINI_KEY    → aistudio.google.com → Get API key
//                   Tier 1 paid: 4,000 RPM / 4M TPM (gemini-3.1-flash-lite, verified Jun 2026)
//   ANTHROPIC_KEY → console.anthropic.com → API Keys (Claude fallback for vision/errors)
//
// VERIFY after deploy (DevTools Network tab on FIELD app):
//   X-FIELD-Proxy-Version: 8
//   X-Field-Model: gemini-3.1-flash-lite  (or claude-haiku-fallback on vision/error fallback)

const PROXY_VERSION = '9'; // v1beta restored for AI Studio keys

const ALLOWED_ORIGINS = [
  'https://jubilant-bassoon.jeffunglesbee.workers.dev',
  'https://jubilant-bassoon.pages.dev',
  'https://field-deploy.jeffunglesbee.workers.dev',
];

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});

const version = () => ({'X-FIELD-Proxy-Version': PROXY_VERSION});

function toGemini(body) {
  const sys = body.system ? body.system + '\n\n' : '';
  const msg = body.messages
    .filter(m => m.role === 'user')
    .map(m => typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '')
    .join('\n');
  return {
    systemInstruction: {
      parts: [{
        text: 'You are a sports intelligence editor. Always write complete, well-formed sentences. Never stop mid-sentence. Be concise and factual. When asked to return JSON, return ONLY valid JSON with no markdown, no backticks, and no preamble.'
      }]
    },
    contents: [{ parts: [{ text: sys + msg }] }],
    generationConfig: { maxOutputTokens: body.max_tokens || 2500, temperature: 0.4 },
  };
}

function fromGemini(data) {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.stringify({
    id: 'gemini-proxy', type: 'message', role: 'assistant',
    model: 'gemini-3.1-flash-lite',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: 0 },
  });
}

async function callGemini(body, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toGemini(body)),
  });
  if (r.status === 429) {
    const retryAfter = r.headers.get('Retry-After') || '60';
    throw {is429: true, retryAfter, detail: (await r.text().catch(() => '')).slice(0, 200)};
  }
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { text: fromGemini(await r.json()), model: 'gemini-3.1-flash-lite', status: 200 };
}

async function callClaude(raw, key) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: raw,
  });
  return { text: await r.text(), model: 'claude-haiku-fallback', status: r.status };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      if (!ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });
      return new Response(null, { status: 204, headers: {...cors(origin), ...version()} });
    }

    if (request.method !== 'POST')
      return new Response('Method not allowed', { status: 405, headers: version() });

    const relayAuth = request.headers.get('X-FIELD-Relay') || '';
    const isRelay = relayAuth === (env.RELAY_SHARED_SECRET || 'field-relay-cron-2026');
    if (!isRelay && !ALLOWED_ORIGINS.includes(origin))
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...version() },
      });

    const gKey = env.GEMINI_KEY || '';
    const aKey = env.ANTHROPIC_KEY || '';

    if (!gKey && !aKey)
      return new Response(JSON.stringify({ error: 'No AI backend configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() } });

    const raw = await request.text().catch(() => null);
    if (!raw) return new Response(JSON.stringify({ error: 'Empty body' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() },
    });

    // Vision requests route directly to Claude (Gemini vision requires different handling)
    let bodyParsed;
    try { bodyParsed = JSON.parse(raw); } catch { bodyParsed = null; }
    const hasVision = bodyParsed?.messages?.some(
      (m) => Array.isArray(m.content) && m.content.some((c) => c.type === 'image')
    );

    let result;

    if (gKey && !hasVision) {
      try {
        result = await callGemini(JSON.parse(raw), gKey);
      } catch (e) {
        if (e.is429) {
          // 429: return rate limit to client — do NOT fall back to Claude.
          // The browser's _jqDelay() RPM guard handles retries.
          // Falling back to Claude on every 429 silently routes all
          // rate-limited calls to paid Claude (v7 bug — fixed in v8).
          return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: e.retryAfter }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': e.retryAfter, ...cors(origin), ...version() },
          });
        }
        // Non-429 Gemini error: fall back to Claude
        if (aKey) {
          try { result = await callClaude(raw, aKey); }
          catch (e2) {
            return new Response(JSON.stringify({ error: 'Both backends failed.' }), {
              status: 502, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: `Gemini failed: ${e.message}` }), {
            status: 502, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() },
          });
        }
      }
    } else if (aKey) {
      // No Gemini key, or vision request: use Claude
      try { result = await callClaude(raw, aKey); }
      catch (e) {
        return new Response(JSON.stringify({ error: `Claude failed: ${e.message}` }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'No backend available for this request.' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors(origin), ...version() },
      });
    }

    return new Response(result.text, {
      status: result.status,
      headers: { 'Content-Type': 'application/json', 'X-Field-Model': result.model, ...cors(origin), ...version() },
    });
  },
};
