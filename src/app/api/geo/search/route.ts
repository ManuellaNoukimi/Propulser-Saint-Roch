import { connection, type NextRequest } from "next/server";
import { searchPlaces } from "@/lib/geocode";

// GET /api/geo/search?q=… → { results: [{ label, detail, lat, lng }] } : adresses et lieux DANS Saint-Roch.
// unavailable: true si le service d'adresses ne répond pas (la carte reste utilisable à la main).
export async function GET(req: NextRequest) {
  await connection();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ results: [] });
  const results = await searchPlaces(q);
  return Response.json(results ? { results } : { results: [], unavailable: true });
}
