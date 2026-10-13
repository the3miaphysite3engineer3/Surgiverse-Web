# Next.js migration — server-side API pattern

This folder is a **copy-paste scaffold** for the Vite → Next.js (App Router)
migration. It is intentionally kept outside `src/` so the current Vite build
keeps working until the migration lands.

## The key fact about "hiding Firebase config"

The Firebase **web** config (`apiKey`, `authDomain`, `projectId`, …) is a
**public identifier, not a secret** — Firebase and Google both document this.
The browser needs it for Auth/Firestore, so it is visible in *every* web app,
including Next.js ones. Anyone can read it from devtools no matter what you do.

Real security comes from:

1. **`firestore.rules` / `storage.rules`** (added at repo root, least-privilege
   per collection) — this is what actually protects your data.
2. **Server-only secrets** (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`,
   `CLOUDINARY_API_SECRET`, `FIREBASE_PRIVATE_KEY`) living **only** in Route
   Handlers / Server Components, never prefixed with `NEXT_PUBLIC_`.
3. **Firebase App Check** enforcement (recommended next step, see below).

So "Next APIs only server-side" means: privileged reads/writes and all
third-party AI calls move into `app/api/*/route.ts` using `firebase-admin`,
verified against the caller's **ID token**. The client keeps only
`NEXT_PUBLIC_FIREBASE_*` + Firebase Auth.

## What's in here

| File | Purpose |
|---|---|
| `.env.example` | Public (`NEXT_PUBLIC_*`) vs server-only split. Copy to `.env.local`. |
| `lib/firebase-admin.ts` | Admin SDK singleton + `requireUser()` (ID-token verify + role check) + error mapper. Import **only** from `app/api/*`, Server Actions, Server Components. |
| `lib/firebase-client.ts` | Public client app (`NEXT_PUBLIC_*` only) for Auth + owned-data reads. |
| `lib/ai-providers.ts` | Chat provider switch: `AI_PROVIDER=openrouter` (OpenRouter) or `sovereign` (SovereignEG, OpenAI-compatible `https://backend.sovereigneg.com/v1`, billed in EGP). Keys server-only. |
| `app/api/ai-chat/route.ts` | Replaces `AIAssistant.jsx`'s direct OpenRouter fetch (which leaks `VITE_OPENROUTER`). Verifies ownership/staff, calls the configured provider server-side, persists the reply via Admin SDK. Set `VITE_AI_PROXY_URL` in the Vite app to use it today, no migration needed. |
| `app/api/surgeries/route.ts` | `GET` (any signed-in user) + `POST` (professor only). Replaces `AddSurgery.jsx`'s client `addDoc`. |
| `app/api/attempts/[id]/route.ts` | `PATCH` (TA/professor only) for grading. Replaces `GradeStudents.jsx`'s client `updateDoc({ score })` so students can never self-grade via devtools. |

Client call pattern:

```ts
const idToken = await auth.currentUser!.getIdToken();
const res = await fetch('/api/ai-chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ attemptId, messages }),
});
```

## Migration steps (when you're ready)

1. `npx create-next-app@latest` (App Router, TypeScript) in a fresh branch,
   or progressively: add Next.js alongside Vite is **not** recommended — do a
   clean cutover branch.
2. Copy `next-migration/*` into the new app (`lib/`, `app/api/`, `.env*`).
3. `npm i firebase-admin firebase` (+ existing `@mui/*`, `react-markdown`…).
4. Move pages: `react-router` routes → `app/<route>/page.tsx`
   (`Dashboard` → `app/dashboard/page.tsx`, etc.); `ProtectedRoute` /
   `ProfessorRoute` → middleware + `requireUser()` checks.
5. Replace every `import.meta.env.VITE_OPENROUTER` /
   `VITE_GEMINI_API_KEY` / Cloudinary-secret usage with `fetch('/api/…')`.
6. Never import `firebase-admin` or `lib/firebase-admin` from `'use client'` files.
7. Deploy rules: `firebase deploy --only firestore:rules,storage`.
8. Enable **App Check** (reCAPTCHA Enterprise) + `allow … if appCheck.token…`
   hardening once clients are enrolled.

## Immediate hardening (do today, no migration needed)

- Deploy the new rules: `firebase deploy --only firestore:rules,storage`.
- Rotate the exposed keys: the OpenRouter key and Gemini key were shipped in
  the client bundle (`VITE_*`) — treat them as compromised and regenerate.
- Remove `VITE_OPENROUTER` / `VITE_GEMINI_API_KEY` / `CLOUDINARY_API_SECRET`
  from any client-reachable code path ASAP (the `/api/ai-chat` pattern above).
