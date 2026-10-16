import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { BUSINESS_ONLY, isEstablishment } from "@/lib/constants";
import { insertBusinessPost, listIdeas } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { businessPostSchema, firstError } from "@/lib/validation";

// GET /api/entreprises : les publications des entreprises (onglet « Entreprises »), séparées des activités.
export async function GET() {
  const me = await getCurrentUser(); // lit le cookie → route dynamique
  return Response.json({ posts: listIdeas(me?.id ?? null, "entreprise") });
}

// POST /api/entreprises : publier une promo, une nouveauté, un emploi… (comptes Entreprise seulement)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (!isEstablishment(me.account_type)) return Response.json(BUSINESS_ONLY, { status: 403 });

  const parsed = businessPostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const mod = moderate(parsed.data.title, parsed.data.description);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });

  const id = insertBusinessPost(me.id, { ...parsed.data, place: me.address?.trim() || "Saint-Roch" });
  return Response.json({ id }, { status: 201 });
}
