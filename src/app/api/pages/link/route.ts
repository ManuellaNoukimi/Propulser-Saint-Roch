import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { isEstablishment } from "@/lib/constants";
import { getLinkedPages, insertImportedIdeas, linkPage, unlinkPage } from "@/lib/db";
import { fetchPosts, normalizePosts } from "@/lib/social-import";
import { firstError } from "@/lib/validation";

// F3 — Lier une page Facebook / un compte Instagram, puis importer ses publications.
// L'import est SIMULÉ (voir src/lib/social-import.ts) : l'accès réel aux pages
// d'autres commerces demande App Review + vérification d'entreprise chez Meta.

const bodySchema = z.object({ source: z.enum(["facebook", "instagram", "linkedin"]) });
const ONLY_ESTABLISHMENTS = { error: "Seuls les comptes commerce, entreprise ou organisme peuvent lier une page." } as const;

/** GET : l'état des liaisons du compte connecté. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  return Response.json({ pages: getLinkedPages(me.id) });
}

/** POST : lier une source et importer son lot. Rejouable : rien ne se duplique. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (!isEstablishment(me.account_type)) return Response.json(ONLY_ESTABLISHMENTS, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { source } = parsed.data;

  linkPage(me.id, source, me.display_name);
  const imported = normalizePosts(fetchPosts(source, { id: me.id, accountType: me.account_type, sector: me.sector }));
  // Les publications importées héritent du lieu du commerce ; « commerce » est leur catégorie de fil.
  const added = insertImportedIdeas(me.id, source, imported, "commerce", me.address || "Saint-Roch");

  return Response.json({ pages: getLinkedPages(me.id), added, received: imported.length }, { status: 201 });
}

/** DELETE : délier, et retirer les publications venues de cette source. */
export async function DELETE(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });

  const removed = unlinkPage(me.id, parsed.data.source);
  return Response.json({ pages: getLinkedPages(me.id), removed });
}
