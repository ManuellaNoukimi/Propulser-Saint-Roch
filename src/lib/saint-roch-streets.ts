import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isInSaintRoch } from "./geo";
import { streetKey } from "./street-key";

// Rues du quartier, avec un point au milieu de la partie de chaque rue qui est dans Saint-Roch.
// Source : adresses officielles de la Ville (donnees-ouvertes/adresses-quebec.json, données ouvertes CC BY 4.0,
// préparé par scripts/adresses-quebec.mjs). Sert à situer des locaux ou des commerces dont on ne connaît que la rue
// (position approximative de la rue) ou l'adresse complète (point de l'adresse officielle).
const FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "donnees-ouvertes", "adresses-quebec.json");

export type SaintRochStreet = { name: string; key: string; lat: number; lng: number; addresses: number };
type Point = { num: number; label: string; lat: number; lng: number };
type Cache = { mtime: number; streets: SaintRochStreet[]; points: Map<string, { name: string; points: Point[] }> };
const g = globalThis as unknown as { __saintRochStreets2?: Cache };

function load(): Cache | null {
  let mtime: number;
  try {
    mtime = statSync(FILE).mtimeMs;
  } catch {
    return null;
  }
  if (g.__saintRochStreets2?.mtime === mtime) return g.__saintRochStreets2;

  // Format : [nom, arrondissement, [numéro, lat (×1e5 après 46), lng (×1e5 après -71), …]]
  const raw = JSON.parse(readFileSync(FILE, "utf8")) as { streets: [string, string, (string | number)[]][] };
  const byKey = new Map<string, { name: string; points: Point[] }>();
  for (const [name, , nums] of raw.streets) {
    const key = streetKey(name);
    for (let i = 0; i + 2 < nums.length; i += 3) {
      const lat = 46 + Number(nums[i + 1]) / 1e5;
      const lng = -71 + Number(nums[i + 2]) / 1e5;
      if (!isInSaintRoch(lng, lat)) continue;
      const entry = byKey.get(key) ?? { name, points: [] };
      entry.points.push({ num: Number.parseInt(String(nums[i]), 10) || 0, label: String(nums[i]), lat, lng });
      byKey.set(key, entry);
    }
  }
  for (const entry of byKey.values()) entry.points.sort((a, b) => a.num - b.num);
  const streets = [...byKey.entries()].map(([key, { name, points }]) => {
    const middle = points[Math.floor(points.length / 2)]; // adresse du milieu, par numéro civique
    return { name, key, lat: middle.lat, lng: middle.lng, addresses: points.length };
  });
  g.__saintRochStreets2 = { mtime, streets, points: byKey };
  return g.__saintRochStreets2;
}

/** Rues ayant au moins une adresse dans Saint-Roch ([] si le fichier est absent). Relu seulement s'il change. */
export function saintRochStreets(): SaintRochStreet[] {
  return load()?.streets ?? [];
}

export type Located = { lat: number; lng: number; exact: boolean; address: string };

/**
 * Situe une adresse de Saint-Roch : « 350, rue Saint-Joseph Est » → point de l'adresse officielle (exact) ;
 * « rue Saint-Joseph Est » ou un numéro inconnu → milieu de la rue (approximatif). null si la rue n'est pas dans Saint-Roch.
 */
export function locateInSaintRoch(text: string | null | undefined, civic?: string | number | null): Located | null {
  const data = load();
  if (!data || !text) return null;
  const clean = text.replace(/\b[a-z]\d[a-z]\s?\d[a-z]\d\b/gi, " ").replace(/,?\s*(québec|quebec|qc|canada)\b.*$/i, "").trim();
  const m = /^\s*(\d+)\s*[a-z]?\s*,?\s*(.+)$/i.exec(clean);
  const num = civic != null && String(civic).trim() ? Number.parseInt(String(civic), 10) : m ? Number.parseInt(m[1], 10) : null;
  const street = streetKey(m ? m[2] : clean);
  const entry = data.points.get(street);
  if (!entry) return null;
  if (num) {
    const hit = entry.points.find((p) => p.num === num);
    if (hit) return { lat: hit.lat, lng: hit.lng, exact: true, address: `${hit.label}, ${entry.name}` };
  }
  const middle = entry.points[Math.floor(entry.points.length / 2)];
  return { lat: middle.lat, lng: middle.lng, exact: false, address: entry.name };
}

