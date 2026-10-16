import "server-only";
import { ZodError } from "zod";
import { getCurrentUser, NOT_LOGGED_IN } from "./auth";
import { getDb } from "./db";
import { locateInSaintRoch } from "./saint-roch-streets";
import { isSdc, VacancyError } from "./vacancies";

// Vue SDC des vitrines (écran /sdc/vitrines). S'appuie sur le code de Manuella (src/lib/vacancies.ts) :
// accès réservé aux comptes listés dans COMPLICES_SDC_USER_IDS (.env.local), vérifié ici côté serveur.
// L'écran passe par la session (connexion avec mot de passe) ; les routes HTTP de Manuella (/api/vacancies/sdc,
// /api/vacancy-bookings/:id) gardent en plus leur clé X-SDC-Key pour les appels hors de l'app.

/** Exécute une action SDC : 401 sans session, 403 si le compte n'est pas SDC, erreurs métier en JSON. */
export async function sdcRoute(action: (sdcId: string) => unknown | Promise<unknown>, status = 200) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const me = await getCurrentUser();
    if (!me) return Response.json(NOT_LOGGED_IN, { status: 401, headers });
    if (!isSdc(me.id)) return Response.json({ error: "Accès réservé à la SDC.", code: "sdc_required" }, { status: 403, headers });
    return Response.json(await action(me.id), { status, headers });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Données invalides." }, { status: 400, headers });
    if (error instanceof VacancyError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
    throw error;
  }
}

/**
 * La SDC connaît ses locaux : elle indique le numéro civique d'un local dont le fichier ne donne que la rue.
 * On le cherche dans les adresses officielles de la Ville ; s'il existe, le local devient « vérifié »
 * (point sur la carte, confirmation d'occupation possible).
 */
export function verifyVacancyAddress(sdcId: string, vacancyId: string, civic: string) {
  if (!isSdc(sdcId)) throw new VacancyError(403, "sdc_required", "Accès réservé à la SDC.");
  const num = civic.trim();
  if (!/^\d{1,5}$/.test(num)) throw new VacancyError(400, "invalid_civic", "Indique un numéro civique (ex. 350).");
  const db = getDb();
  const row = db.prepare("SELECT id, street, source_member_id FROM vacancies WHERE id = ?").get(vacancyId) as
    { id: string; street: string; source_member_id: string | null } | undefined;
  if (!row) throw new VacancyError(404, "vacancy_not_found", "Ce local n'existe pas.");
  const at = locateInSaintRoch(row.street, num);
  if (!at || !at.exact) throw new VacancyError(404, "address_not_found", `Le ${num}, ${row.street} n'est pas dans les adresses de la Ville.`);
  db.transaction(() => {
    db.prepare("UPDATE vacancies SET lat = ?, lng = ?, location_status = 'verified' WHERE id = ?").run(at.lat, at.lng, row.id);
    if (row.source_member_id) {
      db.prepare("UPDATE sdc_members SET address = ?, lat = ?, lng = ?, location_status = 'verified', checked_at = ? WHERE id = ?")
        .run(at.address, at.lat, at.lng, new Date().toISOString(), row.source_member_id);
    }
  })();
  return { address: at.address, lat: at.lat, lng: at.lng };
}

/** Adresse vérifiée de chaque local (pour l'afficher dans la vue SDC). */
export function verifiedAddresses(): Record<string, string> {
  const rows = getDb().prepare(
    `SELECT v.id, m.address FROM vacancies v JOIN sdc_members m ON m.id = v.source_member_id WHERE v.location_status = 'verified' AND m.address IS NOT NULL`,
  ).all() as { id: string; address: string }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.address]));
}
