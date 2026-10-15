import type { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { createSession } from "@/lib/auth";
import { findUserByLogin, freeLoginFor, getUserRow, insertUser, toSessionUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { verifyPassword } from "@/lib/password";
import { firstError, loginSchema } from "@/lib/validation";

// Démo de 5 minutes, SANS mot de passe ni courriel (demande de Danny) : on entre avec un prénom ou un pseudo.
// Pour remettre la vérification du mot de passe (avant toute mise en ligne) : COMPLICES_STRICT_AUTH=1.
const STRICT = process.env.COMPLICES_STRICT_AUTH === "1";

/** Nom affiché tiré de l'identifiant (« marie.tremblay@… » → « Marie Tremblay ») : un courriel ne s'affiche jamais. */
function nameFromLogin(login: string): string {
  const base = login.split("@")[0].replace(/[._\-+]+/g, " ").trim() || "Voisin·e";
  return base
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 60);
}

// POST /api/auth/login { email: prénom, pseudo ou courriel } ou { guest: true }
// Le compte existe → on ouvre la session. Il n'existe pas → on le crée (habitant·e) et on ouvre la session.
export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { email, password, guest } = parsed.data;

  if (!guest && !email) return Response.json({ error: "Écris ton prénom ou un pseudo." }, { status: 400 });
  const login = guest ? `invité·e ${randomInt(1000, 9999)}` : email!;

  const user = guest ? undefined : findUserByLogin(login);
  if (!user) {
    const displayName = guest ? `Invité·e ${login.split(" ")[1]}` : nameFromLogin(login);
    const mod = moderate(displayName);
    if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
    const id = insertUser({ email: freeLoginFor(login), password, displayName, accountType: "habitant", sector: null, address: null, description: null });
    await createSession(id);
    return Response.json({ user: toSessionUser(getUserRow(id)!), created: true }, { status: 201 });
  }
  if (STRICT && !verifyPassword(password, user.password_hash)) {
    return Response.json({ error: "Mot de passe incorrect pour ce compte." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ user: toSessionUser(user) });
}
