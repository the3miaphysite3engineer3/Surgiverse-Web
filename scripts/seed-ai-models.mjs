// Seeds the SovereignEG model catalog into Firestore `ai_models`
// using the Firebase Admin SDK (bypasses security rules — no professor
// account needed).
//
//   1. Firebase console → Project settings → Service accounts
//      → "Generate new private key" (surgiverse-279e5).
//   2. node scripts/seed-ai-models.mjs --key C:\path\to\serviceAccount.json
//      (or set GOOGLE_APPLICATION_CREDENTIALS to that path).
//      NEVER commit the key file — it is gitignored via *.json? No:
//      keep it OUTSIDE the repo.
//   3. Optional: --dry-run validates the seed file without writing.
//
// Re-running is safe: docs are upserted by sanitized model id.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, 'ai-models-seed.json'), 'utf8'));

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const eq = a.indexOf('=');
  if (eq > -1) {
    args[a.slice(2, eq)] = a.slice(eq + 1);
  } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
    args[a.slice(2)] = argv[++i];
  } else {
    args[a.slice(2)] = true;
  }
}

if (args['dry-run']) {
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

const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error(
    'Missing service-account key.\n' +
      'Usage: node scripts/seed-ai-models.mjs --key PATH\\serviceAccount.json\n' +
      '   or: set GOOGLE_APPLICATION_CREDENTIALS=PATH',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id ?? 'surgiverse-279e5',
});
const db = getFirestore();

/** Firestore doc ids cannot contain '/'. */
export const modelDocId = (modelId) => modelId.replaceAll('/', '--');

const BATCH = 400;
let done = 0;
for (let i = 0; i < seed.models.length; i += BATCH) {
  const batch = db.batch();
  for (const m of seed.models.slice(i, i + BATCH)) {
    batch.set(
      db.doc(`ai_models/${modelDocId(m.id)}`),
      {
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    done += 1;
  }
  await batch.commit();
  console.log(`  …${done}/${seed.models.length}`);
}
console.log(`Done: ${done} models upserted into ai_models (Admin SDK).`);
process.exit(0);
