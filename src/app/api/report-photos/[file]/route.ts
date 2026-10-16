import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { ownsReportPhoto, REPORT_PHOTO_DIR } from "@/lib/db";
import { PHOTO_FILE_RE, PHOTO_TYPES, REPORT_PHOTO_ROUTE } from "@/lib/reports";
import { isSdc } from "@/lib/vacancies";

// GET /api/report-photos/<id>.<ext> : photo d'un signalement, servie SEULEMENT à son auteur et à la SDC qui le traite
// (sinon 404, comme si elle n'existait pas).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/report-photos/[file]">) {
  const { file } = await ctx.params;
  const me = await getCurrentUser();
  if (!me || !PHOTO_FILE_RE.test(file) || !(isSdc(me.id) || ownsReportPhoto(me.id, `${REPORT_PHOTO_ROUTE}${file}`))) {
    return new Response("Introuvable", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ REPORT_PHOTO_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": PHOTO_TYPES[file.split(".").pop()!], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
