import { connection } from "next/server";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { reportCounts } from "@/lib/db";

// GET /api/reports/stats : chiffres ANONYMES du quartier sur 30 jours (par catégorie et par statut).
// Aucun lieu, aucun texte, aucune personne : seulement des totaux, pour montrer que les signalements sont suivis.
export async function GET() {
  await connection();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = reportCounts(since);
  const byCategory = REPORT_CATEGORIES.map((c) => {
    const mine = rows.filter((r) => r.category === c.id);
    return { id: c.id, total: mine.reduce((s, r) => s + r.n, 0), resolved: mine.filter((r) => r.status === "regle").reduce((s, r) => s + r.n, 0) };
  });
  return Response.json({
    days: 30,
    total: byCategory.reduce((s, c) => s + c.total, 0),
    inProgress: rows.filter((r) => r.status === "en-cours").reduce((s, r) => s + r.n, 0),
    resolved: byCategory.reduce((s, c) => s + c.resolved, 0),
    byCategory,
  });
}
