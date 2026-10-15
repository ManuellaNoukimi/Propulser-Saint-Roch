import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { freeLoginFor, getUserRow, insertUser, toSessionUser } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { firstError, signupSchema } from "@/lib/validation";

// POST /api/auth/signup : créer un compte (personnel ou établissement) et ouvrir la session.
// Démo sans contrainte : ni courriel ni mot de passe obligatoires. L'identifiant de connexion est le nom choisi
// (rendu unique au besoin : « café du parvis 2 »).
export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });

  const { email, displayName, address, description } = parsed.data;
  const mod = moderate(displayName, address, description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  const id = insertUser({ ...parsed.data, email: freeLoginFor(email || displayName) });
  await createSession(id);
  return Response.json({ user: toSessionUser(getUserRow(id)!) }, { status: 201 });
}
