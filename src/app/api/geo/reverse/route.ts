import { connection, type NextRequest } from "next/server";
import { reverseGeocode } from "@/lib/geocode";
import { SAINT_ROCH_BOUNDS } from "@/lib/saint-roch-boundary";

// GET /api/geo/reverse?lat=…&lng=… → { label, detail } : l'adresse du point choisi sur la carte (zone de Saint-Roch seulement).
export async function GET(req: NextRequest) {
  await connection();
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const [[w, s], [e, n]] = SAINT_ROCH_BOUNDS;
  const margin = 0.01;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < s - margin || lat > n + margin || lng < w - margin || lng > e + margin) {
    return Response.json({ error: "Point hors de la zone de Saint-Roch." }, { status: 400 });
  }
  return Response.json(await reverseGeocode(lat, lng));
}
