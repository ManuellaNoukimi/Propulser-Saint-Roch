import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { countPendingInvitations, getIdea, insertInvitations, listInvitationsFrom, listInvitationsTo } from "@/lib/db";
import { toInvitations } from "@/lib/invitations";
import { firstError, inviteSchema } from "@/lib/validation";

// GET /api/invitations : mes invitations reçues (« Tu es invité·e à… ») et envoyées (avec leur réponse)
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  return Response.json({
    received: toInvitations(listInvitationsTo(me.id)),
    sent: toInvitations(listInvitationsFrom(me.id)),
    pending: countPendingInvitations(me.id),
  });
}

// POST /api/invitations { ideaId, invites: [{ userId, contribution, reason }] } : l'organisateur·rice invite ses complices
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const idea = getIdea(parsed.data.ideaId, me.id);
  if (!idea) return Response.json({ error: "Cette idée n'existe pas (ou plus)." }, { status: 404 });
  if (idea.organizer.id !== me.id) return Response.json({ error: "Seule la personne qui a lancé l'idée peut inviter." }, { status: 403 });
  const sent = insertInvitations(idea.id, me.id, parsed.data.invites);
  return Response.json({ sent }, { status: 201 });
}
