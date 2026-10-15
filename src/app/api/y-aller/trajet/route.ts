import { connection, type NextRequest } from "next/server";
import { planTrip } from "@/lib/y-aller";
import type { LatLng, Mode } from "@/lib/y-aller-types";

const MODES: Mode[] = ["auto", "bus", "velo", "marche"];
// Région de Québec seulement (le service de trajets n'est pas fait pour traverser le pays)
function point(v: string | null): LatLng | null {
  const [lat, lng] = (v ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 46.4 && lat < 47.4 && lng > -72.2 && lng < -70.6 ? { lat, lng } : null;
}

// GET /api/y-aller/trajet?mode=auto|bus|velo|marche&from=lat,lng&to=lat,lng[&parking=id] → l'itinéraire porte à porte.
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") as Mode;
  const from = point(sp.get("from"));
  const to = point(sp.get("to"));
  if (!MODES.includes(mode)) return Response.json({ error: "Choisis un moyen de transport." }, { status: 400 });
  if (!from || !to) return Response.json({ error: "Le départ et l'arrivée doivent être dans la région de Québec." }, { status: 400 });
  return Response.json(await planTrip(mode, from, to, sp.get("parking"), new Date()));
}
