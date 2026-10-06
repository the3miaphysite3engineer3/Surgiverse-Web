/**
 * Safe formatters for Firestore `attempts` documents.
 *
 * Why this exists:
 * `completionTimeSeconds` has historically been written by different clients
 * (web / Unity) as a number OR a numeric string, and older docs may omit it.
 * Calling `.toFixed()` directly on it throws:
 *   TypeError: l.completionTimeSeconds.toFixed is not a function
 * Likewise `timestamp` can be a Firestore Timestamp, a plain {seconds},
 * millis, ISO string, or missing.
 */

/** Coerce completionTimeSeconds-like values to a finite number, or null. */
export function toCompletionTimeNumber(value) {
  if (value === null || value === undefined) return null;
  // Firestore Timestamp-like objects are NOT durations — reject them.
  if (typeof value === 'object') {
    // Allow { seconds: number } shaped durations? No — attempts use plain
    // numbers, so treat objects as invalid rather than crashing.
    return null;
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

/** Format for display, e.g. `12.34s` internals. Returns 'N/A' when invalid. */
export function formatCompletionTime(value, digits = 2) {
  const num = toCompletionTimeNumber(value);
  return num === null ? 'N/A' : `${num.toFixed(digits)}s`;
}

/** Numeric seconds value for aggregation (0 when invalid). */
export function completionTimeForSum(value) {
  return toCompletionTimeNumber(value) ?? 0;
}

/**
 * New Unity client writes `surgeryID` (camelCase); older web client wrote
 * `surgery_id` (snake_case). Accept both (plus `surgeryId`).
 */
export function getAttemptSurgeryId(attempt) {
  if (!attempt || typeof attempt !== 'object') return null;
  return (
    attempt.surgeryID ??
    attempt.surgeryId ??
    attempt.surgery_id ??
    attempt.surgeryid ??
    null
  );
}

/**
 * Procedure name may live top-level (`procedureName`), legacy (`procedure`),
 * or inside `metrics.procedureName` (new client).
 */
export function getAttemptProcedureName(attempt) {
  if (!attempt || typeof attempt !== 'object') return null;
  const direct =
    attempt.procedureName ?? attempt.procedure ?? attempt.procedure_name ?? null;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const fromMetrics = attempt.metrics?.procedureName;
  if (typeof fromMetrics === 'string' && fromMetrics.trim()) return fromMetrics;
  return null;
}

/**
 * Screenshot entries come in two shapes:
 * - Legacy/base64: `{ image: "<base64>", source, timestamp }`
 * - R2-hosted (current Unity client): `{ url, r2Key, source, timestamp }`
 */
function screenshotUrlField(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const candidate =
    entry.url ?? entry.downloadUrl ?? entry.downloadURL ?? entry.src ?? entry.href ?? '';
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : '';
}

function screenshotBase64Field(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const candidate = entry.image ?? entry.base64 ?? entry.data ?? '';
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : '';
}

/** Normalize the `screenshots` array to a safe list (URL- or base64-backed). */
export function getAttemptScreenshots(attempt) {
  const raw = attempt?.screenshots;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => {
    if (!s) return false;
    if (typeof s === 'string') return s.trim().length > 0;
    if (typeof s !== 'object') return false;
    return screenshotUrlField(s) !== '' || screenshotBase64Field(s) !== '';
  });
}

/**
 * Build an <img> src from a screenshot entry. Prefers the hosted `url`
 * (R2), falling back to raw base64 JPEG (`image`, starts with `/9j/`)
 * prefixed as a data URL. Also accepts data URLs, blob URLs, and PNG base64.
 */
export function screenshotSrc(entry) {
  if (typeof entry === 'string') {
    const s = entry.trim();
    if (!s) return '';
    if (
      s.startsWith('data:') ||
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('blob:')
    ) {
      return s;
    }
    const cleaned = s.replace(/\s/g, '');
    const isPng = cleaned.startsWith('iVBOR');
    return `data:image/${isPng ? 'png' : 'jpeg'};base64,${cleaned}`;
  }
  const url = screenshotUrlField(entry);
  if (url) return url;
  const raw = screenshotBase64Field(entry);
  if (!raw) return '';
  const s = String(raw).trim();
  if (
    s.startsWith('data:') ||
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('blob:')
  ) {
    return s;
  }
  const cleaned = s.replace(/\s/g, '');
  const isPng = cleaned.startsWith('iVBOR');
  return `data:image/${isPng ? 'png' : 'jpeg'};base64,${cleaned}`;
}

/** Best-effort filename for a screenshot entry (for downloads). */
export function screenshotFilename(entry, index = 0) {
  const key = entry?.r2Key || '';
  if (typeof key === 'string' && key) {
    const base = key.split('/').pop().split('?')[0];
    if (base) return base;
  }
  const url = screenshotUrlField(entry);
  if (url) {
    try {
      const base = new URL(url).pathname.split('/').pop().split('?')[0];
      if (base) return base;
    } catch {
      /* ignore malformed URLs */
    }
  }
  return `screenshot-${index + 1}.jpg`;
}

/**
 * Normalize `logs` to a string array.
 * Firestore docs vary: array of strings (normal), a single string, a
 * Firestore map like {0: "...", 1: "..."}, or an array mixing strings and
 * objects ({message}/{text}/{log}). Never throws; returns [] when missing.
 */
export function formatLogEntry(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'number' || typeof entry === 'boolean') return String(entry);
  if (typeof entry === 'object') {
    const candidate =
      entry.message ?? entry.text ?? entry.log ?? entry.content ?? entry.detail ?? null;
    if (typeof candidate === 'string') return candidate;
    if (candidate !== null && candidate !== undefined) {
      try {
        return JSON.stringify(candidate);
      } catch {
        return String(candidate);
      }
    }
    try {
      return JSON.stringify(entry);
    } catch {
      return String(entry);
    }
  }
  return String(entry);
}

export function getAttemptLogs(attempt) {
  const raw = attempt?.logs ?? attempt?.Logs ?? attempt?.log ?? null;
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw.map(formatLogEntry).filter((s) => s !== '');
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    // Preserve multi-line strings as separate entries for readability.
    return trimmed.includes('\n') ? trimmed.split('\n').map((s) => s.trim()).filter(Boolean) : [raw];
  }
  if (typeof raw === 'object') {
    try {
      return Object.values(raw).map(formatLogEntry).filter((s) => s !== '');
    } catch {
      return [formatLogEntry(raw)];
    }
  }
  return [formatLogEntry(raw)].filter((s) => s !== '');
}

/** Human-friendly metric value (handles nested objects like screenshots). */
export function formatMetricValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Convert Firestore-ish timestamp to millis, or null. */
export function toMillis(timestamp) {
  if (timestamp === null || timestamp === undefined) return null;
  try {
    if (typeof timestamp?.toDate === 'function') {
      return timestamp.toDate().getTime();
    }
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      // Heuristic: seconds vs millis (Firestore seconds are ~1e9, millis ~1e12)
      return timestamp < 1e12 ? timestamp * 1000 : timestamp;
    }
    if (typeof timestamp === 'string') {
      const t = Date.parse(timestamp);
      return Number.isNaN(t) ? null : t;
    }
    if (typeof timestamp === 'object') {
      if (Number.isFinite(timestamp.seconds)) {
        const nanos = Number.isFinite(timestamp.nanoseconds) ? timestamp.nanoseconds / 1e6 : 0;
        return timestamp.seconds * 1000 + nanos;
      }
      if (timestamp._seconds !== undefined) {
        return timestamp._seconds * 1000;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Locale string for display, 'N/A' when missing/invalid. */
export function formatAttemptDate(timestamp) {
  const ms = toMillis(timestamp);
  if (ms === null || Number.isNaN(ms)) return 'N/A';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return 'N/A';
  }
}

/** Sort comparator: newest first, missing timestamps last. */
export function compareAttemptsNewestFirst(a, b) {
  const ta = toMillis(a?.timestamp) ?? 0;
  const tb = toMillis(b?.timestamp) ?? 0;
  return tb - ta;
}

/** Friendly message for Firestore fetch failures (esp. offline). */
export function firestoreErrorMessage(err) {
  const code = err?.code || '';
  const msg = String(err?.message || '');
  if (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    /client is offline|network|Failed to get document/i.test(msg)
  ) {
    return 'You appear to be offline. Showing cached data if available — please check your connection and retry.';
  }
  return 'Failed to fetch data. Please try again later.';
}
