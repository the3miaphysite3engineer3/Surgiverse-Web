// POST /api/ai-chat — server-side AI proxy (OpenRouter or SovereignEG).
// Replaces the current client-side fetch from AIAssistant.jsx that ships
// VITE_OPENROUTER in the browser bundle. Keys never leave the server.
// Provider selected via AI_PROVIDER env (see lib/ai-providers.ts).
import { adminDb, requireUser, toErrorResponse } from '@/lib/firebase-admin';
import { completeChat } from '@/lib/ai-providers';

export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);
    const { attemptId, messages, model } = (await request.json()) as {
      attemptId: string;
      messages: Array<{ role: string; content: string }>;
      model?: string;
    };
    if (!attemptId || !Array.isArray(messages)) {
      return Response.json({ error: 'attemptId and messages[] required' }, { status: 400 });
    }

    // Authorize: caller must own the attempt or be staff.
    const attemptSnap = await adminDb.doc(`attempts/${attemptId}`).get();
    if (!attemptSnap.exists) return Response.json({ error: 'Attempt not found' }, { status: 404 });
    const ownerUid = attemptSnap.data()?.uid;
    const callerSnap = await adminDb.doc(`users/${uid}`).get();
    const role = callerSnap.data()?.role;
    if (ownerUid !== uid && !(role === 'TA' || role === 'professor')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let content: string;
    let reasoning: unknown;
    try {
      // Optional model override, validated against the Firestore catalog
      // (`ai_models`, seeded from SovereignEG). Unknown/inactive ids fall
      // back to the env default instead of failing the chat.
      // Doc ids sanitize '/' → '--' (see scripts/seed-ai-models.mjs).
      let modelOverride: string | undefined;
      if (typeof model === 'string' && model.length > 0) {
        const snap = await adminDb
          .doc(`ai_models/${model.replaceAll('/', '--')}`)
          .get();
        if (snap.exists && snap.data()?.active !== false) {
          modelOverride = snap.data()?.modelId ?? model;
        }
      }
      ({ content, reasoning } = await completeChat(messages, modelOverride));
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'AI provider failed' },
        { status: 502 },
      );
    }

    // Persist server-side with Admin SDK (bypasses client rules by design —
    // auth was already checked above).
    await adminDb.collection(`attemptChats/${attemptId}/messages`).add({
      role: 'ai',
      content,
      reasoning_details: reasoning ?? null,
      createdAt: new Date(),
    });

    return Response.json({ content });
  } catch (err) {
    return toErrorResponse(err);
  }
}
