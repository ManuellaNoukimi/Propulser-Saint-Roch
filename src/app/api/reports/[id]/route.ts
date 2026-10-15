import type { NextRequest } from "next/server";
import { getCurrentUser, NOT_LOGGED_IN } from "@/lib/auth";
import { deleteOwnReport } from "@/lib/db";
import { removeReportPhotos } from "@/lib/reports";

// DELETE /api/reports/:id : retirer un de SES signalements (et ses photos).
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/reports/[id]">) {
  const me = await getCurrentUser();
  if (!me) return Response.json(NOT_LOGGED_IN, { status: 401 });
  const { id } = await ctx.params;
  const photos = deleteOwnReport(id, me.id);
  if (!photos) return Response.json({ error: "Signalement introuvable." }, { status: 404 });
  await removeReportPhotos(photos);
  return Response.json({ ok: true });
}
