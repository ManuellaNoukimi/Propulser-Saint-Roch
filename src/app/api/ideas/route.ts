import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { insertIdea, listIdeas } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { createIdeaSchema, firstError } from "@/lib/validation";

// GET /api/ideas : le fil (plus récentes d'abord). Lire le cookie rend la route dynamique (pas de prérendu au build).
export async function GET() {
  const me = await getCurrentUser();
  return Response.json({ ideas: listIdeas(me?.id ?? null) });
}

// POST /api/ideas : publier (tous les types de comptes peuvent publier ; il faut être connecté)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });

  const parsed = createIdeaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { title, description, place } = parsed.data;
  const mod = moderate(title, description, place);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  return Response.json({ id: insertIdea(me.id, parsed.data) }, { status: 201 });
}
