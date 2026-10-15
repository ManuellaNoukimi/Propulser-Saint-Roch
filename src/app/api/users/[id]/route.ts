import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BADGES, badgesFor, statsFor } from "@/lib/badges";
import { isEstablishment } from "@/lib/constants";
import { getUserRow, listIdeasByOrganizer, listIdeasJoinedBy, toPublicUser } from "@/lib/db";
import type { PublicProfile } from "@/lib/types";

// GET /api/users/:id : profil public (comme un profil Instagram) — jamais le courriel
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const me = await getCurrentUser();
  const { id } = await ctx.params;
  const row = getUserRow(id);
  if (!row) return Response.json({ error: "Ce profil n'existe pas." }, { status: 404 });
  // Seules les entreprises ont une page publique. Les résident·e·s n'ont pas de profil (on voit seulement leur nom sur leurs publications).
  if (!isEstablishment(row.account_type)) return Response.json({ error: "Les résident·e·s n'ont pas de page publique." }, { status: 404 });

  const profile: PublicProfile = {
    user: toPublicUser(row),
    stats: statsFor(id),
    badges: badgesFor(id),
    allBadges: Object.values(BADGES),
    ideas: listIdeasByOrganizer(id, me?.id ?? null),
    joined: listIdeasJoinedBy(id, me?.id ?? null),
    isMe: me?.id === id,
  };
  return Response.json(profile);
}
