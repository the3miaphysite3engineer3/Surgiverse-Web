// Server-side chat provider abstraction: OpenRouter and SovereignEG.
// Both speak OpenAI-compatible POST { model, messages, ... } and return
// { choices: [{ message }] }, so one code path serves both. Keys stay here,
// on the server — never prefix them with NEXT_PUBLIC_ / VITE_.
//
// Env selection:
//   AI_PROVIDER=sovreign | openrouter   (default: openrouter)
//   OPENROUTER_API_KEY / OPENROUTER_MODEL
//   SOVEREIGN_AI_KEY / SOVEREIGN_MODEL (default SovereignEG/Qwen3.8-27B-FP8)
//   SOVEREIGN_BASE_URL (default https://backend.sovereigneg.com/v1)

export type ChatMessage = { role: string; content: string };

export type ChatResult = {
  content: string;
  /** Provider-specific reasoning payload, if any. Null-safe by design. */
  reasoning: unknown;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SOVEREIGN_DEFAULT_BASE = 'https://backend.sovereigneg.com/v1';
const SOVEREIGN_DEFAULT_MODEL = 'deepseek-v4-flash';
const OPENROUTER_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

function providerConfig() {
  const provider = (process.env.AI_PROVIDER ?? 'openrouter').toLowerCase();
  if (provider === 'sovereign' || provider === 'sovereigneg') {
    const apiKey = process.env.SOVEREIGN_AI_KEY;
    if (!apiKey) throw new Error('SOVEREIGN_AI_KEY is not configured');
    return {
      name: 'sovereign',
      url: `${process.env.SOVEREIGN_BASE_URL ?? SOVEREIGN_DEFAULT_BASE}/chat/completions`,
      apiKey,
      model: process.env.SOVEREIGN_MODEL ?? SOVEREIGN_DEFAULT_MODEL,
      // SovereignEG ignores unknown fields; reasoning envelope is OpenRouter-only.
      extraBody: {},
    };
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  return {
    name: 'openrouter',
    url: OPENROUTER_URL,
    apiKey,
    model: process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
    extraBody: { reasoning: { enabled: true } },
  };
}

/** Non-streaming chat completion. `modelOverride` (a catalog-validated model
 * id from Firestore `ai_models`) wins over the env default. Throws on
 * provider errors. */
export async function completeChat(
  messages: ChatMessage[],
  modelOverride?: string,
): Promise<ChatResult> {
  const cfg = providerConfig();
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
    reasoning:
      aiMessage?.reasoning_details ?? aiMessage?.reasoning_content ?? null,
  };
}
