import "server-only";
import { z } from "zod";
import { getDb } from "./db";
import { isInSaintRoch } from "./geo";

const rowSchema = z.object({ row: z.number().int().min(2), name: z.string().trim().min(1), street: z.string().trim().min(1), activity: z.string(), nonprofit: z.boolean(), vacant: z.boolean() }).strict();
const locationSchema = z.object({ row: z.number().int().min(2), expectedName: z.string(), address: z.string().trim().min(1), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), googleMapsUrl: z.url().refine((url) => new URL(url).protocol === "https:" && new URL(url).hostname === "www.google.com" && new URL(url).pathname.startsWith("/maps/")), checkedAt: z.string().datetime() }).strict();
export const sdcImportSchema = z.object({ sha: z.string().regex(/^[a-f0-9]{64}$/), sourceName: z.string().min(1), sheet: z.string().min(1), rows: z.array(rowSchema).min(1).max(10000), locations: z.array(locationSchema).default([]) }).strict();

export function activeSdcSnapshot() {
  return (getDb().prepare("SELECT value FROM meta WHERE key = 'sdc_active_snapshot'").get() as { value: string } | undefined)?.value ?? null;
}
export function sdcMemberId(sha: string, row: number) { return `sdc-${sha.slice(0, 16)}-${row}`; }

/** Import explicite et atomique. Aucun géocodage ou téléchargement automatique au démarrage. */
export function importSdcSnapshot(input: unknown) {
  const data = sdcImportSchema.parse(input);
  if (data.rows.some((row) => row.vacant !== (row.name.toLocaleLowerCase("fr") === "vacant"))) throw new Error("Le statut vacant doit correspondre à la ligne source.");
  if (new Set(data.rows.map((r) => r.row)).size !== data.rows.length) throw new Error("Lignes sources dupliquées.");
  if (new Set(data.locations.map((l) => l.row)).size !== data.locations.length) throw new Error("Vérifications de localisation dupliquées.");
  for (const location of data.locations) {
    const row = data.rows.find((r) => r.row === location.row);
    if (!row || row.name !== location.expectedName) throw new Error("La localisation ne correspond pas au nom de la ligne source.");
    if (!isInSaintRoch(location.lng, location.lat)) throw new Error("Localisation hors de Saint-Roch : vérification manuelle requise.");
  }
  const db = getDb();
  return db.transaction(() => {
    db.prepare("INSERT OR IGNORE INTO sdc_imports (sha,source_name,sheet,imported_at,row_count) VALUES (?,?,?,?,?)")
      .run(data.sha, data.sourceName, data.sheet, new Date().toISOString(), data.rows.length);
    const insert = db.prepare(`INSERT OR IGNORE INTO sdc_members (id,source_sha,source_row,name,street,activity,nonprofit,is_vacant) VALUES (?,?,?,?,?,?,?,?)`);
    const local = db.prepare(`INSERT OR IGNORE INTO vacancies (id,label,street,lat,lng,surface,details,is_demo,source_member_id,location_status) VALUES (?,?,?,0,0,?,?,0,?,'unverified')`);
    let added = 0;
    for (const row of data.rows) {
      const id = sdcMemberId(data.sha, row.row);
      added += insert.run(id, data.sha, row.row, row.name, row.street, row.activity, Number(row.nonprofit), Number(row.vacant)).changes;
      if (row.vacant) local.run(id, `Local vacant · ligne ${row.row}`, row.street, "Surface non fournie", row.activity || "Local déclaré vacant dans le fichier SDC.", id);
    }
    for (const location of data.locations) {
      const id = sdcMemberId(data.sha, location.row);
      db.prepare(`UPDATE sdc_members SET address=?,lat=?,lng=?,location_status='verified',google_maps_url=?,checked_at=? WHERE id=?`)
        .run(location.address, location.lat, location.lng, location.googleMapsUrl, location.checkedAt, id);
      db.prepare(`UPDATE vacancies SET street=?,lat=?,lng=?,location_status='verified' WHERE source_member_id=?`)
        .run(location.address, location.lat, location.lng, id);
    }
    db.prepare("INSERT INTO meta(key,value) VALUES ('sdc_active_snapshot',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(data.sha);
    return { rows: data.rows.length, vacancies: data.rows.filter((r) => r.vacant).length, added, verified: data.locations.length };
  }).immediate();
}

export function listSdcMembers() {
  const snapshot = activeSdcSnapshot();
  if (!snapshot) return { members: [], source: null };
  type Row = { id: string; source_row: number; name: string; street: string; activity: string; nonprofit: number; is_vacant: number; address: string | null; lat: number | null; lng: number | null; location_status: string; google_maps_url: string | null; checked_at: string | null };
  const rows = getDb().prepare("SELECT * FROM sdc_members WHERE source_sha = ? ORDER BY source_row").all(snapshot) as Row[];
  const source = getDb().prepare("SELECT source_name AS name, sheet, imported_at AS importedAt FROM sdc_imports WHERE sha = ?").get(snapshot);
  return { source, members: rows.map((r) => ({ id: r.id, sourceRow: r.source_row, name: r.name, street: r.street, activity: r.activity, nonprofit: Boolean(r.nonprofit), isVacant: Boolean(r.is_vacant),
    address: r.address, lat: r.location_status === "verified" ? r.lat : null, lng: r.location_status === "verified" ? r.lng : null,
    locationStatus: r.location_status, checkedAt: r.checked_at,
    googleMapsUrl: r.google_maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.is_vacant ? "" : r.name + ", "}${r.street}, Québec, QC`)}`,
  })) };
}
