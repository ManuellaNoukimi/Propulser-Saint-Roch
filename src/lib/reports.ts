import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_REPORT_PHOTOS } from "./constants";
import { REPORT_PHOTO_DIR, type ReportRow } from "./db";
import type { Report } from "./types";

// Photos des signalements : enregistrées dans data/report-photos/ (pas dans /api/uploads, qui est public)
// et servies seulement à l'auteur du signalement (/api/report-photos/[file]).
export const REPORT_PHOTO_ROUTE = "/api/report-photos/";
export const PHOTO_FILE_RE = /^[a-f0-9-]{36}\.(jpg|png|webp)$/; // empêche toute traversée de dossier
export const PHOTO_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

/** Numéro lisible du signalement, comme un numéro de requête 311 (« SR-4F2A9C »). */
export const reportRef = (id: string) => `SR-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

export const toReport = (r: ReportRow): Report => ({
  id: r.id,
  ref: reportRef(r.id),
  category: r.category,
  subtype: r.subtype,
  description: r.description,
  status: r.status || "recu",
  statusNote: r.status_note,
  updatedAt: r.updated_at,
  moment: r.moment,
  address: r.address,
  photos: JSON.parse(r.photos || "[]"),
  lat: r.lat,
  lng: r.lng,
  createdAt: r.created_at,
});

/** Vérifie les photos reçues (format, poids, nombre). Renvoie un message d'erreur, ou null si tout va bien. */
export function checkPhotos(files: File[]): { error: string; status: number } | null {
  if (files.length > MAX_REPORT_PHOTOS) return { error: `${MAX_REPORT_PHOTOS} photos maximum.`, status: 400 };
  for (const f of files) {
    if (!EXT[f.type]) return { error: "Photo : format accepté JPEG, PNG ou WebP.", status: 415 };
    if (f.size > MAX_BYTES) return { error: "Photo trop lourde (4 Mo maximum).", status: 413 };
  }
  return null;
}

/** Enregistre les photos (déjà vérifiées) et renvoie leurs adresses privées. */
export async function saveReportPhotos(files: File[]): Promise<string[]> {
  await fs.mkdir(REPORT_PHOTO_DIR, { recursive: true });
  const urls: string[] = [];
  for (const f of files) {
    const name = `${randomUUID()}.${EXT[f.type]}`;
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ REPORT_PHOTO_DIR, name), Buffer.from(await f.arrayBuffer()));
    urls.push(`${REPORT_PHOTO_ROUTE}${name}`);
  }
  return urls;
}

/** Efface les fichiers de photos (quand on retire un signalement). */
export async function removeReportPhotos(urls: string[]) {
  for (const url of urls) {
    const name = url.slice(REPORT_PHOTO_ROUTE.length);
    if (url.startsWith(REPORT_PHOTO_ROUTE) && PHOTO_FILE_RE.test(name)) {
      await fs.rm(path.join(/*turbopackIgnore: true*/ REPORT_PHOTO_DIR, name), { force: true });
    }
  }
}
