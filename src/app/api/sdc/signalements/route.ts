import { connection } from "next/server";
import { listAllReports } from "@/lib/db";
import { toReport } from "@/lib/reports";
import { sdcRoute } from "@/lib/sdc-admin";

// GET /api/sdc/signalements : tous les signalements du quartier, pour la Vue SDC (compte SDC seulement).
// L'auteur reste anonyme : la SDC voit la situation, l'endroit et les photos, jamais qui a signalé.
export async function GET() {
  await connection();
  return sdcRoute(() => ({ reports: listAllReports().map(toReport) }));
}
