import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cityEvents } from "./city-events";
import { listIdeas } from "./db";
import { isInSaintRoch } from "./geo";
import { foldPlace, KNOWN_PLACES, knownPlace, locatePlace } from "./place-coords";
import type { BikeRack, BikeStation, BusOption, BusStop, Charger, GoEvent, LatLng, Layers, Leg, Mode, NearBike, NearParking, Parking, Place, Trip } from "./y-aller-types";

// « Y aller » côté serveur : stationnements, vélos, bus, recherche d'adresses et trajets.
// Sources (toutes lues à l'exécution, rien de recopié dans le code) :
//  - stationnements municipaux : fichier de la Ville « TMI - StationnementsHorsRueMunicipaux » (dossier Données fournies) ;
//  - OpenStreetMap (ODbL) : autres stationnements, supports à vélo, bornes → donnees-ouvertes/osm-mobilite.json (scripts/osm-mobilite.mjs) ;
//  - RTC (GTFS, données ouvertes) : arrêts, lignes et horaires → donnees-ouvertes/rtc-bus.json (scripts/rtc-saint-roch.mjs) ;
//  - àVélo (flux GBFS officiel, en direct) : vélos et places libres ;
//  - Ville de Québec (données ouvertes) : adresses → donnees-ouvertes/adresses-quebec.json (scripts/adresses-quebec.mjs) ;
//  - iCherche (gouvernement du Québec), Photon en secours : grands lieux ; routing.openstreetmap.de (OSRM) : trajets auto, vélo, à pied.

const UA = "Complices-SaintRoch/0.1 (prototype, Hackathon Ville de Quebec 2026)";
const OPEN_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "donnees-ouvertes");
const TMI_FILE =
  process.env.COMPLICES_PARKING_GEOJSON ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "Données fournies", "TMI - StationnementsHorsRueMunicipaux-k.geojson");
const GBFS = "https://quebec.publicbikesystem.net/customer/gbfs/v2/fr";
const ZONE = { s: 46.8, n: 46.83, w: -71.25, e: -71.205 }; // Saint-Roch et ses abords
const inZone = (p: LatLng) => p.lat > ZONE.s && p.lat < ZONE.n && p.lng > ZONE.w && p.lng < ZONE.e;

// ---------- Outils ----------
export function distance(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Minutes de marche (environ 4,5 km/h, avec les détours des rues). */
export const walkMin = (meters: number) => Math.max(1, Math.round((meters * 1.3) / 75));

type Cached<T> = { key: string | number; value: T; expires: number };
const g = globalThis as unknown as Record<string, Cached<unknown> | Map<string, Cached<unknown>> | undefined>;

function fileCache<T>(name: string, file: string, parse: (text: string) => T, fallback: T): T {
  let mtime: number;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    return fallback;
  }
  const hit = g[name] as Cached<T> | undefined;
  if (hit && hit.key === mtime) return hit.value;
  try {
    const value = parse(readFileSync(file, "utf8"));
    g[name] = { key: mtime, value, expires: Infinity };
    return value;
  } catch {
    return fallback;
  }
}

const memo = (g.__yallerMemo ??= new Map()) as Map<string, Cached<unknown>>;
async function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  if (memo.size > 2000) memo.clear();
  memo.set(key, { key, value, expires: Date.now() + ttlMs });
  return value;
}

// ---------- Données ----------
type OsmFile = {
  parkings: (Omit<Parking, "source" | "kind" | "type" | "name"> & { name: string | null; kind: Parking["kind"]; type: Parking["type"] })[];
  bikeParkings: { id: string; lat: number; lng: number; capacity: number | null; covered: boolean }[];
  bikeStations: { id: string; lat: number; lng: number; name: string; capacity: number | null }[];
  charging: { id: string; lat: number; lng: number; name: string; operator: string | null; capacity: number | null }[];
};
const osm = () =>
  fileCache<OsmFile>("__yallerOsm", path.join(OPEN_DIR, "osm-mobilite.json"), JSON.parse, { parkings: [], bikeParkings: [], bikeStations: [], charging: [] });

type RtcFile = {
  routes: Record<string, { short: string; name: string; color: string; text: string }>;
  stops: Record<string, [string, string, number, number]>; // code, nom, lat, lng
  patterns: { r: string; h: string; s: string[]; o: number[]; d: Record<"semaine" | "samedi" | "dimanche", number[]> }[];
};
type Rtc = RtcFile & { stopList: { id: string; lat: number; lng: number }[]; byStop: Map<string, [number, number][]> };
const rtc = () =>
  fileCache<Rtc | null>(
    "__yallerRtc",
    path.join(OPEN_DIR, "rtc-bus.json"),
    (text) => {
      const f = JSON.parse(text) as RtcFile;
      const byStop = new Map<string, [number, number][]>();
      f.patterns.forEach((p, pi) => p.s.forEach((s, pos) => byStop.set(s, [...(byStop.get(s) ?? []), [pi, pos]])));
      const stopList = Object.entries(f.stops).map(([id, s]) => ({ id, lat: s[2], lng: s[3] }));
      return { ...f, stopList, byStop };
    },
    null,
  );

type Feature = { properties: Record<string, unknown>; geometry: { coordinates: [number, number] } };
const villeParkings = () =>
  fileCache<Parking[]>(
    "__yallerTmi",
    TMI_FILE,
    (text) =>
      (JSON.parse(text).features as Feature[]).map((f, i) => {
        const p = f.properties;
        const name = String(p.NOM ?? "Stationnement municipal");
        const cases = Number(p.NOMBRE_DE_CASES);
        return {
          id: `ville-${i}`,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          name,
          source: "ville",
          kind: "ville",
          type: /int/i.test(String(p.TYPE_INT_EXT ?? "")) ? "interieur" : "surface",
          capacity: Number.isFinite(cases) && cases > 0 ? cases : null,
          estimated: false,
          fee: null,
          charge: null,
          maxstay: null,
          operator: "Ville de Québec",
          address: p["ADRESSE_À_PROXIMITÉ"] ? String(p["ADRESSE_À_PROXIMITÉ"]) : null,
          website: null,
        } satisfies Parking;
      }),
    [],
  );

const TYPE_LABEL: Record<Parking["type"], string> = { interieur: "Stationnement intérieur", etage: "Stationnement étagé", souterrain: "Stationnement souterrain", surface: "Stationnement", rue: "Stationnement dans la rue" };

/** Tous les stationnements ouverts au public : ceux de la Ville d'abord, puis OpenStreetMap (sans les doublons). */
export function parkings(): Parking[] {
  const ville = villeParkings();
  const others: Parking[] = osm()
    .parkings.filter((p) => !ville.some((v) => distance(v, p) < 70))
    .map((p) => ({ ...p, source: "osm", name: p.name ?? (p.kind === "clients" ? "Stationnement pour la clientèle" : TYPE_LABEL[p.type]) }));
  return [...ville, ...others];
}

/** Stations àVélo en direct (vélos et places libres), sinon la liste OpenStreetMap. */
export async function bikeStations(): Promise<BikeStation[]> {
  try {
    const info = await remember("gbfs:info", 3600_000, async () => {
      const r = await fetch(`${GBFS}/station_information`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`GBFS ${r.status}`);
      return ((await r.json()).data.stations as { station_id: string; name: string; lat: number; lon: number; capacity?: number }[]).filter((s) => inZone({ lat: s.lat, lng: s.lon }));
    });
    const status = await remember("gbfs:status", 30_000, async () => {
      const r = await fetch(`${GBFS}/station_status`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`GBFS ${r.status}`);
      const list = (await r.json()).data.stations as { station_id: string; num_bikes_available: number; num_docks_available: number; is_renting: boolean }[];
      return new Map(list.map((s) => [s.station_id, s]));
    });
    return info.map((s) => {
      const st = status.get(s.station_id);
      return { id: `avelo-${s.station_id}`, name: s.name, lat: s.lat, lng: s.lon, capacity: s.capacity ?? null, bikes: st ? (st.is_renting ? st.num_bikes_available : 0) : null, docks: st?.num_docks_available ?? null, live: !!st };
    });
  } catch {
    return osm().bikeStations.filter(inZone).map((s) => ({ ...s, bikes: null, docks: null, live: false }));
  }
}

function busStopsInZone(): BusStop[] {
  const R = rtc();
  if (!R) return [];
  return R.stopList.filter(inZone).map((s) => {
    const [code, name] = R.stops[s.id];
    const lines = [...new Set((R.byStop.get(s.id) ?? []).map(([pi]) => R.routes[R.patterns[pi].r]?.short).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
    return { id: s.id, code, name, lat: s.lat, lng: s.lng, lines };
  });
}

/** Tout ce qu'on affiche sur la carte « Y aller ». */
export async function layers(): Promise<Layers> {
  const all = parkings();
  const stations = await bikeStations();
  const ville = all.filter((p) => p.source === "ville");
  const otherInSR = all.filter((p) => p.source === "osm" && p.kind !== "inconnu" && isInSaintRoch(p.lng, p.lat));
  const R = rtc();
  const busStops = busStopsInZone();
  return {
    parkings: all,
    bikeStations: stations,
    bikeRacks: osm().bikeParkings.filter(inZone) as BikeRack[],
    busStops,
    chargers: osm().charging.filter(inZone) as Charger[],
    stats: {
      villeLots: ville.length,
      villePlaces: ville.reduce((s, p) => s + (p.capacity ?? 0), 0),
      otherLots: otherInSR.length,
      otherPlaces: otherInSR.reduce((s, p) => s + (p.capacity ?? 0), 0),
      bikeStations: stations.length,
      bikesNow: stations.some((s) => s.live) ? stations.reduce((s, x) => s + (x.bikes ?? 0), 0) : null,
      busLines: R ? new Set(busStops.flatMap((s) => s.lines)).size : 0,
    },
    sources: [
      "Stationnements municipaux : Ville de Québec",
      "Autres stationnements, supports à vélo, bornes : © contributeurs OpenStreetMap (ODbL)",
      "Bus : RTC, horaires GTFS (données ouvertes)",
      "Vélos en direct : àVélo (RTC)",
    ],
  };
}

// ---------- Heure de Québec ----------
const QC = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" });
function quebecClock(now: Date) {
  const p = Object.fromEntries(QC.formatToParts(now).map((x) => [x.type, x.value]));
  const wallUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const offset = wallUtc - Math.floor(now.getTime() / 60_000) * 60_000; // décalage de Québec par rapport à UTC
  const day: "semaine" | "samedi" | "dimanche" = p.weekday === "Sat" ? "samedi" : p.weekday === "Sun" ? "dimanche" : "semaine";
  return { minutes: +p.hour * 60 + +p.minute, day, midnight: Date.UTC(+p.year, +p.month - 1, +p.day) - offset };
}

// ---------- Trajets (OSRM) ----------
const PROFILE: Record<"auto" | "velo" | "marche", string> = { auto: "routed-car", velo: "routed-bike", marche: "routed-foot" };
const SPEED: Record<"auto" | "velo" | "marche", number> = { auto: 25 / 3.6, velo: 15 / 3.6, marche: 4.5 / 3.6 }; // m/s, si le service ne répond pas

async function route(mode: "auto" | "velo" | "marche", a: LatLng, b: LatLng): Promise<Leg & { approx: boolean }> {
  const key = `osrm:${mode}:${a.lat.toFixed(5)},${a.lng.toFixed(5)};${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
  try {
    return await remember(key, 15 * 60_000, async () => {
      const url = `https://routing.openstreetmap.de/${PROFILE[mode]}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
      const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(7000) });
      const d = await r.json();
      if (!r.ok || d.code !== "Ok" || !d.routes?.[0]) throw new Error("OSRM");
      const rt = d.routes[0];
      return { mode, coords: (rt.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]), distance: rt.distance, duration: rt.duration, dashed: mode === "marche", approx: false };
    });
  } catch {
    const dist = distance(a, b) * 1.3;
    return { mode, coords: [[a.lat, a.lng], [b.lat, b.lng]], distance: dist, duration: dist / SPEED[mode], dashed: true, approx: true };
  }
}

const GMAPS_MODE: Record<Mode, string> = { auto: "driving", bus: "transit", velo: "bicycling", marche: "walking" };
const externalUrl = (mode: Mode, from: LatLng, to: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${GMAPS_MODE[mode]}`;

const near = <T extends LatLng>(list: T[], p: LatLng) => list.map((x) => ({ ...x, distance: distance(x, p) })).sort((a, b) => a.distance - b.distance);

/** Les stationnements où se garer près d'un point (ouverts au public, du plus proche au plus loin). */
export function parkingsNear(p: LatLng, max = 5): NearParking[] {
  const open = parkings().filter((x) => x.kind === "ville" || x.kind === "public");
  return near(open, p)
    .filter((x, i) => i < 3 || x.distance < 900)
    .slice(0, max)
    .map((x) => ({ ...x, walkMin: walkMin(x.distance) }));
}

// ---------- Bus (horaires du RTC) ----------
export function planBus(from: LatLng, to: LatLng, now: Date): BusOption[] {
  const R = rtc();
  if (!R) return [];
  const clock = quebecClock(now);
  const around = (p: LatLng, max: number) =>
    R.stopList
      .map((s) => ({ id: s.id, d: distance(s, p) }))
      .filter((s) => s.d <= max)
      .sort((a, b) => a.d - b.d)
      .slice(0, 30);
  const origins = around(from, 800);
  const dests = new Map(around(to, 700).map((s) => [s.id, s.d]));
  if (!origins.length || !dests.size) return [];

  type Cand = { pi: number; i: number; j: number; wo: number; wd: number; score: number };
  const best = new Map<number, Cand>(); // un seul choix par parcours
  for (const o of origins) {
    const wo = walkMin(o.d);
    for (const [pi, i] of R.byStop.get(o.id) ?? []) {
      const p = R.patterns[pi];
      for (let j = i + 1; j < p.s.length; j++) {
        const dd = dests.get(p.s[j]);
        if (dd === undefined) continue;
        const wd = walkMin(dd);
        const score = wo + (p.o[j] - p.o[i]) + wd;
        const cur = best.get(pi);
        if (!cur || score < cur.score) best.set(pi, { pi, i, j, wo, wd, score });
      }
    }
  }

  const options: (BusOption & { key: string })[] = [];
  for (const c of best.values()) {
    const p = R.patterns[c.pi];
    const route = R.routes[p.r];
    const atStop = p.d[clock.day].map((t) => t + p.o[c.i]).filter((t) => t >= clock.minutes + c.wo);
    if (!atStop.length) continue;
    const ride = p.o[c.j] - p.o[c.i];
    const first = atStop[0];
    const arrival = first + ride + c.wd;
    const iso = (min: number) => new Date(clock.midnight + min * 60_000).toISOString();
    const [fc, fn, flat, flng] = R.stops[p.s[c.i]];
    const [tc, tn, tlat, tlng] = R.stops[p.s[c.j]];
    const color = `#${route?.color || "1a73e8"}`;
    options.push({
      key: `${route?.short}|${p.h}`,
      line: route?.short ?? "?",
      color,
      textColor: `#${route?.text || "ffffff"}`,
      headsign: p.h,
      from: { name: fn, code: fc, lat: flat, lng: flng, walkMin: c.wo },
      to: { name: tn, code: tc, lat: tlat, lng: tlng, walkMin: c.wd },
      stops: c.j - c.i,
      rideMin: ride,
      departures: atStop.slice(0, 3).map(iso),
      arrival: iso(arrival),
      totalMin: arrival - clock.minutes,
      legs: [
        { mode: "marche", coords: [[from.lat, from.lng], [flat, flng]], distance: distance(from, { lat: flat, lng: flng }), duration: c.wo * 60, dashed: true },
        { mode: "bus", coords: p.s.slice(c.i, c.j + 1).map((s) => [R.stops[s][2], R.stops[s][3]] as [number, number]), distance: 0, duration: ride * 60, color },
        { mode: "marche", coords: [[tlat, tlng], [to.lat, to.lng]], distance: distance({ lat: tlat, lng: tlng }, to), duration: c.wd * 60, dashed: true },
      ],
    });
  }
  // Une option par ligne et direction (la plus rapide), puis les 4 qui arrivent le plus tôt
  const seen = new Set<string>();
  return options
    .sort((a, b) => a.totalMin - b.totalMin)
    .filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)))
    .slice(0, 4);
}

// ---------- Itinéraire porte à porte ----------
export async function planTrip(mode: Mode, from: LatLng, to: LatLng, parkingId: string | null, now: Date): Promise<Trip> {
  const base = { mode, externalUrl: externalUrl(mode, from, to) };
  if (mode === "bus") {
    const bus = planBus(from, to, now);
    if (!bus.length) {
      return { ...base, ok: false, approx: false, duration: 0, distance: distance(from, to), legs: [], bus: [], message: "Aucun bus direct trouvé pour l'instant. Regarde l'itinéraire détaillé (avec correspondances) ou essaie le vélo." };
    }
    return { ...base, ok: true, approx: false, duration: bus[0].totalMin * 60, distance: distance(from, to), legs: bus[0].legs, bus };
  }
  if (mode === "auto") {
    const options = parkingsNear(to, 5);
    const chosen = (parkingId && parkings().find((p) => p.id === parkingId)) || options.find((p) => (p.capacity ?? 0) >= 15) || options[0];
    if (!chosen) {
      const leg = await route("auto", from, to);
      return { ...base, ok: true, approx: leg.approx, duration: leg.duration, distance: leg.distance, legs: [leg], parkings: [] };
    }
    const d = distance(chosen, to);
    const parking: NearParking = { ...chosen, distance: d, walkMin: walkMin(d) };
    const [drive, walk] = await Promise.all([route("auto", from, chosen), route("marche", chosen, to)]);
    return {
      ...base,
      ok: true,
      approx: drive.approx || walk.approx,
      duration: drive.duration + walk.duration,
      distance: drive.distance + walk.distance,
      legs: [drive, { ...walk, dashed: true }],
      parking,
      parkings: [parking, ...options.filter((p) => p.id !== parking.id)].slice(0, 5),
    };
  }
  const leg = await route(mode, from, to);
  const trip: Trip = { ...base, ok: true, approx: leg.approx, duration: leg.duration, distance: leg.distance, legs: [leg] };
  if (mode === "velo") {
    const stations = await bikeStations();
    const tag = (list: (BikeStation & { distance: number })[]): NearBike[] => list.map((s) => ({ ...s, walkMin: walkMin(s.distance) }));
    trip.bikesFrom = tag(near(stations, from).filter((s) => s.distance < 900 && (s.bikes ?? 1) > 0).slice(0, 2));
    trip.bikesTo = tag(near(stations, to).filter((s) => s.distance < 900 && (s.docks ?? 1) > 0).slice(0, 2));
    trip.racks = near(osm().bikeParkings, to).filter((r) => r.distance < 400).slice(0, 3).map((r) => ({ ...r, walkMin: walkMin(r.distance) }));
  }
  return trip;
}

// ---------- Événements (activités de l'app + événements de la Ville à Saint-Roch) ----------
export async function goEvents(now: Date): Promise<GoEvent[]> {
  const t = now.getTime();
  const out: GoEvent[] = [];
  let lookups = 3; // recherches d'adresse en ligne par appel (les résultats sont mis en cache)
  const locate = async (name: string) => locatePlace(name, lookups-- > 0);

  for (const idea of listIdeas(null)) {
    if (!idea.startsAt) continue;
    const start = new Date(idea.startsAt).getTime();
    const end = start + 3 * 3600_000;
    if (end < t) continue;
    const at = await locate(idea.place);
    if (!at) continue;
    out.push({ id: `app-${idea.id}`, ...at, title: idea.title, place: idea.place, startsAt: idea.startsAt, endsAt: null, status: start <= t ? "live" : "upcoming", source: "app", type: null, href: `/p/${idea.id}`, url: null, cost: null, description: idea.description.slice(0, 220) });
  }
  for (const ev of await cityEvents()) {
    const start = new Date(ev.startsAt).getTime();
    const end = ev.endsAt ? new Date(ev.endsAt).getTime() : start + 3 * 3600_000;
    if (end < t) continue;
    const site = ev.sites.find((s) => knownPlace(s)) ?? ev.sites[0] ?? "";
    const at = knownPlace(site) ?? (site ? await locate(site) : null);
    if (!at) continue;
    out.push({ id: ev.id, ...at, title: ev.title, place: ev.sites.join(" · ") || site, startsAt: ev.startsAt, endsAt: ev.endsAt, status: start <= t ? "live" : "upcoming", source: "ville", type: ev.type, href: null, url: ev.url, cost: ev.cost, description: ev.description });
  }
  return out.sort((a, b) => (a.status === b.status ? (a.startsAt ?? "").localeCompare(b.startsAt ?? "") : a.status === "live" ? -1 : 1));
}

// ---------- Suggestions d'adresses et de lieux ----------
// 1) Adresses officielles de la Ville (donnees-ouvertes/adresses-quebec.json, scripts/adresses-quebec.mjs) : instantané, sans Internet.
// 2) Lieux connus (cégeps, universités, arénas…) : iCherche, service officiel du gouvernement du Québec ; Photon en secours.
type Street = { name: string; words: string[]; area: string; nums: (string | number)[] };
const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const streets = () =>
  fileCache<Street[]>(
    "__yallerAdresses",
    path.join(OPEN_DIR, "adresses-quebec.json"),
    (text) => (JSON.parse(text).streets as [string, string, (string | number)[]][]).map(([name, area, nums]) => ({ name, words: words(name), area, nums })),
    [],
  );

function searchAddresses(q: string): Place[] {
  const all = words(q);
  const num = /^\d+$/.test(all[0] ?? "") ? all[0] : null;
  const want = num ? all.slice(1) : all;
  if (!want.length || want.join("").length < 3) return [];
  const matches = streets()
    .filter((s) => want.every((w) => s.words.some((sw) => sw.startsWith(w))))
    .map((s) => ({
      s,
      // d'abord les rues qui ont ce numéro, puis le centre-ville (La Cité-Limoilou), puis les noms les plus proches
      score: (num && !s.nums.some((n, i) => i % 3 === 0 && String(n) === num) ? 20 : 0) + (s.area === "La Cité-Limoilou" ? 0 : 10) + s.words.length - want.filter((w) => s.words.includes(w)).length,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  const at = (s: Street, i: number): LatLng => ({ lat: 46 + Number(s.nums[i + 1]) / 1e5, lng: -71 + Number(s.nums[i + 2]) / 1e5 });
  return matches.map(({ s }) => {
    if (num) {
      let best = 0;
      for (let i = 0; i < s.nums.length; i += 3) if (Math.abs(Number(s.nums[i]) - Number(num)) < Math.abs(Number(s.nums[best]) - Number(num))) best = i;
      return { label: `${s.nums[best]}, ${s.name}`, detail: s.area, ...at(s, best), kind: "adresse" } satisfies Place;
    }
    const mid = Math.floor(s.nums.length / 6) * 3; // une adresse au milieu de la rue
    return { label: s.name, detail: s.area, ...at(s, mid), kind: "adresse" } satisfies Place;
  });
}

const inRegion = (lat: number, lng: number) => lat > 46.6 && lat < 47.15 && lng > -71.75 && lng < -70.9;
type GeoFeature = { geometry?: { type: string; coordinates: unknown } | null; properties: Record<string, string | undefined> };
function pointOf(geometry: GeoFeature["geometry"]): LatLng | null {
  if (!geometry) return null;
  let c = geometry.coordinates as unknown;
  while (Array.isArray(c) && Array.isArray(c[0]) && Array.isArray((c[0] as unknown[])[0])) c = c[0]; // polygone → premier anneau
  if (Array.isArray(c) && Array.isArray(c[0])) {
    const ring = c as [number, number][];
    return { lng: ring.reduce((s, p) => s + p[0], 0) / ring.length, lat: ring.reduce((s, p) => s + p[1], 0) / ring.length };
  }
  return Array.isArray(c) && typeof c[0] === "number" ? { lng: c[0] as number, lat: c[1] as number } : null;
}

async function onlinePlaces(q: string): Promise<Place[] | null> {
  try {
    return await remember(`icherche:${q.toLowerCase()}`, 3600_000, async () => {
      const r = await fetch(`https://geoegl.msp.gouv.qc.ca/apis/icherche/geocode?q=${encodeURIComponent(q)}&type=lieux&limit=15&geometry=true`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(3500) });
      if (!r.ok) throw new Error(`iCherche ${r.status}`);
      return ((await r.json()).features as GeoFeature[]).flatMap((f) => {
        const at = pointOf(f.geometry);
        if (!at || !inRegion(at.lat, at.lng)) return [];
        return [{ label: f.properties.nom ?? "Lieu", detail: [f.properties.adresse, f.properties.municipalite].filter(Boolean).join(" · ") || null, ...at, kind: "lieu" } satisfies Place];
      });
    });
  } catch {
    try {
      return await remember(`photon:${q.toLowerCase()}`, 3600_000, async () => {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=46.815&lon=-71.225&limit=8&lang=fr`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(3000) });
        if (!r.ok) throw new Error(`Photon ${r.status}`);
        return ((await r.json()).features as GeoFeature[]).flatMap((f) => {
          const at = pointOf(f.geometry);
          const p = f.properties;
          if (!at || !inRegion(at.lat, at.lng) || !p.name) return [];
          return [{ label: p.name, detail: [p.street ? `${p.housenumber ? `${p.housenumber}, ` : ""}${p.street}` : null, p.district || p.city].filter(Boolean).join(" · ") || null, ...at, kind: "lieu" } satisfies Place];
        });
      });
    } catch {
      return null;
    }
  }
}

export async function suggestPlaces(q: string, now: Date): Promise<{ results: Place[]; unavailable: boolean }> {
  const want = foldPlace(q).split(" ").filter(Boolean);
  const hit = (s: string) => { const f = foldPlace(s); return want.every((w) => f.includes(w)); };
  const local: Place[] = [];
  for (const ev of await goEvents(now)) if (hit(`${ev.title} ${ev.place}`)) local.push({ label: ev.title, detail: ev.place, lat: ev.lat, lng: ev.lng, kind: "evenement" });
  for (const p of KNOWN_PLACES) if (hit(p.name)) local.push({ label: p.name, detail: "Saint-Roch", lat: p.lat, lng: p.lng, kind: "lieu" });
  for (const p of parkings()) if (p.source === "ville" && hit(`${p.name} ${p.address ?? ""}`)) local.push({ label: p.name, detail: p.address, lat: p.lat, lng: p.lng, kind: "stationnement" });
  const addresses = searchAddresses(q);
  const startsWithNumber = /^\s*\d/.test(q);
  const online = q.trim().length >= 3 && !startsWithNumber ? await onlinePlaces(q.trim()) : [];
  const results = [...local.slice(0, 4), ...(startsWithNumber ? addresses : [...(online ?? []).slice(0, 4), ...addresses])];
  const seen = new Set<string>();
  return {
    results: results.filter((r) => { const k = `${foldPlace(r.label)}|${r.lat.toFixed(3)},${r.lng.toFixed(3)}`; return seen.has(k) ? false : (seen.add(k), true); }).slice(0, 8),
    unavailable: online === null && !addresses.length && !local.length,
  };
}

/** Résumé « Comment y aller » autour d'un lieu : stationnements, arrêts de bus, àVélo. */
export async function around(p: LatLng) {
  const stops = near(busStopsInZone(), p).filter((s) => s.distance < 500).slice(0, 3).map((s) => ({ ...s, walkMin: walkMin(s.distance) }));
  const stations = near(await bikeStations(), p).filter((s) => s.distance < 600).slice(0, 2).map((s) => ({ ...s, walkMin: walkMin(s.distance) }));
  return { parkings: parkingsNear(p, 3), busStops: stops, bikeStations: stations };
}
