// One-time import of the Firestore export (scripts/export-firestore.mjs) into
// Supabase. Uses the service-role key — RLS and guard triggers are bypassed,
// but the users/attempts guard functions still allow service_role writes.
//
//   node --env-file=.env.local scripts/import-supabase.mjs [--export-dir scripts/export]
//
// Idempotency: auth users are matched by email; surgeries by legacyId (or
// case-insensitive title); attempts via scripts/export/attempt-map.json.
// Re-running skips already-imported rows.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const exportDir = resolve(
  argv.includes('--export-dir') ? argv[argv.indexOf('--export-dir') + 1] : join(here, 'export'),
);

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const readJson = (name, fallback) =>
  existsSync(join(exportDir, name))
    ? JSON.parse(readFileSync(join(exportDir, name), 'utf8'))
    : fallback;

const authUsers = readJson('auth-users.json', []);
const userDocs = readJson('users.json', []);
const surgeries = readJson('surgeries.json', []);
const attempts = readJson('attempts.json', []);
const messages = readJson('attempt-messages.json', []);
const configDocs = readJson('config.json', []);
const aiModels = readJson('ai_models.json', []);
const aiResources = readJson('ai_resources.json', []);
const refVideos = readJson('refVideos.json', []);

// ---- helpers (ported from src/utils/attemptFormat.js) ----------------------
const toMillis = (ts) => {
  if (ts === null || ts === undefined) return null;
  if (typeof ts === 'object' && typeof ts.__ts === 'string') return Date.parse(ts.__ts) || null;
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts < 1e12 ? ts * 1000 : ts;
  if (typeof ts === 'string') {
    const t = Date.parse(ts);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof ts === 'object') {
    if (Number.isFinite(ts.seconds)) return ts.seconds * 1000 + (ts.nanoseconds ?? 0) / 1e6;
    if (ts._seconds !== undefined) return ts._seconds * 1000;
  }
  return null;
};
const isoOrNull = (ts) => {
  const ms = toMillis(ts);
  return ms === null || Number.isNaN(ms) ? null : new Date(ms).toISOString();
};
const toNumber = (v) => {
  if (v === null || v === undefined || typeof v === 'object') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};
const attemptSurgeryId = (a) => a?.surgeryID ?? a?.surgeryId ?? a?.surgery_id ?? a?.surgeryid ?? null;
const attemptProcedureName = (a) => {
  const direct = a?.procedureName ?? a?.procedure ?? a?.procedure_name ?? null;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const fromMetrics = a?.metrics?.procedureName;
  return typeof fromMetrics === 'string' && fromMetrics.trim() ? fromMetrics : null;
};
const logEntry = (e) => {
  if (e === null || e === undefined) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'number' || typeof e === 'boolean') return String(e);
  if (typeof e === 'object') {
    const c = e.message ?? e.text ?? e.log ?? e.content ?? e.detail ?? null;
    if (typeof c === 'string') return c;
    try { return JSON.stringify(c ?? e); } catch { return String(e); }
  }
  return String(e);
};
const normalizeLogs = (a) => {
  const raw = a?.logs ?? a?.Logs ?? a?.log ?? null;
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map(logEntry).filter((s) => s !== '');
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    return t.includes('\n') ? t.split('\n').map((s) => s.trim()).filter(Boolean) : [raw];
  }
  if (typeof raw === 'object') {
    try { return Object.values(raw).map(logEntry).filter((s) => s !== ''); } catch { return [logEntry(raw)]; }
  }
  return [logEntry(raw)].filter((s) => s !== '');
};
const normalizeErrors = (a) => {
  const raw = a?.errors;
  if (Array.isArray(raw)) return raw.map(logEntry).filter((s) => s !== '');
  if (typeof raw === 'string' && raw.trim()) return [raw];
  return [];
};

// ---- 1. Auth users ---------------------------------------------------------
const userDocByUid = new Map(userDocs.map((d) => [d.id, d.data]));
const uidMap = new Map(); // firebase uid -> supabase uuid
let authUsersCreated = 0;
let authUsersReused = 0;
const skippedNoEmail = [];

const { data: existingUsersData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error('listUsers failed:', listErr.message);
  process.exit(1);
}
const existingByEmail = new Map(
  (existingUsersData?.users ?? []).filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
);

for (const u of authUsers) {
  if (!u.email) {
    skippedNoEmail.push(u.uid);
    continue;
  }
  const doc = userDocByUid.get(u.uid) ?? {};
  const displayName = u.displayName ?? '';
  const firstName = doc.firstName ?? displayName.split(' ')[0] ?? '';
  const lastName = doc.lastName ?? displayName.split(' ').slice(1).join(' ') ?? '';

  const existing = existingByEmail.get(u.email.toLowerCase());
  if (existing) {
    uidMap.set(u.uid, existing.id);
    authUsersReused += 1;
    continue;
  }
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: u.email,
    password: randomBytes(24).toString('hex'),
    email_confirm: true,
    user_metadata: { firstName, lastName, legacy_uid: u.uid },
  });
  if (createErr) {
    console.error(`  ! auth user ${u.email}: ${createErr.message} — trying lookup`);
    const { data: again } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const found = (again?.users ?? []).find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
    if (found) {
      uidMap.set(u.uid, found.id);
      authUsersReused += 1;
    } else {
      console.error(`  ! giving up on ${u.email}`);
      skippedNoEmail.push(u.uid);
    }
    continue;
  }
  uidMap.set(u.uid, created.user.id);
  authUsersCreated += 1;
}
console.log(`auth users: ${authUsersCreated} created, ${authUsersReused} reused, ${skippedNoEmail.length} skipped (no email/unresolvable)`);

// ---- 2. users rows (role + lastLogin; row exists via on_auth_user_created) --
for (const doc of userDocs) {
  const newUid = uidMap.get(doc.id);
  if (!newUid) continue;
  const patch = {};
  if (doc.role) patch.role = doc.role;
  const ll = isoOrNull(doc.lastLogin);
  if (ll) patch.lastLogin = ll;
  if (Object.keys(patch).length === 0) continue;
  const { error } = await supabase.from('users').update(patch).eq('uid', newUid);
  if (error) console.error(`  ! users row ${doc.id}: ${error.message}`);
}
console.log(`users rows updated: ${userDocs.length - skippedNoEmail.length} attempted`);

// ---- 3. Surgeries ----------------------------------------------------------
const surgeryMap = new Map(); // firestore id -> supabase uuid
const { data: existingSurgeries } = await supabase.from('surgeries').select('id, title, "legacyId"');
const existingByTitle = new Map(
  (existingSurgeries ?? []).map((s) => [String(s.title ?? '').trim().toLowerCase(), s]),
);
const existingLegacy = new Set((existingSurgeries ?? []).map((s) => s.legacyId).filter(Boolean));

for (const doc of surgeries) {
  const d = doc.data ?? {};
  const byLegacy = existingLegacy.has(doc.id) ? (existingSurgeries ?? []).find((s) => s.legacyId === doc.id) : null;
  const byTitle = existingByTitle.get(String(d.title ?? '').trim().toLowerCase());
  const target = byLegacy ?? byTitle;
  if (target) {
    surgeryMap.set(doc.id, target.id);
    if (!target.legacyId) {
      await supabase.from('surgeries').update({ legacyId: doc.id }).eq('id', target.id);
    }
    continue;
  }
  const { data: inserted, error } = await supabase
    .from('surgeries')
    .insert({
      legacyId: doc.id,
      title: d.title ?? 'Untitled',
      category: d.category ?? '',
      description: d.description ?? '',
      sceneName: d.sceneName ?? '',
      viewSceneName: d.viewSceneName ?? null,
      procedureName: d.procedureName ?? d.title ?? '',
      professorName: d.professorName ?? null,
      defaultMetrics: d.defaultMetrics ?? {},
      requiredSteps: Array.isArray(d.requiredSteps) ? d.requiredSteps : [],
    })
    .select('id')
    .single();
  if (error) {
    console.error(`  ! surgery ${doc.id} (${d.title}): ${error.message}`);
    continue;
  }
  surgeryMap.set(doc.id, inserted.id);
}
console.log(`surgeries mapped: ${surgeryMap.size}/${surgeries.length}`);

// ---- 4. Attempts -----------------------------------------------------------
const mapFile = join(exportDir, 'attempt-map.json');
const attemptMap = existsSync(mapFile) ? new Map(Object.entries(JSON.parse(readFileSync(mapFile, 'utf8')))) : new Map();

const rows = [];
for (const doc of attempts) {
  if (attemptMap.has(doc.id)) continue;
  const d = doc.data ?? {};
  const newUid = uidMap.get(d.uid);
  if (!newUid) {
    console.warn(`  ! attempt ${doc.id}: owner uid ${d.uid} not imported — skipped`);
    continue;
  }
  const legacySurgeryId = attemptSurgeryId(d);
  const rows_ = {
    uid: newUid,
    surgeryID: (legacySurgeryId && surgeryMap.get(legacySurgeryId)) || null,
    procedureName: attemptProcedureName(d) ?? '',
    metrics: d.metrics ?? {},
    logs: normalizeLogs(d),
    errors: normalizeErrors(d),
    screenshots: Array.isArray(d.screenshots) ? d.screenshots : [],
    isSuccessful: typeof d.isSuccessful === 'boolean' ? d.isSuccessful : true,
    completionTimeSeconds: toNumber(d.completionTimeSeconds) ?? 0,
    score: toNumber(d.score),
    evaluation: typeof d.evaluation === 'string' ? d.evaluation : null,
    feedback: typeof d.feedback === 'string' ? d.feedback : null,
    bleedingEventsCount: toNumber(d.bleedingEventsCount),
    timestamp: isoOrNull(d.timestamp),
  };
  rows.push({ legacyId: doc.id, row: rows_ });
}

for (let i = 0; i < rows.length; i += 200) {
  const batch = rows.slice(i, i + 200).map((r) => r.row);
  const { data: inserted, error } = await supabase.from('attempts').insert(batch).select('id');
  if (error) {
    console.error(`  ! attempts batch ${i}: ${error.message}`);
    continue;
  }
  inserted.forEach((r, j) => attemptMap.set(rows[i + j].legacyId, r.id));
  writeFileSync(mapFile, JSON.stringify(Object.fromEntries(attemptMap), null, 1));
}
console.log(`attempts inserted: ${rows.length} (map has ${attemptMap.size})`);

// ---- 5. Chat messages ------------------------------------------------------
let messagesInserted = 0;
const msgRows = [];
for (const m of messages) {
  const attemptUuid = attemptMap.get(m.attemptId);
  if (!attemptUuid) continue;
  const ownerRow = attempts.find((a) => a.id === m.attemptId);
  const ownerUid = ownerRow ? uidMap.get(ownerRow.data?.uid) : null;
  msgRows.push({
    attemptId: attemptUuid,
    uid: ownerUid,
    role: ['user', 'ai', 'assistant', 'system'].includes(m.data?.role) ? m.data.role : 'user',
    content: m.data?.content ?? '',
    reasoning_details: m.data?.reasoning_details ?? null,
    createdAt: isoOrNull(m.data?.createdAt) ?? new Date().toISOString(),
  });
}
for (let i = 0; i < msgRows.length; i += 200) {
  const { error } = await supabase.from('attempt_messages').insert(msgRows.slice(i, i + 200));
  if (error) console.error(`  ! messages batch ${i}: ${error.message}`);
  else messagesInserted += Math.min(200, msgRows.length - i);
}
console.log(`chat messages inserted: ${messagesInserted}/${messages.length}`);

// ---- 6. Config -------------------------------------------------------------
let configUpserted = 0;
for (const doc of configDocs) {
  const d = doc.data ?? {};
  if (doc.id === 'global') {
    const { data: existing } = await supabase.from('config').select('data').eq('id', 'global').maybeSingle();
    const merged = { ...(existing?.data ?? {}), ...d };
    const { error } = await supabase
      .from('config')
      .upsert({ id: 'global', uid: null, data: merged, updatedAt: new Date().toISOString() }, { onConflict: 'id' });
    if (error) console.error(`  ! config global: ${error.message}`);
    else configUpserted += 1;
    continue;
  }
  const newUid = uidMap.get(d.uid);
  if (!newUid) continue;
  const { data: own } = await supabase.from('config').select('id').eq('uid', newUid).neq('id', 'global').maybeSingle();
  if (own) {
    await supabase.from('config').update({ data: d }).eq('id', own.id);
  } else {
    const { error } = await supabase
      .from('config')
      .insert({ id: doc.id, uid: newUid, data: d, updatedAt: new Date().toISOString() });
    if (error) console.error(`  ! config ${doc.id}: ${error.message}`);
  }
  configUpserted += 1;
}
console.log(`config docs processed: ${configUpserted}/${configDocs.length}`);

// ---- 7. Data-blob catalog tables -------------------------------------------
const upsertBlobs = async (table, docs) => {
  const rows_ = docs
    .filter((d) => d.id)
    .map((d) => ({ id: d.id, data: d.data ?? {}, updatedAt: new Date().toISOString() }));
  for (let i = 0; i < rows_.length; i += 200) {
    const { error } = await supabase.from(table).upsert(rows_.slice(i, i + 200), { onConflict: 'id' });
    if (error) console.error(`  ! ${table} batch ${i}: ${error.message}`);
  }
  console.log(`${table}: ${rows_.length} upserted`);
};
await upsertBlobs('ai_models', aiModels);
await upsertBlobs('ai_resources', aiResources);
await upsertBlobs('ref_videos', refVideos);

console.log('\nImport complete.');
console.log(`uid mappings written to ${mapFile}`);
process.exit(0);
