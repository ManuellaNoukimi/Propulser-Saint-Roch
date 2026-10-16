import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { markContactsRead } from "@/lib/contacts";

// POST /api/contacts/lu : marque comme lus les messages reçus.
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  return Response.json({ read: markContactsRead(me.id) });
}
