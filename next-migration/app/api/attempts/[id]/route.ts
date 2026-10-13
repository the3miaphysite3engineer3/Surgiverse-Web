// PATCH /api/attempts/<id> — TA/professor grades an attempt.
// Replaces the client-side updateDoc({ score }) from GradeStudents.jsx,
// so students can never write their own score even with devtools.
import { adminDb, requireUser, toErrorResponse } from '@/lib/firebase-admin';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireUser(request, ['TA', 'professor']);
    const { score } = (await request.json()) as { score: number };
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return Response.json({ error: 'score must be an integer 0–100' }, { status: 400 });
    }
    await adminDb.doc(`attempts/${params.id}`).update({
      score,
      gradedAt: new Date(),
    });
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
