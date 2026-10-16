import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { findUserByLogin, freeLoginFor, getUserRow, insertUser, toSessionUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { verifyPassword } from "@/lib/password";
import { firstError, loginSchema } from "@/lib/validation";

// POST /api/auth/login
// - { email, password } : résident·e ou entreprise. Le courriel n'a aucun format imposé ; on accepte aussi le nom.
//   Le mot de passe est vérifié si le compte en a un. Aucun compte n'est créé ici : on s'inscrit sur /inscription.
// - { guest: true, name } : « Entrer en invité·e » → compte invité (juste un nom) : il voit et rejoint, mais ne publie pas.
export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { email, password, guest, name } = parsed.data;

  if (guest) {
    // Le nom est obligatoire : les organisateurs doivent savoir qui vient (pas d'invité·e anonyme)
    const displayName = name.trim();
    if (!displayName) return Response.json({ error: "Écris ton nom pour entrer en invité·e." }, { status: 400 });
    const mod = moderate(displayName);
    if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
    const id = insertUser({ email: freeLoginFor(`invité ${displayName}`), password: "", displayName, accountType: "invite", sector: null, address: null, description: null });
    await createSession(id);
    return Response.json({ user: toSessionUser(getUserRow(id)!), created: true }, { status: 201 });
  }

  if (!email) return Response.json({ error: "Écris ton courriel (ou ton nom)." }, { status: 400 });
  const user = findUserByLogin(email);
  if (!user) return Response.json({ error: "Aucun compte avec ce courriel. Inscris-toi, ou entre en invité·e." }, { status: 401 });
  if (user.password_hash.startsWith("scrypt$") && !verifyPassword(password, user.password_hash)) {
    return Response.json({ error: "Mot de passe incorrect pour ce compte." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ user: toSessionUser(user) });
}
