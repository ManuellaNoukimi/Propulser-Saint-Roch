import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { getUserRow, toSessionUser, updateUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, profileUpdateSchema } from "@/lib/validation";

// PATCH /api/auth/profile : modifier son profil (nom, type, secteur, adresse, bio)
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.displayName, parsed.data.address, parsed.data.description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  updateUser(me.id, parsed.data);
  return Response.json({ user: toSessionUser(getUserRow(me.id)!) });
}
