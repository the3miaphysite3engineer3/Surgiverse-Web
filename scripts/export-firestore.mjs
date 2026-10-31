// One-time export of SurgiVerse data from Firebase (Auth + Firestore) to JSON
// files under scripts/export/, ready for scripts/import-supabase.mjs.
//
//   1. Firebase console → Project settings → Service accounts
//      → "Generate new private key" (project surgiverse-279e5).
//   2. node scripts/export-firestore.mjs --key C:\path\to\serviceAccount.json
//      (or set GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH).
//
// The key file must stay OUTSIDE the repo (gitignored patterns exist, but
// keeping it outside removes the risk entirely).
//
// Re-running is safe: it only writes local JSON.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'export');
mkdirSync(outDir, { recursive: true });

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const eq = a.indexOf('=');
  if (eq > -1) args[a.slice(2, eq)] = a.slice(eq + 1);
  else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[a.slice(2)] = argv[++i];
  else args[a.slice(2)] = true;
}

const keyPath =
  args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!keyPath) {
  console.error(
    'Missing service-account key.\n' +
      'Usage: node scripts/export-firestore.mjs --key PATH\\serviceAccount.json',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();
const auth = getAuth();

/** Convert Firestore values into JSON-safe shapes (timestamps → ISO). */
function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (typeof value?.toDate === 'function') return { __ts: value.toDate().toISOString() };
  if (value instanceof Uint8Array || value?.constructor?.name === 'Buffer') {
    return { __bytes: Buffer.from(value).toString('base64') };
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (value instanceof Date) return { __ts: value.toISOString() };
  if (typeof value === 'object') {
    // Firestore internals (DocumentReference, GeoPoint, etc.)
    if (typeof value.path === 'string' && value.firestore) return { __ref: value.path };
    if (Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      return { __geo: [value.latitude, value.longitude] };
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

async function exportCollection(name) {
  const snap = await db.collection(name).get();
  const docs = snap.docs.map((d) => ({ id: d.id, data: toPlain(d.data()) }));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(docs, null, 1));
  console.log(`${name}: ${docs.length} docs`);
  return docs.length;
}

// Auth users (paged). passwordHash is scrypt/bcrypt — kept for reference only;
// Supabase uses bcrypt so passwords cannot be carried over.
const authUsers = [];
let pageToken;
do {
  const { users, pageToken: next } = await auth.listUsers(1000, pageToken);
  for (const u of users) {
    authUsers.push({
      uid: u.uid,
      email: u.email ?? null,
      emailVerified: u.emailVerified ?? false,
      displayName: u.displayName ?? null,
      disabled: u.disabled ?? false,
      createdAt: u.metadata?.creationTime ?? null,
      lastLoginAt: u.metadata?.lastSignInTime ?? null,
      passwordHash: u.passwordHash ?? null,
    });
  }
  pageToken = next;
} while (pageToken);
writeFileSync(join(outDir, 'auth-users.json'), JSON.stringify(authUsers, null, 1));
console.log(`auth users: ${authUsers.length}`);

const summary = { exportedAt: new Date().toISOString(), authUsers: authUsers.length };
summary.users = await exportCollection('users');
summary.surgeries = await exportCollection('surgeries');
summary.attempts = await exportCollection('attempts');
summary.config = await exportCollection('config');
summary.ai_models = await exportCollection('ai_models');
summary.ai_resources = await exportCollection('ai_resources');
summary.refVideos = await exportCollection('refVideos');

// Subcollection: attemptChats/{attemptId}/messages/{msgId}
const msgSnap = await db.collectionGroup('messages').get();
const messages = msgSnap.docs
  .filter((d) => d.ref.parent.parent?.path.startsWith('attemptChats/'))
  .map((d) => ({
    attemptId: d.ref.parent.parent.id,
    msgId: d.id,
    data: toPlain(d.data()),
  }));
writeFileSync(join(outDir, 'attempt-messages.json'), JSON.stringify(messages, null, 1));
summary.attempt_messages = messages.length;
console.log(`attemptChats/*/messages: ${messages.length} docs`);

writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\nDone → ${outDir}`);
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
