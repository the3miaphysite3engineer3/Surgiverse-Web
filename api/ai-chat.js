// Vercel serverless function: POST /api/ai-chat
// Server-side AI proxy for the AI Assistant (SovereignEG or OpenRouter).
// Replaces the client-side fetch that shipped VITE_OPENROUTER in the browser
// bundle — provider keys never leave the server.
//
// Auth model: the caller's Supabase access token is verified against
// /auth/v1/user, and every database read/write in here uses THAT token, so
// row-level security enforces the same rules as the app (attempt owner or
// staff; chat insert policy). No service key needed in this function.
//
// Provider selection (see .env.example):
//   AI_PROVIDER=sovereign | openrouter   (default: sovereign)
//   SOVEREIGN_AI_KEY / SOVEREIGN_MODEL / SOVEREIGN_BASE_URL
//   OPENROUTER_API_KEY / OPENROUTER_MODEL

const SOVEREIGN_DEFAULT_BASE = 'https://backend.sovereigneg.com/v1';
const SOVEREIGN_DEFAULT_MODEL = 'deepseek-v4-flash';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (res, status, body) => {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
};

function providerConfig(env) {
  const provider = (env.AI_PROVIDER ?? 'sovereign').toLowerCase();
  if (provider === 'sovereign' || provider === 'sovereigneg') {
    if (!env.SOVEREIGN_AI_KEY) throw new Error('SOVEREIGN_AI_KEY is not configured');
    return {
      name: 'sovereign',
      url: `${env.SOVEREIGN_BASE_URL ?? SOVEREIGN_DEFAULT_BASE}/chat/completions`,
      apiKey: env.SOVEREIGN_AI_KEY,
      model: env.SOVEREIGN_MODEL ?? SOVEREIGN_DEFAULT_MODEL,
      // SovereignEG ignores unknown fields; the reasoning envelope is
      // OpenRouter-specific.
      extraBody: {},
    };
  }
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
  return {
    name: 'openrouter',
    url: OPENROUTER_URL,
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
    extraBody: { reasoning: { enabled: true } },
  };
}

async function completeChat(env, messages, modelOverride) {
  const cfg = providerConfig(env);
  const model = modelOverride || cfg.model;
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, ...cfg.extraBody }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // SovereignEG error shape: { error: { type, code, message } }.
    const message =
      data?.error?.message ?? data?.message ?? `${cfg.name} request failed: ${res.status}`;
    throw new Error(message);
  }
  const aiMessage = data?.choices?.[0]?.message;
  return {
    content: aiMessage?.content ?? 'No response from model.',
    // OpenRouter: reasoning_details. Some OpenAI-compatible providers use
    // reasoning_content. Absent on SovereignEG — stays null.
    reasoning: aiMessage?.reasoning_details ?? aiMessage?.reasoning_content ?? null,
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204);
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Use POST { attemptId, messages, model? }' });
  }

  const env = process.env;
  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return json(res, 500, { error: 'Proxy misconfigured: missing Supabase URL/key' });
  }

  // 1. Verify the caller's Supabase access token.
  const accessToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return json(res, 401, { error: 'Unauthorized' });
  let uid;
  try {
    const check = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
    });
    if (!check.ok) return json(res, 401, { error: 'Unauthorized' });
    const user = await check.json();
    uid = user?.id;
    if (!uid) return json(res, 401, { error: 'Unauthorized' });
  } catch {
    return json(res, 503, { error: 'Auth check failed' });
  }

  // 2. Parse body.
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }
  const { attemptId, messages, model } = body ?? {};
  if (!attemptId || !Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: 'attemptId and messages[] required' });
  }

  const userHeaders = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

  try {
    // 3. Authorize via RLS: the caller can only read attempts they own or
    //    that staff policy lets them see. Empty result → forbidden/not found.
    const attemptRes = await fetch(
      `${supabaseUrl}/rest/v1/attempts?id=eq.${encodeURIComponent(attemptId)}&select=uid`,
      { headers: userHeaders },
    );
    if (!attemptRes.ok) return json(res, 502, { error: 'Attempt lookup failed' });
    const attempts = await attemptRes.json();
    if (!Array.isArray(attempts) || attempts.length === 0) {
      return json(res, 403, { error: 'Forbidden' });
    }

    // 4. Optional model override, validated against the `ai_models` catalog
    //    (ids sanitize '/' → '--', mirroring the seed script). Unknown or
    //    inactive ids fall back to the env default instead of failing chat.
    let modelOverride;
    if (typeof model === 'string' && model.length > 0) {
      const catalogRes = await fetch(
        `${supabaseUrl}/rest/v1/ai_models?id=eq.${encodeURIComponent(model.replaceAll('/', '--'))}&select=data`,
        { headers: userHeaders },
      );
      if (catalogRes.ok) {
        const rows = await catalogRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].data?.active !== false) {
          modelOverride = rows[0].data?.modelId ?? model;
        }
      }
    }

    // 5. Call the provider.
    let content, reasoning;
    try {
      ({ content, reasoning } = await completeChat(env, messages, modelOverride));
    } catch (err) {
      return json(res, 502, { error: err instanceof Error ? err.message : 'AI provider failed' });
    }

    // 6. Persist the reply as the caller — the chat-insert RLS policy allows
    //    attempt owners/staff, matching the client-side insert path. The
    //    client's realtime subscription picks the row up live.
    const insert = await fetch(`${supabaseUrl}/rest/v1/attempt_messages`, {
      method: 'POST',
      headers: { ...userHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        attemptId,
        uid,
        role: 'ai',
        content,
        reasoning_details: reasoning ?? null,
        createdAt: new Date().toISOString(),
      }),
    });
    if (!insert.ok) {
      const detail = await insert.text().catch(() => '');
      return json(res, 502, { error: `Failed to save message: ${detail.slice(0, 200)}` });
    }

    return json(res, 200, { content });
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : 'Proxy error' });
  }
}
