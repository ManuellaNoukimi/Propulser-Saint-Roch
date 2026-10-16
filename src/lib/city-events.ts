import "server-only";
import { statSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

// Événements de la Ville (fichier Excel fourni pour le hackathon), lus AU MOMENT DE L'EXÉCUTION :
// aucune valeur du fichier n'est copiée dans le code. On ne garde que les événements de Saint-Roch.
// Emplacement : dossier « Données fournies » à côté de l'app (modifiable avec COMPLICES_EVENTS_XLSX).
const FILE =
  process.env.COMPLICES_EVENTS_XLSX ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "Données fournies", "CP-LSVC-Événements à venir-k.xlsx");

export type CityEvent = {
  id: string;
  title: string;
  type: string | null; // « Fête de quartier », « Cinéma en plein air »…
  sites: string[]; // un ou plusieurs lieux
  startsAt: string; // ISO
  endsAt: string | null;
  cost: string | null;
  description: string | null;
  url: string | null;
};

type Cache = { mtime: number; events: CityEvent[] };
const g = globalThis as unknown as { __cityEvents?: Cache };

/** Texte d'une cellule Excel, quel que soit son format (texte, lien, formule, texte enrichi). */
function text(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v).trim();
  if (v instanceof Date) return v.toISOString();
  if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
  if ("text" in v) return String(v.text).trim();
  if ("result" in v) return text(v.result as ExcelJS.CellValue);
  return "";
}

// Les listes SharePoint arrivent sous la forme « 64;#Saint-Roch;#67;#Saint-Sauveur » ou « 13;#Fête de quartier ».
const sharePoint = (s: string) => s.split(";#").map((x) => x.trim()).filter((x) => x && !/^\d+$/.test(x));

// Dans le fichier, les heures sont l'heure de Québec (enregistrées sans fuseau) : on les convertit en vrai instant.
const QC = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
function quebecTime(v: ExcelJS.CellValue): Date | null {
  const d = v instanceof Date ? v : typeof v === "string" && v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const wall = d.getTime(); // l'heure « murale » lue comme si c'était UTC
  const p = Object.fromEntries(QC.formatToParts(new Date(wall)).map((x) => [x.type, x.value]));
  const seenInQc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(wall + (wall - seenInQc)); // on ajoute le décalage de Québec (4 ou 5 h)
}

async function load(): Promise<CityEvent[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const header = Array.from(ws.getRow(1).values as ExcelJS.CellValue[], (v) => text(v)); // Array.from : les trous deviennent ""
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const C = {
    title: col("Titre PROJET"),
    type: col("Type d'activité"),
    sites: col("Site(s) de l'activité"),
    quartier: col("Quartier"),
    start: col("Date et heure de début"),
    end: col("Date et heure de fin"),
    cost: col("Coût"),
    description: col("Description (courte)"),
    url: col("Site internet du promoteur"),
  };
  if (C.title < 0 || C.start < 0 || C.quartier < 0) return [];

  const events: CityEvent[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const v = row.values as ExcelJS.CellValue[];
    const get = (k: number) => (k < 0 ? "" : text(v[k]));
    if (!sharePoint(get(C.quartier)).some((q) => /saint-roch/i.test(q))) return;
    const start = quebecTime(v[C.start]);
    const title = get(C.title);
    if (!start || !title) return;
    const end = C.end < 0 ? null : quebecTime(v[C.end]);
    const url = get(C.url);
    events.push({
      id: `ville-${i}`,
      title,
      type: sharePoint(get(C.type))[0] ?? null,
      sites: get(C.sites).split("/").map((s) => s.trim()).filter(Boolean),
      startsAt: start.toISOString(),
      endsAt: end && end > start ? end.toISOString() : null,
      cost: get(C.cost) || null,
      description: get(C.description) || null,
      url: /^https?:\/\//i.test(url) ? url : null,
    });
  });
  return events;
}

/** Événements de Saint-Roch du fichier de la Ville ([] si le fichier est absent ou illisible). Relu seulement s'il change. */
export async function cityEvents(): Promise<CityEvent[]> {
  let mtime: number;
  try {
    mtime = statSync(FILE).mtimeMs;
  } catch {
    console.warn(`Événements de la Ville : fichier introuvable (${FILE})`);
    return [];
  }
  if (g.__cityEvents?.mtime === mtime) return g.__cityEvents.events;
  try {
    const events = await load();
    g.__cityEvents = { mtime, events };
    return events;
  } catch (e) {
    console.warn("Événements de la Ville : fichier illisible", e);
    return [];
  }
}
