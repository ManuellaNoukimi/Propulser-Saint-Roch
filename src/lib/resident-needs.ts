import { createHash } from "node:crypto";
import { awardResidentPoints } from "./resident-points";
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { isInSaintRoch } from "./geo";
import { moderate } from "./moderation";
import { VacancyError, quebecDay } from "./vacancies";
import { RESIDENT_NEED_CATEGORIES, approximateResidentPoint, type ResidentNeed } from "./resident-need-options";

export const DAILY_RESIDENT_SUPPORT_LIMIT = 3;
export const residentSupportSchema = z.object({ frequency: z.number().int().min(0).max(3) }).strict();
export const residentNeedSchema = z.object({
  category: z.enum(RESIDENT_NEED_CATEGORIES.map((c) => c.id)),
  label: z.string().trim().max(60).default(""),
  lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180),
  frequency: z.number().int().min(0).max(3),
  radiusMeters: z.number().int().min(100).max(1000).multipleOf(50).default(300),
}).strict().refine((data) => data.category !== "autre" || data.label.length >= 2, "Précise le service souhaité (2 à 60 caractères).");
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();

export function listResidentNeeds(viewer: string | null): ResidentNeed[] {
  const rows = getDb().prepare(`SELECT n.id,n.category,n.label,n.zone_lat,n.zone_lng,n.zone_radius,n.created_at,
    COUNT(s.user_id) AS supporters, COALESCE(SUM(s.frequency),0) AS visits,
    (SELECT frequency FROM resident_need_supports WHERE need_id=n.id AND user_id=@viewer) AS my_frequency
    FROM resident_needs n JOIN resident_need_supports s ON s.need_id=n.id
    GROUP BY n.id ORDER BY supporters DESC,n.created_at DESC,n.id`).all({ viewer: viewer ?? "" }) as {
      id: string; category: ResidentNeed["category"]; label: string; zone_lat: number; zone_lng: number; zone_radius: number; created_at: string; supporters: number; visits: number; my_frequency: number | null;
    }[];
  return rows.map((row) => ({ id: row.id, category: row.category, label: row.label,
    zone: { lat: row.zone_lat, lng: row.zone_lng, radiusMeters: row.zone_radius }, createdAt: row.created_at,
    supporters: row.supporters, visitsPerWeek: row.visits, mySupport: row.my_frequency === null ? null : { frequency: row.my_frequency } }));
}
export function residentSupportsRemaining(userId: string) {
  const { n } = getDb().prepare("SELECT COUNT(*) AS n FROM resident_need_activity WHERE user_id=? AND day=?").get(userId, quebecDay()) as { n: number };
  return Math.max(0, DAILY_RESIDENT_SUPPORT_LIMIT - n);
}
function requireNeed(id: string) {
  if (!getDb().prepare("SELECT 1 FROM resident_needs WHERE id=?").get(id)) throw new VacancyError(404, "need_not_found", "Ce besoin n'existe plus. Actualise la liste.");
}
function saveSupport(userId: string, id: string, frequency: number) {
  const db = getDb();
  const existing = db.prepare("SELECT 1 FROM resident_need_supports WHERE need_id=? AND user_id=?").get(id, userId);
  const now = new Date().toISOString();
  if (!existing) {
    if (!residentSupportsRemaining(userId)) throw new VacancyError(429, "daily_support_limit", "Tu as atteint la limite de trois nouveaux soutiens aujourd'hui. Tu peux toujours modifier ou retirer tes contributions.");
    db.prepare("INSERT INTO resident_need_activity(id,user_id,day,created_at) VALUES(?,?,?,?)").run(randomUUID(), userId, quebecDay(), now);
  }
  db.prepare(`INSERT INTO resident_need_supports(need_id,user_id,frequency,created_at,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(need_id,user_id) DO UPDATE SET frequency=excluded.frequency,updated_at=excluded.updated_at`).run(id, userId, frequency, now, now);
  if (!existing) {
    const need = db.prepare("SELECT category,custom_key,zone_lat,zone_lng,zone_radius FROM resident_needs WHERE id=?").get(id);
    const reference = createHash("sha256").update(JSON.stringify(need)).digest("hex");
    awardResidentPoints(db,userId,"vote",`need:${reference}`);
  }
}
export function expressResidentNeed(userId: string, input: unknown) {
  const data = residentNeedSchema.parse(input);
  if (!isInSaintRoch(data.lng, data.lat)) throw new VacancyError(422, "outside_neighborhood", "Choisis un endroit à l'intérieur de Saint-Roch.");
  const label = data.category === "autre" ? data.label : RESIDENT_NEED_CATEGORIES.find((c) => c.id === data.category)!.label;
  const moderation = moderate(label);
  if (!moderation.ok) throw new VacancyError(422, "moderation", moderation.reason);
  const zone = { ...approximateResidentPoint(data.lat, data.lng), radiusMeters: data.radiusMeters };
  const key = data.category === "autre" ? fold(label) : "";
  const db = getDb();
  return db.transaction(() => {
    const found = db.prepare("SELECT id FROM resident_needs WHERE category=? AND custom_key=? AND zone_lat=? AND zone_lng=? AND zone_radius=?").get(data.category, key, zone.lat, zone.lng, zone.radiusMeters) as { id: string } | undefined;
    const id = found?.id ?? randomUUID();
    if (!found) db.prepare("INSERT INTO resident_needs(id,category,label,custom_key,zone_lat,zone_lng,zone_radius,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(id, data.category, label, key, zone.lat, zone.lng, zone.radiusMeters, userId, new Date().toISOString());
    saveSupport(userId, id, data.frequency);
    return { id, created: !found };
  }).immediate();
}
export function supportResidentNeed(userId: string, id: string, input: unknown) {
  const { frequency } = residentSupportSchema.parse(input);
  return getDb().transaction(() => { requireNeed(id); saveSupport(userId, id, frequency); return { id }; }).immediate();
}
export function withdrawResidentSupport(userId: string, id: string) {
  return getDb().transaction(() => {
    requireNeed(id);
    getDb().prepare("DELETE FROM resident_need_supports WHERE need_id=? AND user_id=?").run(id, userId);
    // Seul un besoin sans aucun soutien disparaît ; on ne supprime jamais les contributions des voisins.
    getDb().prepare("DELETE FROM resident_needs WHERE id=? AND NOT EXISTS(SELECT 1 FROM resident_need_supports WHERE need_id=?)").run(id, id);
    return { id };
  }).immediate();
}
