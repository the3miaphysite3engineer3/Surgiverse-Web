// Seeds the SovereignEG model catalog into Supabase `ai_models` (data jsonb),
// using the service-role key (bypasses RLS — no professor account needed).
//
//   node --env-file=.env.local scripts/seed-ai-models-supabase.mjs [--dry-run]
//
// Re-running is safe: rows are upserted by sanitized model id.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, 'ai-models-seed.json'), 'utf8'));

const argv = process.argv.slice(2);
if (argv.includes('--dry-run')) {
  console.log(`OK: ${seed.models.length} models parsed.`);
  console.log(`Default: ${(seed.models.find((m) => m.isDefault) ?? {}).id ?? '(none)'}`);
  const ids = new Set(seed.models.map((m) => m.id));
  if (ids.size !== seed.models.length) {
    console.error('DUPLICATE model ids found!');
    process.exit(1);
  }
  console.log('No duplicate ids. Nothing written (--dry-run).');
  process.exit(0);
}

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Supabase row ids mirror the old Firestore doc ids: '/' cannot appear. */
const modelRowId = (modelId) => modelId.replaceAll('/', '--');

const rows = seed.models.map((m) => ({
  id: modelRowId(m.id),
  data: {
    modelId: m.id,
    name: m.name,
    provider: m.provider,
    modality: 'chat',
    contextKTokens: m.ctxK ?? null,
    inputPerMTokensEGP: m.in ?? null,
    cacheReadPerMTokensEGP: m.cacheR ?? null,
    cacheWritePerMTokensEGP: m.cacheW ?? null,
    outputPerMTokensEGP: m.out ?? null,
    currency: 'EGP',
    active: m.active ?? true,
    isDefault: m.isDefault ?? false,
  },
  updatedAt: new Date().toISOString(),
}));

const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const { error } = await supabase
    .from('ai_models')
    .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }
  console.log(`  …${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}
console.log(`Done: ${rows.length} models upserted into ai_models (service role).`);

// Sanity check through the anon-policy lens is done by the app itself.
process.exit(0);
