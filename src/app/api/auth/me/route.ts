import { getCurrentUser } from "@/lib/auth";
import { badgesFor, statsFor } from "@/lib/badges";
import { toSessionUser } from "@/lib/db";

// GET /api/auth/me : le compte connecté (ou null), avec ses badges et statistiques
export async function GET() {
  const user = await getCurrentUser(); // lit le cookie → rendu à la requête
  if (!user) return Response.json({ user: null });
  return Response.json({ user: toSessionUser(user), badges: badgesFor(user.id), stats: statsFor(user.id) });
}
