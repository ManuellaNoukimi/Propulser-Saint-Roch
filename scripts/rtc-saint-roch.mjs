// Prépare les lignes de bus du RTC qui desservent Saint-Roch, à partir des horaires officiels (GTFS, données ouvertes du RTC).
// Résultat compact : donnees-ouvertes/rtc-bus.json = arrêts, lignes et « parcours » (suite d'arrêts + heures de départ
// pour un jour de semaine, un samedi et un dimanche). L'app s'en sert pour proposer « Prends le 800 à tel arrêt ».
// Utilisation :
//   curl -o /tmp/rtc.zip https://cdn.rtcquebec.ca/Site_Internet/DonneesOuvertes/googletransit.zip
//   unzip -o /tmp/rtc.zip -d /tmp/rtc && node scripts/rtc-saint-roch.mjs /tmp/rtc
import { createReadStream, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const dir = process.argv[2];
if (!dir) throw new Error("Donne le dossier du GTFS décompressé");

// Zone desservie : Saint-Roch et ses abords (on garde les parcours qui y passent)
const ZONE = { s: 46.805, n: 46.826, w: -71.243, e: -71.21 };

function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function table(name) {
  const lines = readFileSync(path.join(dir, name), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const head = parseLine(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(parseLine(l).map((v, i) => [head[i], v])));
}
async function* streamTable(name) {
  const rl = readline.createInterface({ input: createReadStream(path.join(dir, name)), crlfDelay: Infinity });
  let head = null;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, "");
    if (!line) continue;
    if (!head) { head = parseLine(line); continue; }
    const v = parseLine(line);
    yield Object.fromEntries(v.map((x, i) => [head[i], x]));
  }
}
const toMin = (t) => { const [h, m, s] = t.split(":").map(Number); return h * 60 + m + Math.round((s || 0) / 60); };

// 1) Un jour type de chaque sorte : semaine (mardi à jeudi), samedi, dimanche
const dates = [...new Set(table("calendar_dates.txt").filter((r) => r.exception_type === "1").map((r) => r.date))].sort();
const dayOf = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8))).getUTCDay();
const ref = {
  semaine: dates.find((d) => [2, 3, 4].includes(dayOf(d))),
  samedi: dates.find((d) => dayOf(d) === 6),
  dimanche: dates.find((d) => dayOf(d) === 0),
};
const serviceDay = new Map(); // service_id → semaine / samedi / dimanche
for (const r of table("calendar_dates.txt")) for (const [k, d] of Object.entries(ref)) if (r.date === d && r.exception_type === "1") serviceDay.set(r.service_id, k);
console.log("jours de référence", ref);

// 2) Lignes, arrêts, voyages
const routes = new Map(table("routes.txt").map((r) => [r.route_id, { short: r.route_short_name, name: r.route_desc || r.route_long_name, color: r.route_color.replace("#", ""), text: r.route_text_color.replace("#", "") }]));
const stops = new Map(table("stops.txt").map((s) => [s.stop_id, { code: s.stop_code, name: s.stop_desc || s.stop_name, lat: +s.stop_lat, lng: +s.stop_lon }]));
const trips = new Map();
for (const t of table("trips.txt")) {
  const day = serviceDay.get(t.service_id);
  if (day) trips.set(t.trip_id, { route: t.route_id, dir: t.direction_id, headsign: t.trip_headsign, day, stops: [] });
}

// 3) Heures de passage (gros fichier : lu en continu)
for await (const st of streamTable("stop_times.txt")) {
  const trip = trips.get(st.trip_id);
  if (trip) trip.stops.push([+st.stop_sequence, st.stop_id, toMin(st.departure_time || st.arrival_time)]);
}

// 4) Parcours = suite d'arrêts identique pour une ligne et une direction
const inZone = (id) => { const s = stops.get(id); return s && s.lat > ZONE.s && s.lat < ZONE.n && s.lng > ZONE.w && s.lng < ZONE.e; };
const patterns = new Map();
for (const trip of trips.values()) {
  if (trip.stops.length < 2) continue;
  trip.stops.sort((a, b) => a[0] - b[0]);
  const ids = trip.stops.map((s) => s[1]);
  if (!ids.some(inZone)) continue;
  const key = `${trip.route}|${trip.dir}|${ids.join(",")}`;
  let p = patterns.get(key);
  if (!p) {
    const t0 = trip.stops[0][2];
    p = { route: trip.route, headsigns: new Map(), stops: ids, offsets: trip.stops.map((s) => s[2] - t0), starts: { semaine: [], samedi: [], dimanche: [] } };
    patterns.set(key, p);
  }
  p.headsigns.set(trip.headsign, (p.headsigns.get(trip.headsign) ?? 0) + 1);
  p.starts[trip.day].push(trip.stops[0][2]);
}

// 5) Fichier compact
const usedStops = new Set();
const outPatterns = [];
for (const p of patterns.values()) {
  p.stops.forEach((s) => usedStops.add(s));
  const headsign = [...p.headsigns.entries()].sort((a, b) => b[1] - a[1])[0][0];
  for (const k of Object.keys(p.starts)) p.starts[k].sort((a, b) => a - b);
  outPatterns.push({ r: p.route, h: headsign, s: p.stops, o: p.offsets, d: p.starts });
}
const out = {
  source: "Réseau de transport de la Capitale (RTC), horaires GTFS, données ouvertes",
  generatedAt: new Date().toISOString(),
  reference: ref,
  routes: Object.fromEntries([...new Set(outPatterns.map((p) => p.r))].map((id) => [id, routes.get(id)])),
  stops: Object.fromEntries([...usedStops].map((id) => { const s = stops.get(id); return [id, [s.code, s.name, Math.round(s.lat * 1e6) / 1e6, Math.round(s.lng * 1e6) / 1e6]]; })),
  patterns: outPatterns,
};
const outDir = path.join(import.meta.dirname, "..", "donnees-ouvertes");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "rtc-bus.json"), JSON.stringify(out));
console.log(`lignes ${Object.keys(out.routes).length}, parcours ${outPatterns.length}, arrêts ${usedStops.size}`);
