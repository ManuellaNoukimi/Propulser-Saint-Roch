import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { isGuest, reportCategoryOf } from "@/lib/constants";
import { insertReport, listReportsByUser } from "@/lib/db";
import { isInSaintRoch } from "@/lib/geo";
import { moderate } from "@/lib/moderation";
import { checkPhotos, saveReportPhotos, toReport } from "@/lib/reports";
import { firstError, reportSchema } from "@/lib/validation";

const PRIVATE = { "Cache-Control": "private, no-store" };
const GUEST_CANNOT_REPORT = {
  error: "Pour signaler, crée un compte résident : on pourra te dire où en est ton signalement.",
  code: "invite",
} as const;

// GET /api/reports : MES signalements seulement (personne d'autre ne voit ceux des autres ; jamais dans les publications).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401, headers: PRIVATE });
  return Response.json({ reports: listReportsByUser(me.id).map(toReport) }, { headers: PRIVATE });
}

// POST /api/reports : signaler une situation (itinérance, propreté, infraction, dégât, vandalisme) à un endroit de Saint-Roch.
// Deux formats : JSON { category, subtype?, description, moment?, address?, lat, lng }
// ou multipart (champ « data » = ce JSON, champs « photos » = jusqu'à 3 images ; jamais pour l'itinérance).
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  if (isGuest(me.account_type)) return Response.json(GUEST_CANNOT_REPORT, { status: 403 });

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
  const { category, subtype, description, moment, address, lat, lng } = parsed.data;
  if (!isInSaintRoch(lng, lat)) {
    return Response.json({ error: "Choisis un endroit à l'intérieur de Saint-Roch (la zone en pointillés)." }, { status: 422 });
  }
  // Itinérance : on aide une personne, on ne la photographie pas
  if (photos.length && !reportCategoryOf(category)!.photos) {
    return Response.json({ error: "Pas de photo pour un signalement d'itinérance : on protège la personne." }, { status: 400 });
  }
  const mod = moderate(description, address);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 422 });
  const bad = checkPhotos(photos);
  if (bad) return Response.json({ error: bad.error }, { status: bad.status });

  const urls = await saveReportPhotos(photos);
  const row = insertReport(me.id, { category, subtype, description, moment, address, photos: urls, lat, lng });
  return Response.json({ report: toReport(row) }, { status: 201, headers: PRIVATE });
}
