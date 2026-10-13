// Server-only Firebase Admin SDK singleton.
// ── NEVER import this file (or firebase-admin) from client components. ──
// Route Handlers, Server Actions and Server Components only.
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;
if (!getApps().length) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Hosting providers store the key with literal \n — restore newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
} else {
  app = getApps()[0]!;
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

/** Verify the client's Firebase ID token and return uid + role. */
export async function requireUser(request: Request, allowedRoles?: string[]) {
  const header = request.headers.get('authorization') ?? '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) throw Object.assign(new Error('Missing ID token'), { status: 401 });

  const decoded = await adminAuth.verifyIdToken(idToken);
  const snap = await adminDb.doc(`users/${decoded.uid}`).get();
  const role = snap.data()?.role as string | undefined;

  if (allowedRoles && !allowedRoles.includes(role ?? '')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return { uid: decoded.uid, role };
}

/** Map thrown { status } errors to JSON responses. */
export function toErrorResponse(err: unknown) {
  const status =
    err && typeof err === 'object' && 'status' in err
      ? ((err as { status?: number }).status ?? 500)
      : 500;
  const message = err instanceof Error ? err.message : 'Internal error';
  return Response.json({ error: message }, { status });
}
