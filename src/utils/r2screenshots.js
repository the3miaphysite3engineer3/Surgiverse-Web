// Resolves screenshot entries to viewable <img> srcs.
//
// - Legacy base64 entries ({ image }) resolve synchronously to data URLs.
// - R2 entries ({ url, r2Key }) whose only URL is the unsigned S3 API
//   endpoint need a signed URL: the app POSTs their r2Keys to the signer
//   endpoint (VITE_R2_SIGNER_URL, see worker/README.md) with the viewer's
//   Firebase ID token. Results are cached in memory until near-expiry.
// - If no signer is configured (or it fails), falls back to the stored
//   `url` directly, and the viewer shows an "Open original" fallback.
import { screenshotSrc } from './attemptFormat';
import { auth } from '../firebase';

const SIGNER_URL = (import.meta.env.VITE_R2_SIGNER_URL || '')
  .trim()
  .replace(/\/+$/, '');

// Optional: base URL of a worker/endpoint that serves R2 objects directly,
// e.g. https://surgvideorag-uploads.<subdomain>.workers.dev serving
// GET /screenshots/<uid>/<file>. When set, R2 entries resolve to
// `${base}/${r2Key}` with no signing round-trip.
// Default public base (non-secret): override with VITE_R2_PUBLIC_BASE_URL.
const PUBLIC_BASE = (
  import.meta.env.VITE_R2_PUBLIC_BASE_URL ||
  'https://pub-5b5d16787ce8491a813046fe6c252b22.r2.dev/screenshots'
)
  .trim()
  .replace(/\/+$/, '');

function entryHasInlineImage(entry) {
  return Boolean(entry?.image || entry?.base64 || entry?.data);
}

/**
 * Direct public URL for an R2 entry, or '' (needs r2Key, no inline image).
 * Avoids duplicating a path prefix the base already ends with, e.g. base
 * `.../screenshots` + key `screenshots/<uid>/<file>`.
 */
export function publicR2Url(entry) {
  if (entryHasInlineImage(entry)) return '';
  const key = entryR2Key(entry);
  if (!key || !PUBLIC_BASE) return '';
  let suffix = key;
  try {
    const lastSeg = new URL(PUBLIC_BASE).pathname
      .split('/')
      .filter(Boolean)
      .pop();
    if (lastSeg && suffix === lastSeg) suffix = '';
    else if (lastSeg && suffix.startsWith(`${lastSeg}/`)) {
      suffix = suffix.slice(lastSeg.length + 1);
    }
  } catch {
    // Keep the full key on malformed base URLs.
  }
  if (!suffix) return PUBLIC_BASE;
  return `${PUBLIC_BASE}/${suffix.split('/').map(encodeURIComponent).join('/')}`;
}

// Presigned URLs are minted for 1h; refresh a bit early.
const CACHE_TTL_MS = 50 * 60 * 1000;
const cache = new Map(); // r2Key -> { url, expMs }

export function isSignerConfigured() {
  return Boolean(SIGNER_URL);
}

/** Validated storage key for an entry, or '' (only screenshots/ allowed). */
export function entryR2Key(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const k = entry.r2Key || entry.key || '';
  return typeof k === 'string' && k.startsWith('screenshots/') ? k : '';
}

/**
 * True when this entry can only be loaded via the signer: it has an r2Key,
 * no inline base64, and its direct URL is the unsigned S3 API endpoint
 * (which browsers can't fetch without a signature).
 */
export function needsSigning(entry) {
  if (!entryR2Key(entry) || !SIGNER_URL) return false;
  if (entry.image || entry.base64 || entry.data) return false;
  if (publicR2Url(entry)) return false; // served directly, no signing needed
  const direct = screenshotSrc(entry);
  if (!direct) return true;
  try {
    return new URL(direct).hostname.endsWith('.r2.cloudflarestorage.com');
  } catch {
    return true;
  }
}

/** Resolve one entry; never throws (falls back to the direct src). */
export async function resolveScreenshotSrc(entry) {
  const [src] = await resolveScreenshotList([entry]);
  return src;
}

/** Resolve many entries with a single signer call; never throws. */
export async function resolveScreenshotList(entries) {
  const srcs = entries.map((e) => screenshotSrc(e));
  // Prefer the direct worker URL when configured (no auth round-trip).
  entries.forEach((entry, i) => {
    const pub = publicR2Url(entry);
    if (pub) srcs[i] = pub;
  });
  const pending = new Map(); // r2Key -> [indexes]
  entries.forEach((entry, i) => {
    if (publicR2Url(entry)) return; // already resolved above
    if (!needsSigning(entry)) return;
    const key = entryR2Key(entry);
    const hit = cache.get(key);
    if (hit && hit.expMs > Date.now()) {
      srcs[i] = hit.url;
      return;
    }
    if (!pending.has(key)) pending.set(key, []);
    pending.get(key).push(i);
  });
  if (pending.size === 0) return srcs;

  try {
    const token = await auth?.currentUser?.getIdToken?.().catch(() => null);
    if (!token) return srcs;
    const res = await fetch(SIGNER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keys: [...pending.keys()] }),
    });
    if (!res.ok) return srcs;
    const { urls } = await res.json();
    if (!urls || typeof urls !== 'object') return srcs;
    const expMs = Date.now() + CACHE_TTL_MS;
    for (const [key, indexes] of pending) {
      const signed = urls[key];
      if (typeof signed !== 'string' || !signed) continue;
      cache.set(key, { url: signed, expMs });
      for (const i of indexes) srcs[i] = signed;
    }
  } catch {
    // Fall through to direct URLs; viewer shows fallback UI on failure.
  }
  return srcs;
}
