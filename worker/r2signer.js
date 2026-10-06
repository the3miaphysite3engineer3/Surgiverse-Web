// Cloudflare Worker: presigns R2 GET URLs for surgery screenshots.
//
// Why this exists: the web app must NEVER hold the R2 secret (anything
// bundled by Vite ships to every visitor's browser). The browser calls this
// endpoint, it verifies the caller's Firebase ID token, validates the
// requested keys, and returns short-lived SigV4 URLs. Zero dependencies.
//
// Deploy (needs wrangler + a Cloudflare account with the R2 bucket):
//   cd worker
//   cp wrangler.toml.example wrangler.toml   # fill in account_id
//   wrangler secret put R2_ACCESS_KEY
//   wrangler secret put R2_SECRET_KEY
//   wrangler deploy
// Then set VITE_R2_SIGNER_URL in the web app's .env to the worker URL.

const REGION = 'auto';
const SERVICE = 's3';
const KEY_PREFIX = 'screenshots/';
const MAX_KEYS = 20;
const EXPIRES_SECONDS = 3600;

const te = new TextEncoder();

function rfc3986(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

const sha256Hex = async (data) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(data)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

async function hmac(key, data) {
  const k = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? te.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(data)));
}

const toHex = (bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function corsHeaders(request, extra = {}) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

const json = (obj, status = 200, request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(request, { 'Content-Type': 'application/json' }),
  });

function validKey(k) {
  return (
    typeof k === 'string' &&
    k.startsWith(KEY_PREFIX) &&
    !k.includes('..') &&
    k.length > KEY_PREFIX.length &&
    k.length < 512
  );
}

async function presignGet({ account, access, secret, bucket, key, expires }) {
  const host = `${account}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const encKey = key
    .split('/')
    .map((s) => rfc3986(s))
    .join('/');

  const credential = `${access}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const pairs = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', 'host'],
  ]
    .map(([k, v]) => [rfc3986(k), rfc3986(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonical = [
    'GET',
    `/${bucket}/${encKey}`,
    pairs,
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await sha256Hex(canonical),
  ].join('\n');

  const kDate = await hmac('AWS4' + secret, dateStamp);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  const kSigning = await hmac(kService, 'aws4_request');
  const sigKey = await crypto.subtle.importKey('raw', kSigning, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', sigKey, te.encode(stringToSign))));

  return `https://${host}/${bucket}/${encKey}?${pairs}&X-Amz-Signature=${signature}`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Use POST { keys: [...] }' }, 405, request);
    }

    const { account, access, secret, bucket, projectId } = {
      account: env.R2_ACCOUNT,
      access: env.R2_ACCESS_KEY,
      secret: env.R2_SECRET_KEY,
      bucket: env.R2_BUCKET || 'surgvideorag',
      projectId: env.FIREBASE_PROJECT_ID,
    };
    if (!account || !access || !secret || !projectId) {
      return json({ error: 'Signer misconfigured' }, 500, request);
    }

    // 1. Verify the caller's Firebase ID token (must belong to this project).
    const idToken = (request.headers.get('Authorization') || '').replace(
      /^Bearer\s+/i,
      ''
    );
    if (!idToken) return json({ error: 'Unauthorized' }, 401, request);
    try {
      const check = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      const info = await check.json();
      if (!check.ok || info.aud !== projectId) {
        return json({ error: 'Unauthorized' }, 401, request);
      }
    } catch {
      return json({ error: 'Auth check failed' }, 503, request);
    }

    // 2. Validate requested keys (screenshots prefix only, capped count).
    let keys;
    try {
      ({ keys } = await request.json());
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, request);
    }
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_KEYS) {
      return json({ error: `Provide 1-${MAX_KEYS} keys` }, 400, request);
    }
    const clean = [...new Set(keys)].filter(validKey);
    if (clean.length === 0) return json({ error: 'No valid keys' }, 400, request);

    // 3. Presign.
    const urls = {};
    for (const key of clean) {
      urls[key] = await presignGet({
        account,
        access,
        secret,
        bucket,
        key,
        expires: EXPIRES_SECONDS,
      });
    }
    return json({ urls, expiresIn: EXPIRES_SECONDS }, 200, request);
  },
};
