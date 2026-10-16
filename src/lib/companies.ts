import "server-only";
import { statSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { listActors } from "./actors";
import { domainsFor, type DomainId } from "./domains";
import { locateInSaintRoch, type Located } from "./saint-roch-streets";
import { listSdcMembers } from "./sdc-members";

// Les vraies entreprises de Saint-Roch pour « Collaborer » :
//  - les comptes Complices (Commerce / Entreprise / Organisme) : contactables dans l'app ;
//  - le registre des entreprises de la Ville (DEGP, fichier Excel fourni pour le hackathon) : nom et rue ;
//  - la liste des membres de la SDC (déjà importée, avec l'activité officielle).
// Lus À L'EXÉCUTION depuis « Données fournies » : aucune valeur n'est copiée dans le code. Les résidences de tourisme
// (souvent des particuliers) et les locaux vacants sont exclus.
const REGISTRY_FILE =
  process.env.COMPLICES_ENTREPRISES_XLSX ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "Données fournies", "DEGP - Entreprises St-Roch-Rev.xlsx");

type RegistryRow = { name: string; street: string };
const g = globalThis as unknown as { __registry?: { mtime: number; rows: RegistryRow[] } };

const text = (v: ExcelJS.CellValue): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("").trim();
  if (typeof v === "object" && "text" in v) return String(v.text).trim();
  if (typeof v === "object" && "result" in v) return text(v.result as ExcelJS.CellValue);
  return "";
};

async function registry(): Promise<RegistryRow[]> {
  let mtime: number;
  try {
    mtime = statSync(REGISTRY_FILE).mtimeMs;
  } catch {
    return [];
  }
  if (g.__registry?.mtime === mtime) return g.__registry.rows;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(REGISTRY_FILE);
  const ws = wb.worksheets[0];
  const rows: RegistryRow[] = [];
  if (ws) {
    const header = Array.from(ws.getRow(1).values as ExcelJS.CellValue[], (v) => text(v).toLowerCase());
    const col = (name: string) => header.findIndex((h) => h === name);
    const [type, street, brand] = [col("type rue"), col("nom rue"), col("marque de commerce")];
    if (brand >= 0) {
      ws.eachRow((row, i) => {
        if (i === 1) return;
        const v = row.values as ExcelJS.CellValue[];
        const name = text(v[brand]);
        if (!name) return;
        rows.push({ name, street: [text(v[type]).toLowerCase(), text(v[street])].filter(Boolean).join(" ") });
      });
    }
  }
  g.__registry = { mtime, rows };
  return rows;
}


// ---------- Autres sources (lues à l'exécution) ----------
import { readFileSync } from "node:fs";
import { isInSaintRoch } from "./geo";

const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "Données fournies");
const OSM_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "donnees-ouvertes", "osm-entreprises.json");
const cache = globalThis as unknown as { __companySources?: Map<string, { mtime: number; value: unknown }> };
const sources = (cache.__companySources ??= new Map());

async function cached<T>(file: string, load: () => Promise<T> | T, fallback: T): Promise<T> {
  let mtime: number;
  try { mtime = statSync(file).mtimeMs; } catch { return fallback; }
  const hit = sources.get(file);
  if (hit?.mtime === mtime) return hit.value as T;
  try {
    const value = await load();
    sources.set(file, { mtime, value });
    return value;
  } catch (e) {
    console.warn(`Collaborer : source illisible (${path.basename(file)})`, e);
    return fallback;
  }
}

async function sheet(file: string): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const header = Array.from(ws.getRow(1).values as ExcelJS.CellValue[], (v) => text(v));
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const v = row.values as ExcelJS.CellValue[];
    rows.push(Object.fromEntries(header.map((h, k) => [h, text(v[k])]).filter(([h]) => h)));
  });
  return rows;
}
// Listes SharePoint : « 52;#La Cité-Limoilou;#64;#Saint-Roch » → ["La Cité-Limoilou", "Saint-Roch"]
const sharePoint = (s: string) => s.split(";#").map((x) => x.trim()).filter((x) => x && !/^\d+$/.test(x));

type Extra = { name: string; activity: string; street: string; at: Located | null; source: Company["source"] };

/** Organismes reconnus et organismes culturels de La Cité-Limoilou (arrondissement de Saint-Roch). */
async function organismes(): Promise<Extra[]> {
  const out: Extra[] = [];
  const reconnus = await cached(path.join(DATA_DIR, "CP-LSVC-Liste organismes reconnus LSVC-k.xlsx"), () => sheet(path.join(DATA_DIR, "CP-LSVC-Liste organismes reconnus LSVC-k.xlsx")), []);
  for (const r of reconnus) {
    if (!sharePoint(r["Territoire(s)"] ?? "").some((t) => /cit[ée]-limoilou/i.test(t)) || !r["Nom"]) continue;
    out.push({ name: r["Nom"], activity: `Organisme - ${sharePoint(r["Domaine d'intervention"] ?? "").join(", ") || "communautaire"}`, street: "La Cité-Limoilou", at: null, source: "organisme" });
  }
  const culturels = await cached(path.join(DATA_DIR, "CP-LSVC-Liste organismes-k.xlsx"), () => sheet(path.join(DATA_DIR, "CP-LSVC-Liste organismes-k.xlsx")), []);
  for (const r of culturels) {
    if (!sharePoint(r["Arrondissement"] ?? "").some((t) => /cit[ée]-limoilou/i.test(t)) || !r["Organisme"]) continue;
    if (/résilié|resilie/i.test(r["Statut de l'organisme"] ?? "")) continue;
    out.push({ name: r["Organisme"], activity: `Organisme culturel - ${sharePoint(r["Discipline"] ?? "").join(", ") || "culture"}`, street: "La Cité-Limoilou", at: null, source: "organisme" });
  }
  return out;
}

/** Organisateurs des événements de Saint-Roch (fichier des événements de la Ville). */
async function promoteurs(): Promise<Extra[]> {
  const file = path.join(DATA_DIR, "CP-LSVC-Événements à venir-k.xlsx");
  const rows = await cached(file, () => sheet(file), []);
  const out: Extra[] = [];
  for (const r of rows) {
    if (!sharePoint(r["Quartier"] ?? "").some((q) => /saint-roch/i.test(q))) continue;
    const name = (r["Promoteur"] ?? "").trim();
    if (!name || /^ville de qu[ée]bec/i.test(name)) continue;
    const type = sharePoint(r["Type d'activité"] ?? "")[0] ?? "événements";
    const site = (r["Site(s) de l'activité"] ?? "").split("/")[0]?.trim() || "Saint-Roch";
    out.push({ name, activity: `Organise des événements à Saint-Roch - ${type}`, street: site, at: null, source: "promoteur" });
  }
  return out;
}

// Type OpenStreetMap → libellé d'activité en français (sert aussi au classement par domaine)
const OSM_LABELS: [RegExp, string][] = [
  [/^office=(it|telecommunication|software)/, "Services informatiques"],
  [/^office=(architect)/, "Services professionnels - Architectes"],
  [/^office=(engineer|construction_company|surveyor)|^craft=(builder|carpenter|electrician|plumber|roofer|hvac)/, "Services de construction"],
  [/^office=(estate_agent|property_management)/, "Services immobiliers"],
  [/^office=(lawyer|notary|accountant|tax_advisor|financial|insurance|consulting|employment_agency)/, "Services professionnels"],
  [/^office=(advertising_agency|graphic_design|media|newspaper|publisher)/, "Services marketing"],
  [/^office=(ngo|association|union|charity|foundation|religion)/, "Organisme"],
  [/^office=(government|educational_institution)/, "Agence gouvernementale"],
  [/^amenity=(restaurant|fast_food|ice_cream)/, "Restauration - Restaurant"],
  [/^amenity=(cafe)/, "Restauration - Café"],
  [/^amenity=(bar|pub|nightclub)/, "Restauration - Bar"],
  [/^shop=(bakery|pastry|confectionery|chocolate)/, "Boulangerie-pâtisserie"],
  [/^amenity=(clinic|dentist|doctors|pharmacy|veterinary)/, "Services de santé"],
  [/^shop=(hairdresser|beauty|massage|tattoo|optician|cosmetics)/, "Services personnels"],
  [/^amenity=(theatre|cinema|arts_centre|studio)|^tourism=(gallery|museum)|^leisure=/, "Salle de spectacle"],
  [/^amenity=(community_centre|social_facility|social_centre)/, "Organisme de services sociaux"],
  [/^amenity=(school|college|university|kindergarten|childcare|library)/, "Services éducatifs"],
  [/^amenity=(bank)/, "Services financiers - Banque"],
  [/^amenity=(coworking_space)/, "Services informatiques - Espace de travail partagé"],
  [/^tourism=(hotel|hostel|guest_house)/, "Hébergement - Hôtel"],
  [/^shop=/, "Commerce de détail"],
];
const osmLabel = (kind: string) => OSM_LABELS.find(([re]) => re.test(kind))?.[1] ?? null;

type OsmPlace = { id: string; name: string; kind: string; address: string | null; lat: number; lng: number };
async function osmPlaces(): Promise<(Extra & { id: string })[]> {
  const places = await cached(OSM_FILE, () => (JSON.parse(readFileSync(OSM_FILE, "utf8")) as { places: OsmPlace[] }).places, [] as OsmPlace[]);
  return places
    .filter((p) => isInSaintRoch(p.lng, p.lat))
    .map((p) => ({ id: p.id, name: p.name, activity: osmLabel(p.kind) ?? "Bureau d'entreprise", street: p.address ?? "Saint-Roch",
      at: { lat: p.lat, lng: p.lng, exact: true, address: p.address ?? "Saint-Roch" }, source: "osm" as const }));
}

export type Company = {
  id: string;
  name: string;
  street: string;
  activity: string | null; // activité officielle (liste SDC), si connue
  domains: DomainId[];
  source: "complices" | "sdc" | "registre" | "osm" | "organisme" | "promoteur";
  accountId: string | null; // compte Complices (page publique, « Contacter »)
  sdcId: string | null; // fiche de l'annuaire (/annuaire/sdc/:id)
  at: Located | null;
};

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// Lignes qui ne sont pas des entreprises à contacter : logements, résidences de tourisme, locaux vides
const NOT_A_BUSINESS = /tourisme|\bcondos?\b|\blofts?\b|penthouse|residence|\bvacant|a louer/;

/** Toutes les entreprises connues de Saint-Roch, sans doublon, avec leurs domaines. */
export async function listCompanies(): Promise<Company[]> {
  const out = new Map<string, Company>();
  const byName = new Map<string, Company>();

  for (const a of listActors()) {
    const c: Company = {
      id: `app-${a.id}`, name: a.displayName, street: a.at?.address ?? a.address ?? "Saint-Roch", activity: null,
      domains: domainsFor({ name: a.displayName, description: a.description, sector: a.sector, accountType: a.accountType }),
      source: "complices", accountId: a.id, sdcId: null, at: a.at,
    };
    out.set(c.id, c);
    byName.set(fold(a.displayName), c);
  }

  for (const m of listSdcMembers().members) {
    if (m.isVacant || NOT_A_BUSINESS.test(fold(`${m.activity} ${m.name}`))) continue;
    const known = byName.get(fold(m.name));
    if (known) { // déjà sur Complices : on garde le compte, on ajoute l'activité officielle
      known.activity ??= m.activity;
      known.sdcId ??= m.id;
      known.domains = [...new Set([...known.domains, ...domainsFor({ activity: m.activity })])];
      continue;
    }
    const c: Company = {
      id: m.id, name: m.name, street: m.street, activity: m.activity,
      domains: domainsFor({ activity: m.activity, name: m.name, nonprofit: m.nonprofit }),
      source: "sdc", accountId: null, sdcId: m.id,
      at: m.lat !== null && m.lng !== null ? { lat: m.lat, lng: m.lng, exact: true, address: m.address ?? m.street } : locateInSaintRoch(m.street),
    };
    out.set(c.id, c);
    byName.set(fold(m.name), c);
  }

  let n = 0;
  for (const r of await registry()) {
    n++;
    if (NOT_A_BUSINESS.test(fold(r.name))) continue;
    if (byName.has(fold(r.name))) continue; // même entreprise déjà connue
    const c: Company = {
      id: `reg-${n}`, name: r.name, street: r.street, activity: null,
      domains: domainsFor({ name: r.name }), source: "registre", accountId: null, sdcId: null, at: locateInSaintRoch(r.street),
    };
    out.set(c.id, c);
    byName.set(fold(r.name), c);
  }

  // OpenStreetMap (position exacte) puis organismes de l'arrondissement et organisateurs d'événements
  const extras: (Extra & { id?: string })[] = [...(await osmPlaces()), ...(await organismes()), ...(await promoteurs())];
  let k = 0;
  for (const e of extras) {
    k++;
    if (NOT_A_BUSINESS.test(fold(e.name))) continue;
    const known = byName.get(fold(e.name));
    if (known) { // même nom déjà connu : on complète (position exacte, activité) sans doublon
      if (!known.at?.exact && e.at) known.at = e.at;
      if (!known.activity) known.activity = e.activity;
      known.domains = [...new Set([...known.domains, ...domainsFor({ activity: e.activity })])];
      continue;
    }
    const c: Company = {
      id: e.id ?? `${e.source}-${k}`, name: e.name, street: e.street, activity: e.activity,
      domains: domainsFor({ activity: e.activity, name: e.name, nonprofit: e.source === "organisme" }),
      source: e.source, accountId: null, sdcId: null, at: e.at,
    };
    out.set(c.id, c);
    byName.set(fold(e.name), c);
  }
  return [...out.values()];
}
