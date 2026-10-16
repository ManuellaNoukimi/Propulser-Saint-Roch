import { connection, type NextRequest } from "next/server";
import { suggestPlaces } from "@/lib/y-aller";

// GET /api/y-aller/lieux?q=… → { results, unavailable } : suggestions pendant la frappe
// (événements, lieux de Saint-Roch, stationnements municipaux, puis adresses de la région de Québec).
export async function GET(req: NextRequest) {
  await connection();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ results: [], unavailable: false });
  return Response.json(await suggestPlaces(q, new Date()));
}
