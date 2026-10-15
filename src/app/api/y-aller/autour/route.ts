import { connection, type NextRequest } from "next/server";
import { locatePlace } from "@/lib/place-coords";
import { around } from "@/lib/y-aller";

// GET /api/y-aller/autour?lieu=Parc des Pékans (ou ?lat=…&lng=…) → le lieu, puis les stationnements, arrêts de bus et àVélo à côté.
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const name = (sp.get("lieu") ?? "").trim().slice(0, 140);
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const at = Number.isFinite(lat) && Number.isFinite(lng) && sp.has("lat") ? { lat, lng } : name ? await locatePlace(name, true) : null;
  if (!at) return Response.json({ found: false });
  return Response.json({ found: true, place: { ...at, label: name || null }, ...(await around(at)) });
}
