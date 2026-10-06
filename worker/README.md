# R2 screenshot signer (Cloudflare Worker)

The web app shows surgery screenshots stored in the Cloudflare R2 bucket
`surgvideorag`. Objects are private, so browsers can't load the raw
`https://<account>.r2.cloudflarestorage.com/...` URLs from Firestore.
The R2 **secret must never ship in frontend code**, so this tiny Worker
(sidecar, zero dependencies) verifies the viewer's Firebase login and
returns short-lived (1h) signed URLs.

## Deploy

```bash
cd worker
npm i -g wrangler            # if needed
cp wrangler.toml.example wrangler.toml   # set R2_ACCOUNT
wrangler secret put R2_ACCESS_KEY
wrangler secret put R2_SECRET_KEY
wrangler deploy
```

Then point the web app at it (`.env`, gitignored — never commit secrets):

```bash
VITE_R2_SIGNER_URL=https://surgiverse-r2-signer.<your-subdomain>.workers.dev
```

and rebuild (`npm run build`). Without this variable the app falls back to
loading the stored `url` directly (works for public buckets / presigned
`url`s, shows an "Open original" fallback otherwise).

## API

`POST /` with `Authorization: Bearer <firebase-id-token>`

```json
{ "keys": ["screenshots/<uid>/20261005T212242627_REFERENCE.jpg"] }
```

→ `{ "urls": { "<key>": "https://...?X-Amz-Signature=..." }, "expiresIn": 3600 }`

Rules: max 20 keys per call, only keys under `screenshots/`, tokens must
belong to `FIREBASE_PROJECT_ID`.

## Alternatives (no backend)

- Make the bucket public via a custom domain and store that public URL in
  each screenshot's `url` field — simplest, but anyone with the link can read.
- Have the uploader (Unity) store a presigned GET URL (max 7-day expiry)
  instead of the unsigned endpoint — no backend, but links rot and Unity
  needs signing credentials.
