// Prépare les commerces, bureaux et organismes NOMMÉS de Saint-Roch tirés d'OpenStreetMap (données ouvertes, ODbL),
// pour « Collaborer » et l'annuaire : nom, type (office / shop / amenity / craft…), position exacte, site web.
// Résultat : donnees-ouvertes/osm-entreprises.json (lu par l'app, sans appel à Overpass pendant la démo).
// Utilisation : node scripts/osm-entreprises.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BBOX = "46.8075,-71.2410,46.8242,-71.2165"; // sud, ouest, nord, est : Saint-Roch (filtré ensuite par la limite officielle dans l'app)
const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const AMENITIES = "restaurant|cafe|bar|pub|fast_food|ice_cream|clinic|dentist|doctors|pharmacy|veterinary|theatre|cinema|arts_centre|community_centre|social_facility|social_centre|coworking_space|school|college|university|kindergarten|childcare|bank|library|studio|nightclub|marketplace";
const QUERY = `[out:json][timeout:90];
(
  nwr["name"]["office"](${BBOX});
  nwr["name"]["shop"](${BBOX});
  nwr["name"]["amenity"~"^(${AMENITIES})$"](${BBOX});
  nwr["name"]["craft"](${BBOX});
  nwr["name"]["tourism"~"^(hotel|hostel|guest_house|gallery|museum)$"](${BBOX});
  nwr["name"]["leisure"~"^(fitness_centre|sports_centre|dance)$"](${BBOX});
);
out center tags;`;

async function overpass() {
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "User-Agent": "Complices-SaintRoch/0.1 (Hackathon Ville de Quebec 2026)", "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(QUERY)}`,
          signal: AbortSignal.timeout(100_000),
        });
        const text = await res.text();
        if (res.ok && text.startsWith("{")) return JSON.parse(text);
        console.warn(`${url} : ${res.status}`);
      } catch (e) {
        console.warn(`${url} : ${e.message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 10_000 * (attempt + 1)));
  }
  throw new Error("Aucun serveur Overpass n'a répondu");
}

const round = (n) => Math.round(n * 1e6) / 1e6;
const data = await overpass();
const seen = new Set();
const places = [];
for (const e of data.elements ?? []) {
  const t = e.tags ?? {};
  const at = e.lat != null ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : null;
  if (!at || !t.name) continue;
  const key = ["office", "shop", "amenity", "craft", "tourism", "leisure"].find((k) => t[k]);
  const kind = key ? `${key}=${t[key]}` : "autre";
  const id = `${t.name.toLowerCase()}|${round(at.lat).toFixed(4)}|${round(at.lng).toFixed(4)}`;
  if (seen.has(id)) continue;
  seen.add(id);
  const street = t["addr:street"] ?? null;
  const number = t["addr:housenumber"] ?? null;
  places.push({
    id: `osm-${e.type[0]}${e.id}`,
    name: t.name,
    kind,
    cuisine: t.cuisine ?? null,
    address: street ? `${number ? `${number}, ` : ""}${street}` : null,
    website: t.website ?? t["contact:website"] ?? null,
    lat: round(at.lat),
    lng: round(at.lng),
  });
}
places.sort((a, b) => a.name.localeCompare(b.name, "fr"));
const out = path.join(process.cwd(), "donnees-ouvertes", "osm-entreprises.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source: "OpenStreetMap (ODbL), © contributeurs OpenStreetMap", generatedAt: new Date().toISOString(), places }, null, 0));
console.log(`${places.length} lieux nommés enregistrés dans ${out}`);
