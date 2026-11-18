/**
 * Data-access layer over Supabase (Postgres via PostgREST).
 *
 * Every function returns objects shaped exactly like the old Firestore
 * documents (camelCase fields), so the page components and
 * src/utils/attemptFormat.js keep working unchanged.
 *
 * Row-level security on the server enforces the former firestore.rules:
 * students see their own rows, staff (TA/professor) see everything, only
 * professors mutate shared content, and grade fields are staff-only.
 */
import { supabase } from '../supabase';

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// ---- mappers ---------------------------------------------------------------

const mapSurgery = (row) => ({
  id: row.id,
  title: row.title ?? '',
  category: row.category ?? '',
  description: row.description ?? '',
  sceneName: row.sceneName ?? '',
  viewSceneName: row.viewSceneName ?? null,
  procedureName: row.procedureName ?? '',
  professorName: row.professorName ?? null,
  defaultMetrics: row.defaultMetrics ?? {},
  requiredSteps: Array.isArray(row.requiredSteps) ? row.requiredSteps : [],
  createdAt: row.createdAt ?? null,
});

const mapAttempt = (row) => ({
  id: row.id,
  uid: row.uid,
  surgeryID: row.surgeryID ?? null,
  procedureName: row.procedureName ?? '',
  metrics: row.metrics ?? {},
  logs: row.logs ?? [],
  errors: Array.isArray(row.errors) ? row.errors : [],
  screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
  isSuccessful: row.isSuccessful ?? true,
  completionTimeSeconds: row.completionTimeSeconds ?? 0,
  timestamp: row.timestamp ?? null,
  score: row.score ?? null,
  evaluation: row.evaluation ?? null,
  feedback: row.feedback ?? null,
  gradedBy: row.gradedBy ?? null,
  gradedAt: row.gradedAt ?? null,
  bleedingEventsCount: row.bleedingEventsCount ?? 0,
});

const mapUser = (row) => ({
  uid: row.uid,
  firstName: row.firstName ?? '',
  lastName: row.lastName ?? '',
  email: row.email ?? '',
  role: row.role ?? 'student',
  lastLogin: row.lastLogin ?? null,
});

const mapChatMessage = (row) => ({
  id: row.id,
  attemptId: row.attemptId,
  role: row.role,
  content: row.content ?? '',
  createdAt: row.createdAt ?? null,
  reasoning_details: row.reasoning_details ?? null,
});

const mapConfigRow = (row) => ({ id: row.id, ...(row.data ?? {}) });

function throwIfError({ error }, fallback = 'Database error') {
  if (error) throw new Error(error.message || fallback);
}

// ---- surgeries -------------------------------------------------------------

export async function fetchSurgeries() {
  const { data, error } = await supabase
    .from('surgeries')
    .select('*')
    .order('createdAt', { ascending: true });
  throwIfError({ error }, 'Failed to fetch surgeries');
  return (data ?? []).map(mapSurgery);
}

export async function fetchSurgery(id) {
  const { data, error } = await supabase.from('surgeries').select('*').eq('id', id).maybeSingle();
  throwIfError({ error }, 'Failed to fetch surgery');
  return data ? mapSurgery(data) : null;
}

export async function addSurgery({ title, category, description, sceneName, procedureName }) {
  const { data, error } = await supabase
    .from('surgeries')
    .insert({
      title,
      category,
      description,
      sceneName,
      ...(procedureName ? { procedureName } : {}),
    })
    .select('id')
    .single();
  throwIfError({ error }, 'Failed to add surgery');
  return data.id;
}

// ---- attempts --------------------------------------------------------------

export async function fetchUserAttempts(uid) {
  const { data, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('uid', uid)
    .order('timestamp', { ascending: false });
  throwIfError({ error }, 'Failed to fetch attempts');
  return (data ?? []).map(mapAttempt);
}

export async function fetchAllAttempts() {
  const { data, error } = await supabase
    .from('attempts')
    .select('*')
    .order('timestamp', { ascending: false });
  throwIfError({ error }, 'Failed to fetch attempts');
  return (data ?? []).map(mapAttempt);
}

/** Staff-only: update the grade fields of an attempt. */
export async function updateAttemptScore(id, score) {
  const { error } = await supabase.from('attempts').update({ score }).eq('id', id);
  throwIfError({ error }, 'Failed to save grade');
}

// ---- users / profiles ------------------------------------------------------

export async function fetchUserProfile(uid) {
  const { data, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
  throwIfError({ error }, 'Failed to fetch profile');
  return data ? mapUser(data) : null;
}

export async function fetchAllUsers() {
  const { data, error } = await supabase.from('users').select('*');
  throwIfError({ error }, 'Failed to fetch users');
  return (data ?? []).map(mapUser);
}

/** Professor-only: change someone's role. */
export async function updateUserRole(uid, role) {
  const { error } = await supabase.from('users').update({ role }).eq('uid', uid);
  throwIfError({ error }, 'Failed to update role');
}

/** Users can change their own names (role/email are guarded server-side). */
export async function updateUserNames(uid, { firstName, lastName }) {
  const { error } = await supabase.from('users').update({ firstName, lastName }).eq('uid', uid);
  throwIfError({ error }, 'Failed to update profile');
}

// ---- config (global game settings + per-user Unity settings) ----------------

export async function fetchGlobalConfig() {
  const { data, error } = await supabase.from('config').select('*').eq('id', 'global').maybeSingle();
  throwIfError({ error }, 'Failed to fetch settings');
  return data ? mapConfigRow(data) : { id: 'global' };
}

/** Professor-only: merge fields into the singleton global config row. */
export async function saveGlobalConfig(fields) {
  const current = await fetchGlobalConfig();
  const merged = { ...current, ...fields };
  delete merged.id;
  const { error } = await supabase
    .from('config')
    .upsert({ id: 'global', uid: null, data: merged, updatedAt: new Date().toISOString() }, { onConflict: 'id' });
  throwIfError({ error }, 'Failed to save settings');
  return { id: 'global', ...merged };
}

/** The signed-in user's own Unity settings row (excluding the global one). */
export async function fetchUserSettings(uid) {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('uid', uid)
    .neq('id', 'global')
    .limit(1)
    .maybeSingle();
  throwIfError({ error }, 'Failed to fetch settings');
  return data ? mapConfigRow(data) : null;
}

export async function updateUserSettings(settingsId, data) {
  const { error } = await supabase
    .from('config')
    .update({ data, updatedAt: new Date().toISOString() })
    .eq('id', settingsId);
  throwIfError({ error }, 'Failed to save settings');
}

// ---- AI resources / reference videos (professor writes) ---------------------

export async function addAiResource(markdown) {
  const { error } = await supabase.from('ai_resources').insert({
    id: newId(),
    data: { markdown, createdAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  });
  throwIfError({ error }, 'Failed to add resource');
}

export async function addRefVideo({ title, frames, sourceFileName }) {
  const { error } = await supabase.from('ref_videos').insert({
    id: newId(),
    data: { title, frames, sourceFileName, createdAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  });
  throwIfError({ error }, 'Failed to save reference video');
}

// ---- attempt chat (AI assistant) -------------------------------------------

export async function fetchChatMessages(attemptId) {
  const { data, error } = await supabase
    .from('attempt_messages')
    .select('*')
    .eq('attemptId', attemptId)
    .order('createdAt', { ascending: true });
  throwIfError({ error }, 'Failed to fetch chat');
  return (data ?? []).map(mapChatMessage);
}

export async function sendChatMessage(attemptId, uid, { role, content, reasoning_details = null }) {
  const { data, error } = await supabase
    .from('attempt_messages')
    .insert({ attemptId, uid, role, content, reasoning_details })
    .select('*')
    .single();
  throwIfError({ error }, 'Failed to send message');
  return mapChatMessage(data);
}

/**
 * Live chat transcript (replaces the Firestore onSnapshot listener).
 * Returns an unsubscribe function. Events respect the table's RLS, so a
 * subscriber only ever receives rows for attempts they can access.
 */
export function subscribeChatMessages(attemptId, onInsert) {
  const channel = supabase
    .channel(`attempt_messages:${attemptId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'attempt_messages',
        // NOTE: unquoted — the Realtime filter parser matches the payload key
        // verbatim; quoting the camelCase identifier makes it filter out
        // every event (subscribed but nothing delivered).
        filter: `attemptId=eq.${attemptId}`,
      },
      (payload) => onInsert(mapChatMessage(payload.new)),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime channel issue:', status);
      }
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
