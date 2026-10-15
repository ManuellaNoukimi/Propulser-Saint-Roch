import "server-only";
import { isInSaintRoch } from "./geo";
import { SAINT_ROCH_BOUNDS } from "./saint-roch-boundary";

// Adresses via Nominatim (OpenStreetMap), appelé par NOTRE serveur : l'adresse IP des gens n'est jamais transmise.
// Règles d'utilisation de Nominatim respectées : au plus 1 requête par seconde, un User-Agent qui identifie l'app,
// pas d'autocomplétion à chaque lettre (on cherche seulement quand la personne valide) et des résultats mis en cache.
const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "Complices-SaintRoch/0.1 (prototype, Hackathon Ville de Quebec 2026)";
const MIN_GAP_MS = 1100;

type CacheEntry = { value: unknown; expires: number };
const g = globalThis as unknown as { __geoCache?: Map<string, CacheEntry>; __geoLast?: number };
const cache = (g.__geoCache ??= new Map());

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load(); // une erreur n'est pas mise en cache
  if (cache.size > 1000) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

// File d'attente simple : au moins 1,1 s entre deux appels à Nominatim (tous utilisateurs confondus).
async function throttle() {
  const now = Date.now();
  const slot = Math.max(now, (g.__geoLast ?? 0) + MIN_GAP_MS);
  g.__geoLast = slot;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

async function nominatim(pathAndQuery: string): Promise<unknown> {
  await throttle();
  const res = await fetch(`${NOMINATIM}${pathAndQuery}`, {
    headers: { "User-Agent": UA, "Accept-Language": "fr" },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

type NomAddress = { house_number?: string; road?: string; pedestrian?: string; footway?: string; square?: string; neighbourhood?: string; suburb?: string };
type NomPlace = { lat: string; lon: string; name?: string; display_name?: string; address?: NomAddress };

// « Rue Saint-Joseph Est » → « rue Saint-Joseph Est » (usage québécois : le générique en minuscule)
const GENERIC = /^(Rue|Boulevard|Avenue|Côte|Place|Chemin|Ruelle|Montée|Allée|Impasse|Promenade|Terrasse|Carré|Passage|Escalier|Sentier|Route)\b/;
const tidy = (road: string) => road.replace(GENERIC, (m) => m.toLowerCase());

function streetLabel(a: NomAddress | undefined): string | null {
  const road = a?.road ?? a?.pedestrian ?? a?.footway ?? a?.square;
  if (!road) return null;
  return a?.house_number ? `${a.house_number}, ${tidy(road)}` : tidy(road);
}

export type GeoLabel = { label: string | null; detail: string | null };

/** Adresse lisible d'un point (ex. « 295, boulevard Charest Est »). label = null si inconnue ou si le service ne répond pas. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoLabel> {
  try {
    return await cached(`r:${lat.toFixed(5)},${lng.toFixed(5)}`, 24 * 3600_000, async () => {
      const p = (await nominatim(`/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`)) as NomPlace;
      const street = streetLabel(p.address);
      const name = p.name && p.name !== street ? p.name : null;
      return { label: name ?? street, detail: name ? street : (p.address?.neighbourhood ?? p.address?.suburb ?? null) };
    });
  } catch {
    return { label: null, detail: null };
  }
}

export type GeoResult = { label: string; detail: string | null; lat: number; lng: number };

/** Recherche d'une adresse ou d'un lieu, limitée à Saint-Roch. null = service indisponible (pas d'Internet ?). */
export async function searchPlaces(q: string): Promise<GeoResult[] | null> {
  const [[w, s], [e, n]] = SAINT_ROCH_BOUNDS;
  const query = /qu[ée]bec/i.test(q) ? q : `${q}, Québec`;
  try {
    return await cached(`s:${query.toLowerCase()}`, 6 * 3600_000, async () => {
      const list = (await nominatim(
        `/search?format=jsonv2&q=${encodeURIComponent(query)}&viewbox=${w},${n},${e},${s}&bounded=1&countrycodes=ca&limit=8&addressdetails=1&accept-language=fr`,
      )) as NomPlace[];
      const seen = new Set<string>();
      const out: GeoResult[] = [];
      for (const p of list) {
        const lat = Number(p.lat);
        const lng = Number(p.lon);
        if (!isInSaintRoch(lng, lat)) continue;
        const street = streetLabel(p.address);
        const label = p.name || street || p.display_name?.split(",")[0] || "Lieu";
        const detail = p.name && street ? street : null;
        if (seen.has(`${label}|${detail}`)) continue;
        seen.add(`${label}|${detail}`);
        out.push({ label, detail, lat, lng });
      }
      return out.slice(0, 6);
    });
  } catch {
    return null;
  }
}
