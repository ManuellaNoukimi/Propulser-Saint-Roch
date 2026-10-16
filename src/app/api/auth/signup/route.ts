import { isResidentAccount } from "@/lib/resident-points";
import { referralInviter, registerResidentReferral } from "@/lib/resident-progress";
import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { isGuest } from "@/lib/constants";
import { findUserByEmail, freeLoginFor, getDb, getUserRow, insertUser, toSessionUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, signupSchema } from "@/lib/validation";

// POST /api/auth/signup : 3 choix à l'inscription.
// - Résident·e ou Entreprise : nom + courriel + mot de passe, SANS validation (pas de @ obligatoire, pas de longueur minimale).
// - Invité·e : juste un nom (voit et rejoint, ne publie pas).
// - Code d'invitation facultatif (progression des résidents) : réservé aux comptes résidents, le parrain gagne des points.
export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });

  const { email, password, displayName, address, description, accountType } = parsed.data;
  const mod = moderate(displayName, address, description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  const code = parsed.data.referralCode;
  const inviter = code ? referralInviter(code) : null;
  if (code && (!inviter || !isResidentAccount(accountType))) return Response.json({ error: "Code d’invitation invalide ou réservé aux résidents." }, { status: 400 });

  let login: string;
  if (isGuest(accountType)) {
    login = freeLoginFor(`invité ${displayName}`);
  } else {
    if (!email) return Response.json({ error: "Écris un courriel (n'importe lequel)." }, { status: 400 });
    if (!password) return Response.json({ error: "Choisis un mot de passe (n'importe lequel)." }, { status: 400 });
    if (findUserByEmail(email)) return Response.json({ error: "Ce courriel est déjà utilisé : connecte-toi." }, { status: 409 });
    login = email;
  }

  const id = getDb().transaction(() => {
    const created = insertUser({ ...parsed.data, email: login, password: isGuest(accountType) ? "" : password });
    if (inviter) registerResidentReferral(created, inviter);
    return created;
  }).immediate();
  await createSession(id);
  return Response.json({ user: toSessionUser(getUserRow(id)!) }, { status: 201 });
}
