// Prépare les données « Y aller » tirées d'OpenStreetMap (données ouvertes, licence ODbL) :
// stationnements, supports à vélo, stations àVélo (secours si le flux en direct ne répond pas) et bornes de recharge
// autour de Saint-Roch. Résultat : donnees-ouvertes/osm-mobilite.json (lu par l'app, sans appel à Overpass pendant la démo).
// Utilisation : node scripts/osm-mobilite.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BBOX = "46.803,-71.245,46.828,-71.208"; // sud, ouest, nord, est : Saint-Roch et ses abords
const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const QUERY = `[out:json][timeout:90];
(
  nwr[amenity=parking](${BBOX});
  nwr[amenity=parking_entrance](${BBOX});
  nwr[amenity=bicycle_parking](${BBOX});
  nwr[amenity=bicycle_rental](${BBOX});
  nwr[amenity=charging_station](${BBOX});
  nwr[amenity=car_sharing](${BBOX});
);
out geom tags;`;

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
function center(e) {
  if (e.lat != null) return { lat: e.lat, lng: e.lon };
  if (e.center) return { lat: e.center.lat, lng: e.center.lon };
  const g = e.geometry ?? [];
  if (g.length) return { lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lon, 0) / g.length };
  if (e.bounds) return { lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lng: (e.bounds.minlon + e.bounds.maxlon) / 2 };
  return null;
}
// Surface d'un polygone (m²), pour estimer le nombre de places d'un stationnement extérieur sans capacité connue
function area(geometry) {
  if (!geometry || geometry.length < 4) return 0;
  const lat0 = (geometry[0].lat * Math.PI) / 180;
  const pts = geometry.map((p) => [p.lon * 111_320 * Math.cos(lat0), p.lat * 110_540]);
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}
const int = (v) => (v && /^\d+$/.test(v.trim()) ? Number(v.trim()) : null);
const yesNo = (v) => (v === "yes" ? true : v === "no" ? false : null);
const address = (t) => (t["addr:street"] ? `${t["addr:housenumber"] ? `${t["addr:housenumber"]}, ` : ""}${t["addr:street"]}` : null);

const data = await overpass();
const entrances = [];
const out = { source: "© les contributeurs d'OpenStreetMap (ODbL)", generatedAt: new Date().toISOString(), parkings: [], bikeParkings: [], bikeStations: [], charging: [], carSharing: [] };

for (const e of data.elements) {
  const t = e.tags ?? {};
  const c = center(e);
  if (!c) continue;
  const base = { id: `osm-${e.type[0]}${e.id}`, lat: round(c.lat), lng: round(c.lng) };
  switch (t.amenity) {
    case "parking": {
      const access = t.access ?? null;
      // Les stationnements privés sont gardés aussi (la carte de fond les montre) : marqués « prive », jamais proposés pour se garer
      const closed = ["private", "no", "permit", "delivery"].includes(access);
      const type = t.parking === "multi-storey" ? "etage" : t.parking === "underground" ? "souterrain" : t.parking === "street_side" || t.parking === "lane" ? "rue" : "surface";
      let capacity = int(t.capacity);
      let estimated = false;
      if (capacity == null && type === "surface" && e.type === "way") {
        const est = Math.round(area(e.geometry) / 28); // environ 28 m² par place, allées comprises
        if (est >= 5) [capacity, estimated] = [est, true];
      }
      out.parkings.push({
        ...base,
        name: t.name ?? null,
        kind: closed ? "prive" : access === "customers" ? "clients" : access || t.name || t.operator || t.fee ? "public" : "inconnu",
        type,
        capacity,
        estimated,
        fee: yesNo(t.fee),
        charge: t.charge ?? null,
        maxstay: t.maxstay ?? null,
        operator: t.operator ?? null,
        disabled: int(t["capacity:disabled"]),
        address: address(t),
        website: t.website ?? null,
      });
      break;
    }
    case "parking_entrance": // entrée d'un stationnement souterrain ou étagé : ajoutée plus bas si son stationnement manque
      entrances.push({ ...base, t });
      break;
    case "bicycle_parking":
      out.bikeParkings.push({ ...base, capacity: int(t.capacity), covered: t.covered === "yes" });
      break;
    case "bicycle_rental":
      out.bikeStations.push({ ...base, name: t.name ?? "Station àVélo", capacity: int(t.capacity) });
      break;
    case "charging_station":
      out.charging.push({ ...base, name: t.name ?? t.operator ?? "Borne de recharge", operator: t.operator ?? null, capacity: int(t.capacity) });
      break;
    case "car_sharing":
      out.carSharing.push({ ...base, name: t.name ?? t.operator ?? "Autopartage", operator: t.operator ?? null });
      break;
  }
}

// Entrées sans stationnement connu à moins de 80 m : la carte de fond les montre, on les garde comme stationnements
const meters = (a, b) => Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180));
for (const { t, ...e } of entrances) {
  if (out.parkings.some((p) => meters(p, e) < 80)) continue;
  const access = t.access ?? null;
  out.parkings.push({
    ...e,
    name: t.name ?? null,
    kind: ["private", "no", "permit", "delivery"].includes(access) ? "prive" : access === "customers" ? "clients" : access || t.name || t.operator ? "public" : "inconnu",
    type: t.parking === "multi-storey" ? "etage" : "souterrain",
    capacity: int(t.capacity),
    estimated: false,
    fee: yesNo(t.fee),
    charge: t.charge ?? null,
    maxstay: t.maxstay ?? null,
    operator: t.operator ?? null,
    disabled: int(t["capacity:disabled"]),
    address: address(t),
    website: t.website ?? null,
  });
}

const dir = path.join(import.meta.dirname, "..", "donnees-ouvertes");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "osm-mobilite.json"), JSON.stringify(out));
console.log(`stationnements ${out.parkings.length}, supports vélo ${out.bikeParkings.length}, stations vélo ${out.bikeStations.length}, bornes ${out.charging.length}, autopartage ${out.carSharing.length}`);
