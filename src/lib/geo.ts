import { SAINT_ROCH_GEOMETRY } from "./saint-roch-boundary";

type Ring = readonly (readonly [number, number] | readonly number[])[];

// Point dans un anneau (lancer de rayon). Coordonnées [lng, lat].
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as number[];
    const [xj, yj] = ring[j] as number[];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Le point est-il dans le quartier Saint-Roch (limite officielle) ? */
export function isInSaintRoch(lng: number, lat: number): boolean {
  const [outer, ...holes] = SAINT_ROCH_GEOMETRY.coordinates as unknown as Ring[];
  return inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h));
}
