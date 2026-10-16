import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { getUserRow, toSessionUser, updateUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, profileUpdateSchema } from "@/lib/validation";

// PATCH /api/auth/profile : modifier son profil (nom, secteur, adresse, bio). Le type de compte ne change jamais ici.
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.displayName, parsed.data.address, parsed.data.description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  // Le type de compte est fixé à l'inscription (résident·e, entreprise ou invité·e) : on garde toujours celui de la base,
  // quoi que le formulaire envoie.
  updateUser(me.id, { ...parsed.data, accountType: me.account_type as typeof parsed.data.accountType });
  return Response.json({ user: toSessionUser(getUserRow(me.id)!) });
}
