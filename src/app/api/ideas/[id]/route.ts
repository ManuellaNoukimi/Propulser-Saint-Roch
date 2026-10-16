import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { badgesFor } from "@/lib/badges";
import { isEstablishment } from "@/lib/constants";
import { getIdea, listComplices, listInvitationsForIdea, setIdeaHidden, toPublicUser } from "@/lib/db";
import { toInvitations } from "@/lib/invitations";
import type { Badge, IdeaWithComplices } from "@/lib/types";

// GET /api/ideas/:id : la publication, ses complices (avec badges) et, pour l'organisateur·rice, ses invitations
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/ideas/[id]">) {
  const me = await getCurrentUser();
  const { id } = await ctx.params;
  const idea = getIdea(id, me?.id ?? null);
  if (!idea) return Response.json({ error: "Cette publication n'existe pas (ou plus)." }, { status: 404 });

  const cache = new Map<string, Badge[]>();
  // Rien n'est gardé ni montré pour les résident·e·s (pas de profil) : badges seulement pour les entreprises
  const badges = (userId: string, accountType: string): Badge[] => {
    if (!isEstablishment(accountType)) return [];
    if (!cache.has(userId)) cache.set(userId, badgesFor(userId));
    return cache.get(userId)!;
  };
  const isMine = me?.id === idea.organizer.id;
  const invitations = toInvitations(listInvitationsForIdea(id));

  const full: IdeaWithComplices = {
    ...idea,
    organizerBadges: badges(idea.organizer.id, idea.organizer.accountType),
    isMine,
    complices: listComplices(id).map((c) => ({
      id: c.id,
      ideaId: c.idea_id,
      user: toPublicUser({ ...c, id: c.user_id }),
      contribution: c.contribution as IdeaWithComplices["complices"][number]["contribution"],
      message: c.message,
      createdAt: c.created_at,
      badges: badges(c.user_id, c.account_type),
    })),
    invitations: isMine ? invitations : [],
    myInvitation: me ? (invitations.find((i) => i.to.id === me.id) ?? null) : null,
  };
  return Response.json({ idea: full });
}

// PATCH /api/ideas/:id : masquer ou réafficher sa propre publication (F3, publications importées).
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/ideas/[id]">) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { hidden?: unknown } | null;
  if (typeof body?.hidden !== "boolean") return Response.json({ error: "Indique hidden (true ou false)." }, { status: 400 });

  if (!setIdeaHidden(id, me.id, body.hidden)) {
    return Response.json({ error: "Cette publication n'existe pas, ou elle n'est pas à toi." }, { status: 404 });
  }
  return Response.json({ hidden: body.hidden });
}
