import { awardResidentPoints } from "./resident-points";
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb, insertIdea } from "./db";
import { BOOKING_PROJECTS, WISHES } from "./quartier";
import { activeSdcSnapshot } from "./sdc-members";

// F4 ne fixe pas de valeur : trois nouveaux votes par jour civil au Québec.
export const DAILY_VACANCY_VOTE_LIMIT = 3;
export class VacancyError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const voteSchema = z.object({
  wish: z.enum(WISHES.map((w) => w.id)),
  frequency: z.number().int().min(0).max(3),
}).strict();

export function quebecDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function validDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export const bookingSchema = z.object({
  project: z.enum(BOOKING_PROJECTS.map((p) => p.id)),
  title: z.string().trim().min(1).max(80),
  weeks: z.number().int().min(1).max(4),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDay, "Date invalide."),
}).strict();
export const confirmationSchema = z.object({ status: z.literal("confirmed") }).strict();

type VacancyRow = { id: string; label: string; street: string; lat: number; lng: number; surface: string; details: string; is_demo: number; location_status: string; source_member_id: string | null };
type VoteRow = { id: string; user_id: string; vacancy_id: string; wish: string; frequency: number; vote_day: string; created_at: string };
type BookingRow = { id: string; user_id: string; vacancy_id: string; project: string; title: string; weeks: number; starts_on: string; ends_on: string; status: "pending" | "confirmed"; created_at: string; confirmed_at: string | null; confirmed_by: string | null; idea_id: string | null };

/** Autorisation explicite côté serveur, indépendante du profil modifiable par l'utilisateur. */
export function isSdc(userId: string) {
  return (process.env.COMPLICES_SDC_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean).includes(userId);
}
function requireSdc(userId: string) {
  if (!isSdc(userId)) throw new VacancyError(403, "sdc_required", "Accès réservé à la SDC.");
}
function vacancy(id: string): VacancyRow {
  const row = getDb().prepare("SELECT * FROM vacancies WHERE id = ?").get(id) as VacancyRow | undefined;
  if (!row) throw new VacancyError(404, "vacancy_not_found", "Ce local n'existe pas.");
  const active = activeSdcSnapshot();
  if (active && !getDb().prepare("SELECT 1 FROM sdc_members WHERE id = ? AND source_sha = ?").get(row.source_member_id, active)) {
    throw new VacancyError(404, "vacancy_not_found", "Ce local ne fait pas partie de l'inventaire actuel.");
  }
  return row;
}
export function toBooking(row: BookingRow) {
  return { id: row.id, vacancyId: row.vacancy_id, project: row.project, title: row.title, weeks: row.weeks,
    startsOn: row.starts_on, endsOn: row.ends_on, status: row.status, createdAt: row.created_at,
    confirmedAt: row.confirmed_at, ideaId: row.idea_id };
}
function toVote(row: VoteRow) {
  return { id: row.id, vacancyId: row.vacancy_id, wish: row.wish, frequency: row.frequency, createdAt: row.created_at };
}

/** Vue publique : agrégats et occupations confirmées, sans identités ni demandes privées. */
export function listVacancies(viewer: string | null = null) {
  const db = getDb();
  return db.transaction(() => {
    const active = activeSdcSnapshot();
    const rows = active
      ? db.prepare("SELECT v.* FROM vacancies v JOIN sdc_members m ON m.id = v.source_member_id WHERE m.source_sha = ? ORDER BY m.source_row").all(active) as VacancyRow[]
      : db.prepare("SELECT * FROM vacancies ORDER BY id").all() as VacancyRow[];
    const counts = db.prepare("SELECT vacancy_id, wish, COUNT(*) AS votes, SUM(frequency) AS visits FROM vacancy_votes GROUP BY vacancy_id, wish").all() as { vacancy_id: string; wish: string; votes: number; visits: number }[];
    const bookings = db.prepare("SELECT * FROM vacancy_bookings WHERE status = 'confirmed' AND ends_on > ? ORDER BY starts_on, id").all(quebecDay()) as BookingRow[];
    const mine = viewer ? db.prepare("SELECT * FROM vacancy_votes WHERE user_id = ?").all(viewer) as VoteRow[] : [];
    return rows.map((row) => {
      const local = counts.filter((c) => c.vacancy_id === row.id);
      const myVote = mine.find((v) => v.vacancy_id === row.id);
      return { id: row.id, label: row.label, street: row.street, lat: row.location_status === "verified" ? row.lat : null, lng: row.location_status === "verified" ? row.lng : null, surface: row.surface,
        locationStatus: row.location_status, sourceMemberId: row.source_member_id,
        details: row.details, isDemo: Boolean(row.is_demo), votes: Object.fromEntries(local.map((c) => [c.wish, c.votes])),
        totalVotes: local.reduce((n, c) => n + c.votes, 0), visits: local.reduce((n, c) => n + c.visits, 0),
        bookings: bookings.filter((b) => b.vacancy_id === row.id).map(toBooking), myVote: myVote ? toVote(myVote) : null };
    });
  })();
}

export function recordVacancyVote(userId: string, vacancyId: string, input: unknown) {
  const data = voteSchema.parse(input);
  const db = getDb();
  return db.transaction(() => {
    vacancy(vacancyId);
    if (db.prepare("SELECT 1 FROM vacancy_votes WHERE user_id = ? AND vacancy_id = ?").get(userId, vacancyId)) {
      throw new VacancyError(409, "already_voted", "Tu as déjà voté pour ce local.");
    }
    const now = new Date();
    const day = quebecDay(now);
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM vacancy_votes WHERE user_id = ? AND vote_day = ?").get(userId, day) as { n: number };
    if (n >= DAILY_VACANCY_VOTE_LIMIT) throw new VacancyError(429, "daily_vote_limit", "Tu as atteint le plafond de trois votes pour aujourd'hui.");
    const id = randomUUID();
    db.prepare("INSERT INTO vacancy_votes (id,user_id,vacancy_id,wish,frequency,vote_day,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, userId, vacancyId, data.wish, data.frequency, day, now.toISOString());
    awardResidentPoints(db,userId,"vote",`vacancy:${vacancyId}`);
    return toVote(db.prepare("SELECT * FROM vacancy_votes WHERE id = ?").get(id) as VoteRow);
  }).immediate();
}

function overlaps(vacancyId: string, start: string, end: string, except = "") {
  return getDb().prepare(`SELECT 1 FROM vacancy_bookings WHERE vacancy_id = ? AND status = 'confirmed'
    AND starts_on < ? AND ends_on > ? AND id <> ?`).get(vacancyId, end, start, except);
}
export function requestVacancyBooking(userId: string, vacancyId: string, input: unknown) {
  const data = bookingSchema.parse(input);
  const db = getDb();
  return db.transaction(() => {
    vacancy(vacancyId);
    if (data.startsOn < quebecDay()) throw new VacancyError(400, "past_booking", "Choisis aujourd'hui ou une date à venir.");
    const end = new Date(`${data.startsOn}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + data.weeks * 7);
    if (end.getUTCFullYear() > 9999) throw new VacancyError(400, "invalid_booking_dates", "La fin de réservation dépasse la plage de dates autorisée.");
    const endsOn = end.toISOString().slice(0, 10);
    if (overlaps(vacancyId, data.startsOn, endsOn)) throw new VacancyError(409, "booking_conflict", "Ce local est déjà réservé sur cette période.");
    if (db.prepare(`SELECT 1 FROM vacancy_bookings WHERE vacancy_id = ? AND user_id = ? AND starts_on < ? AND ends_on > ?`)
      .get(vacancyId, userId, endsOn, data.startsOn)) throw new VacancyError(409, "duplicate_booking", "Tu as déjà une demande sur cette période.");
    const id = randomUUID();
    db.prepare(`INSERT INTO vacancy_bookings (id,user_id,vacancy_id,project,title,weeks,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, userId, vacancyId, data.project, data.title, data.weeks, data.startsOn, endsOn, new Date().toISOString());
    return toBooking(db.prepare("SELECT * FROM vacancy_bookings WHERE id = ?").get(id) as BookingRow);
  }).immediate();
}
export function listMyVacancyBookings(userId: string) {
  return (getDb().prepare("SELECT * FROM vacancy_bookings WHERE user_id = ? ORDER BY created_at DESC, id").all(userId) as BookingRow[]).map(toBooking);
}

// Minuit au Québec, tenant compte de l'heure d'été, pour l'événement du fil d'accueil.
function quebecMidnight(day: string) {
  const utc = Date.parse(`${day}T00:00:00Z`);
  const clock = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  let candidate = utc;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(clock.formatToParts(new Date(candidate)).map((p) => [p.type, p.value]));
    const localAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    candidate += utc - localAsUtc;
  }
  return new Date(candidate).toISOString();
}
export function confirmVacancyBooking(sdcId: string, bookingId: string) {
  requireSdc(sdcId);
  const db = getDb();
  return db.transaction(() => {
    const booking = db.prepare("SELECT * FROM vacancy_bookings WHERE id = ?").get(bookingId) as BookingRow | undefined;
    if (!booking) throw new VacancyError(404, "booking_not_found", "Cette réservation n'existe pas.");
    if (booking.status === "confirmed") return toBooking(booking);
    if (booking.starts_on < quebecDay()) throw new VacancyError(409, "past_booking", "Cette demande a expiré.");
    if (overlaps(booking.vacancy_id, booking.starts_on, booking.ends_on, booking.id)) throw new VacancyError(409, "booking_conflict", "Une autre réservation est confirmée sur cette période.");
    const local = vacancy(booking.vacancy_id);
    if (local.location_status !== "verified") throw new VacancyError(409, "location_unverified", "L'adresse exacte du local doit être vérifiée avant la confirmation SDC.");
    const ideaId = insertIdea(booking.user_id, {
      title: booking.title,
      description: `${BOOKING_PROJECTS.find((p) => p.id === booking.project)!.label} — ${local.label}. Du ${booking.starts_on} au ${booking.ends_on} (fin exclusive), ${booking.weeks} semaine(s). Réservation confirmée par la SDC.${local.is_demo ? " Local fictif de démonstration." : ""}`,
      category: booking.project === "boutique" ? "commerce" : "culturel",
      place: `${local.label}, ${local.street}`, startsAt: quebecMidnight(booking.starts_on), needs: ["participants"], images: [],
    });
    db.prepare("UPDATE vacancy_bookings SET status = 'confirmed', confirmed_by = ?, confirmed_at = ?, idea_id = ? WHERE id = ?")
      .run(sdcId, new Date().toISOString(), ideaId, bookingId);
    awardResidentPoints(db,booking.user_id,"booking",bookingId);
    return toBooking(db.prepare("SELECT * FROM vacancy_bookings WHERE id = ?").get(bookingId) as BookingRow);
  }).immediate();
}

export function getSdcVacancies(userId: string) {
  requireSdc(userId);
  const db = getDb();
  return db.transaction(() => {
    const vacancies = listVacancies();
    const reservations = db.prepare(`SELECT b.*, u.display_name FROM vacancy_bookings b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC, b.id`).all() as (BookingRow & { display_name: string })[];
    const totals: Record<string, number> = {};
    for (const local of vacancies) for (const [wish, votes] of Object.entries(local.votes)) totals[wish] = (totals[wish] ?? 0) + votes;
    return { vacancies: vacancies.map((local) => ({ ...local, bookings: reservations.filter((b) => b.vacancy_id === local.id).map((b) => ({ ...toBooking(b), applicant: { id: b.user_id, displayName: b.display_name }, confirmedBy: b.confirmed_by })) })),
      ranking: Object.entries(totals).map(([wish, votes]) => ({ wish, votes })).sort((a, b) => b.votes - a.votes || a.wish.localeCompare(b.wish)), dailyVoteLimit: DAILY_VACANCY_VOTE_LIMIT };
  })();
}
