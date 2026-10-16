import type { NextRequest } from "next/server";
import { updateReportStatus } from "@/lib/db";
import { toReport } from "@/lib/reports";
import { sdcRoute } from "@/lib/sdc-admin";
import { reportStatusSchema } from "@/lib/validation";
import { VacancyError } from "@/lib/vacancies";

// PATCH /api/sdc/signalements/:id { status: recu|en-cours|regle, note? } : la SDC fait avancer un signalement.
// L'auteur voit le nouveau statut et le message dans « Mes signalements ».
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  return sdcRoute(() => {
    const { status, note } = reportStatusSchema.parse(body);
    const row = updateReportStatus(id, status, note);
    if (!row) throw new VacancyError(404, "not_found", "Signalement introuvable.");
    return { report: toReport(row) };
  });
}
