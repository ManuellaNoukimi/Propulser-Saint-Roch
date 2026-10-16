// Prépare les suggestions d'adresses « Y aller » à partir des données ouvertes de la Ville de Québec (CC BY 4.0) :
//  - « Adresses de la Ville de Québec » (vdq-adresse.csv : numéro, rue, coordonnées) ;
//  - « Voies publiques » (vdq-voiepublique.csv : le nom des rues AVEC les accents).
// Résultat compact : donnees-ouvertes/adresses-quebec.json (recherche instantanée, sans service en ligne).
// Utilisation :
//   curl -o /tmp/vdq-adresse.csv https://www.donneesquebec.ca/recherche/dataset/2567eac8-a3ce-423a-a43d-6b8e74708c1d/resource/cef2c0b7-8eac-4466-9a0b-6987501edace/download/vdq-adresse.csv
//   curl -o /tmp/vdq-voiepublique.csv https://www.donneesquebec.ca/recherche/dataset/e4915d10-9c33-47a8-8e06-cf39306ef583/resource/00bac318-9f36-4d29-9ad6-a0dcb5219235/download/vdq-voiepublique.csv
//   node scripts/adresses-quebec.mjs /tmp/vdq-adresse.csv /tmp/vdq-voiepublique.csv
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const [adrFile, voieFile] = process.argv.slice(2);
if (!adrFile || !voieFile) throw new Error("Donne les deux fichiers CSV");

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
  return out;
}
function rows(file) {
  const lines = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const head = parseLine(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(parseLine(l).map((v, i) => [head[i], v.trim()])));
}
const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// 1) Noms de rues avec accents : « Rue des Épinettes », « Carré Lépine »… (générique en minuscule, usage québécois)
const pretty = new Map();
for (const v of rows(voieFile)) {
  const name = [v.NOM_TOPOGRAPHIE, v.DIRECTION].filter(Boolean).join(" ").trim();
  if (!name) continue;
  const nice = name.replace(/^\S+/, (g) => g.toLowerCase());
  pretty.set(fold(name), nice);
  if (!pretty.has(fold(v.NOM_TOPOGRAPHIE))) pretty.set(fold(v.NOM_TOPOGRAPHIE), v.NOM_TOPOGRAPHIE.replace(/^\S+/, (g) => g.toLowerCase()));
}

// 2) Adresses regroupées par rue
const ORIENT = { E: "Est", O: "Ouest", N: "Nord", S: "Sud" };
const TYPES = { RUE: "rue", AV: "avenue", BOUL: "boulevard", CH: "chemin", CAR: "carré", RTE: "route", COTE: "côte", PLACE: "place", RANG: "rang", IMP: "impasse", QUAI: "quai", RLE: "ruelle", TSSE: "terrasse", ALLEE: "allée", AUT: "autoroute", MONTEE: "montée", PASS: "passage", COURS: "cours" };
const streets = new Map();
let missing = 0;
for (const a of rows(adrFile)) {
  const lat = Number(a.LATITUDE);
  const lng = Number(a.LONGITUDE);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !a.NO_CIVIQUE) continue;
  // Nom de la rue reconstitué à partir des colonnes (NOM_VOIE contient déjà « de la » ; RECHERCHE contient parfois « A » ou « Unité : 2 »)
  const raw = [TYPES[a.TYPE_VOIE] ?? a.TYPE_VOIE, a.NOM_VOIE, ORIENT[a.ORIENTATION]].filter(Boolean).join(" ");
  const key = fold(raw);
  let s = streets.get(key);
  if (!s) {
    let name = pretty.get(key);
    if (!name) {
      missing++;
      // Pas trouvé dans les voies publiques : « RUE DE LA COURONNE » → « rue de la Couronne »
      const small = new Set(["de", "du", "des", "la", "le", "les", "l", "d"]);
      name = raw.toLowerCase().replace(/[a-zà-ÿ]+/g, (w, i) => (i === 0 || small.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
    }
    s = { name, area: a.ARRONDISSEMENT, nums: [] };
    streets.set(key, s);
  }
  if (s.seen?.has(a.NO_CIVIQUE)) continue;
  (s.seen ??= new Set()).add(a.NO_CIVIQUE);
  s.nums.push(a.NO_CIVIQUE, Math.round(lat * 1e5) - 4_600_000, Math.round(lng * 1e5) + 7_100_000);
}

const out = {
  source: "Ville de Québec, Adresses et Voies publiques (données ouvertes, CC BY 4.0)",
  generatedAt: new Date().toISOString(),
  // [nom de la rue, arrondissement, [numéro, lat, lng, numéro, lat, lng…]] ; lat = 46 + x / 1e5, lng = -71 + y / 1e5
  streets: [...streets.values()].map((s) => [s.name, s.area, s.nums]),
};
const dir = path.join(import.meta.dirname, "..", "donnees-ouvertes");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "adresses-quebec.json"), JSON.stringify(out));
console.log(`rues ${streets.size} (sans accents trouvés : ${missing}), adresses ${[...streets.values()].reduce((n, s) => n + s.nums.length / 3, 0)}`);
