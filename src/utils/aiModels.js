// Client helper for the `ai_models` catalog (SovereignEG ids + EGP prices).
// Seeded with Admin SDK: npm run seed:models -- --key PATH\serviceAccount.json
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Offline / pre-seed fallback so the AI assistant always has a model.
export const FALLBACK_MODELS = [
  {
    id: 'fallback-sovereign',
    modelId: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek-ai',
    inputPerMTokensEGP: 5.19,
    outputPerMTokensEGP: 10.37,
    isDefault: true,
  },
  {
    id: 'fallback-openrouter',
    modelId: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super (OpenRouter free)',
    provider: 'nvidia',
    inputPerMTokensEGP: null,
    outputPerMTokensEGP: null,
    isDefault: false,
  },
];

let cache = null;

/** Active models from Firestore, cheapest input first. Falls back offline. */
export async function fetchActiveModels() {
  if (cache) return cache;
  try {
    // No orderBy: avoids requiring a composite index; sort client-side.
    const snap = await getDocs(
      query(collection(db, 'ai_models'), where('active', '==', true)),
    );
    const models = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (models.length === 0) return (cache = FALLBACK_MODELS);
    models.sort(
      (a, b) => (a.inputPerMTokensEGP ?? Infinity) - (b.inputPerMTokensEGP ?? Infinity),
    );
    return (cache = models);
  } catch (err) {
    console.warn('ai_models unavailable, using fallback:', err?.code || err?.message || err);
    return (cache = FALLBACK_MODELS);
  }
}

/** Default model: isDefault flag wins, else cheapest. */
export function defaultModel(models) {
  return models.find((m) => m.isDefault) ?? models[0] ?? FALLBACK_MODELS[0];
}

export function formatPriceEGP(value) {
  return value === null || value === undefined ? '—' : `${value} EGP/1M`;
}
