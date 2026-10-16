import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { GUEST_CANNOT_POST, isGuest, reportCategoryOf } from "@/lib/constants";
import { insertReport, listReportsByUser } from "@/lib/db";
import { isInSaintRoch } from "@/lib/geo";
import { moderate } from "@/lib/moderation";
import { checkPhotos, saveReportPhotos, toReport } from "@/lib/reports";
import { firstError, reportSchema } from "@/lib/validation";

// GET /api/reports : MES signalements seulement (les autres utilisateurs ne voient jamais ceux des autres).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  return Response.json({ reports: listReportsByUser(me.id).map(toReport) });
}

// POST /api/reports : signaler un besoin ou un problème à un endroit précis de Saint-Roch.
// Deux formats : JSON { category, description?, moment?, address?, lat, lng }
// ou multipart (champ « data » = ce JSON, champs « photos » = jusqu'à 3 images).
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (isGuest(me.account_type)) return Response.json(GUEST_CANNOT_POST, { status: 403 }); // un·e invité·e ne publie pas

  let body: unknown = null;
  let photos: File[] = [];
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    try {
      body = JSON.parse(String(form?.get("data") ?? "null"));
    } catch {
      body = null;
    }
    photos = (form?.getAll("photos") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  } else {
    body = await req.json().catch(() => null);
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { category, description, moment, address, lat, lng } = parsed.data;
  if (!isInSaintRoch(lng, lat)) {
    return Response.json({ error: "Choisis un endroit à l'intérieur de Saint-Roch (la zone en pointillés)." }, { status: 422 });
  }
  const mod = moderate(description, address);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
  const bad = checkPhotos(photos);
  if (bad) return Response.json({ error: bad.error }, { status: bad.status });

  const kind = reportCategoryOf(category)!.kind; // le type découle de la catégorie
  const urls = await saveReportPhotos(photos);
  const row = insertReport(me.id, { kind, category, description, moment, address, photos: urls, lat, lng });
  return Response.json({ report: toReport(row) }, { status: 201 });
}
