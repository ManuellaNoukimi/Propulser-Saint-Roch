import { getCurrentUser } from "@/lib/auth";
import { countPendingInvitations, getIdea, getUserRow, listInvitationsTo } from "@/lib/db";

// GET /api/invitations/count : nombre d'invitations en attente (pastille) + la plus récente (pour la notification)
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ pending: 0, latest: null });
  const latest = listInvitationsTo(me.id).find((i) => i.status === "pending");
  const idea = latest && getIdea(latest.idea_id, null);
  return Response.json({
    pending: countPendingInvitations(me.id),
    latest: latest && idea ? { id: latest.id, ideaId: latest.idea_id, title: idea.title, from: getUserRow(latest.from_id)?.display_name ?? "", createdAt: latest.created_at } : null,
  });
}
