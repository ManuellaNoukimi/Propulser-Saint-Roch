import { destroySession } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}
