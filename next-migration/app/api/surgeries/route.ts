// GET /api/surgeries — any signed-in user.
// POST /api/surgeries — professor only (replaces client-side addDoc from AddSurgery.jsx).
import { adminDb, requireUser, toErrorResponse } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const snap = await adminDb.collection('surgeries').get();
    return Response.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(request, ['professor']);
    const { title, category, description, sceneName } = await request.json();
    if (!title || !category || !description || !sceneName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const ref = await adminDb.collection('surgeries').add({
      title,
      category,
      description,
      sceneName,
      createdAt: new Date(),
    });
    return Response.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
