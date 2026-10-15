import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { isGuest } from "@/lib/constants";
import { findUserByEmail, freeLoginFor, getUserRow, insertUser, toSessionUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, signupSchema } from "@/lib/validation";

// POST /api/auth/signup : 3 choix à l'inscription.
// - Résident·e ou Entreprise : nom + courriel + mot de passe, SANS validation (pas de @ obligatoire, pas de longueur minimale).
// - Invité·e : juste un nom (voit et rejoint, ne publie pas).
export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });

  const { email, password, displayName, address, description, accountType } = parsed.data;
  const mod = moderate(displayName, address, description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  let login: string;
  if (isGuest(accountType)) {
    login = freeLoginFor(`invité ${displayName}`);
  } else {
    if (!email) return Response.json({ error: "Écris un courriel (n'importe lequel)." }, { status: 400 });
    if (!password) return Response.json({ error: "Choisis un mot de passe (n'importe lequel)." }, { status: 400 });
    if (findUserByEmail(email)) return Response.json({ error: "Ce courriel est déjà utilisé : connecte-toi." }, { status: 409 });
    login = email;
  }

  const id = insertUser({ ...parsed.data, email: login, password: isGuest(accountType) ? "" : password });
  await createSession(id);
  return Response.json({ user: toSessionUser(getUserRow(id)!) }, { status: 201 });
}
