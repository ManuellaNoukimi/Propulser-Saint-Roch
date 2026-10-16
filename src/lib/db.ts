import "server-only";
import Database from "better-sqlite3";
import { prepareVacancies } from "./vacancy-schema";
import { prepareResidentProgress } from "./resident-progress-schema";
import { awardResidentPoints, syncResidentBadges } from "./resident-points";
import { prepareResidentNeeds } from "./resident-needs-schema";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ACTOR_TYPES, isEstablishment } from "./constants";
import { hashPassword, NO_PASSWORD } from "./password";
import type { CreateIdeaInput, JoinInput, ProfileUpdateInput, SignupInput } from "./validation";
import type { Idea, PublicUser, SessionUser } from "./types";
import { DEMO_LOGINS } from "./demo-accounts";

// Base SQLite locale : data/complices.db (persiste entre les redémarrages, non versionnée).
// COMPLICES_DATA_DIR permet d'utiliser une autre base (ex. pour les tests) sans toucher aux vraies données.
export const DATA_DIR = process.env.COMPLICES_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const REPORT_PHOTO_DIR = path.join(DATA_DIR, "report-photos"); // photos des signalements (privées, hors de /api/uploads)
const DB_FILE = path.join(DATA_DIR, "complices.db");

const SCHEMA_VERSION = 2; // v2 = comptes (users, sessions) ; v1 = identité par appareil (abandonnée)

type Db = Database.Database;
const globalForDb = globalThis as unknown as { __complicesDb?: Db };

function open(): Db {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// Remis à false à chaque rechargement du module (HMR de `npm run dev`) : le schéma est re-vérifié sans redémarrer.
let prepared = false;

export function getDb(): Db {
  let db = globalForDb.__complicesDb;
  // La base a été effacée pendant que le serveur tournait (ex. « npm run reset-db ») : on ferme l'ancienne
  // connexion (elle pointait vers une base vide → « no such table: users ») et on recrée tout, données de démo comprises.
  if (db && !fs.existsSync(DB_FILE)) {
    try {
      db.close();
    } catch {
      /* déjà fermée */
    }
    db = undefined;
    prepared = false;
  }
  if (!db) globalForDb.__complicesDb = db = open();
  if (!prepared) {
    prepare(db);
    prepared = true;
  }
  return db;
}

/** Crée ou met à niveau le schéma, puis ajoute les données de démo manquantes. Idempotent (peut être relancé). */
function prepare(db: Db) {
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version < SCHEMA_VERSION) {
    // Prototype : on repart d'une base propre si l'ancien schéma existe (les données de démo sont recréées).
    db.exec(`DROP TABLE IF EXISTS comments; DROP TABLE IF EXISTS likes; DROP TABLE IF EXISTS complices; DROP TABLE IF EXISTS ideas;
             DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS users;`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      account_type  TEXT NOT NULL,
      sector        TEXT,
      address       TEXT,
      description   TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ideas (
      id           TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL,
      category     TEXT NOT NULL,
      place        TEXT NOT NULL,
      starts_at    TEXT,
      needs        TEXT NOT NULL DEFAULT '[]',
      images       TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS complices (
      id           TEXT PRIMARY KEY,
      idea_id      TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contribution TEXT NOT NULL,
      message      TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL,
      UNIQUE (idea_id, user_id, contribution)
    );
    -- Problème 1 : « Inviter mes complices » (l'invité répond « Je suis complice » ou « Pas cette fois »)
    CREATE TABLE IF NOT EXISTS invitations (
      id           TEXT PRIMARY KEY,
      idea_id      TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      from_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contribution TEXT NOT NULL,
      reason       TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
      created_at   TEXT NOT NULL,
      answered_at  TEXT,
      UNIQUE (idea_id, to_id)
    );
    CREATE INDEX IF NOT EXISTS idx_invitations_to ON invitations(to_id, status);
    -- Signalements (besoins / problèmes) sur la carte. PRIVÉS : chaque personne ne voit que les siens.
    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT NOT NULL,
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_complices_idea ON complices(idea_id);
    CREATE INDEX IF NOT EXISTS idx_complices_user ON complices(user_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_organizer ON ideas(organizer_id);
    -- Petites informations sur la base (ex. lots de données de démo déjà ajoutés)
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  prepareVacancies(db);
  prepareResidentNeeds(db);
  prepareResidentProgress(db);
  // Migrations douces (sans effacer la base) : colonnes ajoutées aux signalements après coup.
  const reportCols = new Set((db.prepare(`PRAGMA table_info(reports)`).all() as { name: string }[]).map((c) => c.name));
  if (!reportCols.has("address")) db.exec(`ALTER TABLE reports ADD COLUMN address TEXT`);
  if (!reportCols.has("moment")) db.exec(`ALTER TABLE reports ADD COLUMN moment TEXT`);
  if (!reportCols.has("photos")) db.exec(`ALTER TABLE reports ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'`);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
  seedIfEmpty(db);
  seedDemoExtras(db);
}

// ---------- Utilisateurs ----------
export type UserRow = {
  id: string; email: string; password_hash: string; display_name: string; account_type: string;
  sector: string | null; address: string | null; description: string | null; created_at: string;
};

export function toPublicUser(r: Pick<UserRow, "id" | "display_name" | "account_type" | "sector" | "address" | "description">): PublicUser {
  return {
    id: r.id,
    displayName: r.display_name,
    accountType: r.account_type as PublicUser["accountType"],
    sector: (r.sector as PublicUser["sector"]) ?? null,
    address: r.address,
    description: r.description,
  };
}

export function toSessionUser(r: UserRow): SessionUser {
  return { ...toPublicUser(r), email: r.email, createdAt: r.created_at };
}

/** Les personnes n'ont pas de secteur ni d'adresse publique : seuls les établissements en ont. */
function cleanProfile<T extends { accountType: string; sector: string | null; address: string | null }>(p: T): T {
  return isEstablishment(p.accountType) ? p : { ...p, sector: null, address: null };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Connexion sans mot de passe : on retrouve le compte par son identifiant OU par son nom affiché (sans accents ni majuscules). */
export function findUserByLogin(login: string): UserRow | undefined {
  const byEmail = findUserByEmail(login.toLowerCase());
  if (byEmail) return byEmail;
  const wanted = fold(login);
  const rows = getDb().prepare(`SELECT id, display_name FROM users ORDER BY created_at DESC`).all() as { id: string; display_name: string }[];
  const hit = rows.find((r) => fold(r.display_name) === wanted) ?? rows.find((r) => fold(r.display_name.replace(/\(.*?\)/g, "")) === wanted);
  return hit ? getUserRow(hit.id) : undefined;
}

/** Identifiant libre (unique) tiré d'un nom : « café du parvis », « café du parvis 2 »… */
export function freeLoginFor(base: string): string {
  const root = base.trim().toLowerCase().slice(0, 100) || "voisin";
  let candidate = root;
  for (let k = 2; findUserByEmail(candidate); k++) candidate = `${root} ${k}`;
  return candidate;
}

export function getUserRow(id: string): UserRow | undefined {
  return getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function insertUser(input: SignupInput): string {
  const id = randomUUID();
  const p = cleanProfile(input);
  getDb()
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, account_type, sector, address, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, p.email, p.password ? hashPassword(p.password) : NO_PASSWORD, p.displayName, p.accountType, p.sector, p.address, p.description, new Date().toISOString());
  return id;
}

export function updateUser(id: string, input: ProfileUpdateInput) {
  const p = cleanProfile(input);
  getDb()
    .prepare(`UPDATE users SET display_name = ?, account_type = ?, sector = ?, address = ?, description = ? WHERE id = ?`)
    .run(p.displayName, p.accountType, p.sector, p.address, p.description, id);
}

// ---------- Publications (idées) ----------
type IdeaRow = {
  id: string; organizer_id: string; title: string; description: string; category: string; place: string;
  starts_at: string | null; needs: string; images: string; created_at: string;
  complices_count: number;
  o_name: string; o_type: string; o_sector: string | null; o_address: string | null; o_description: string | null;
};

// @viewer = id de la personne connectée ('' si personne) pour savoir si elle a aimé la publication
const IDEA_SELECT = `
  SELECT i.*,
         (SELECT COUNT(*) FROM complices c WHERE c.idea_id = i.id) AS complices_count,
         u.display_name AS o_name, u.account_type AS o_type, u.sector AS o_sector, u.address AS o_address, u.description AS o_description
  FROM ideas i JOIN users u ON u.id = i.organizer_id`;

function toIdea(r: IdeaRow): Idea {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category as Idea["category"],
    organizer: toPublicUser({ id: r.organizer_id, display_name: r.o_name, account_type: r.o_type, sector: r.o_sector, address: r.o_address, description: r.o_description }),
    place: r.place,
    startsAt: r.starts_at,
    needs: JSON.parse(r.needs),
    images: JSON.parse(r.images),
    createdAt: r.created_at,
    complicesCount: r.complices_count,
  };
}

// Règle de Danny : une publication de RÉSIDENT·E disparaît après l'événement (rien n'est gardé dans son compte).
// On l'efface 6 h après le début de l'activité (le temps qu'elle se termine). Les entreprises gardent leurs publications.
const RESIDENT_TYPES = ACTOR_TYPES.filter((a) => a.group === "personnel").map((a) => a.id);
let lastPurge = 0;
export function purgeEndedResidentPosts(force = false): number {
  if (!force && Date.now() - lastPurge < 60_000) return 0;
  lastPurge = Date.now();
  const cutoff = new Date(Date.now() - 6 * 3_600_000).toISOString();
  return getDb()
    .prepare(
      `DELETE FROM ideas WHERE starts_at IS NOT NULL AND starts_at < ?
       AND organizer_id IN (SELECT id FROM users WHERE account_type IN (${RESIDENT_TYPES.map(() => "?").join(",")}))
       AND NOT EXISTS (SELECT 1 FROM vacancy_bookings b WHERE b.idea_id = ideas.id AND b.status = 'confirmed' AND b.ends_on > ?)`,
    )
    .run(cutoff, ...RESIDENT_TYPES, new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())).changes;
}

/** Fil : les publications les plus récentes d'abord (comme un réseau social). */
export function listIdeas(viewer: string | null): Idea[] {
  purgeEndedResidentPosts();
  const rows = getDb().prepare(`${IDEA_SELECT} ORDER BY i.created_at DESC`).all({ viewer: viewer ?? "" }) as IdeaRow[];
  return rows.map(toIdea);
}

export function listIdeasByOrganizer(userId: string, viewer: string | null): Idea[] {
  return (getDb().prepare(`${IDEA_SELECT} WHERE i.organizer_id = @user ORDER BY i.created_at DESC`).all({ viewer: viewer ?? "", user: userId }) as IdeaRow[]).map(toIdea);
}

export function listIdeasJoinedBy(userId: string, viewer: string | null): Idea[] {
  return (
    getDb()
      .prepare(`${IDEA_SELECT} WHERE i.id IN (SELECT idea_id FROM complices WHERE user_id = @user) ORDER BY i.created_at DESC`)
      .all({ viewer: viewer ?? "", user: userId }) as IdeaRow[]
  ).map(toIdea);
}

export function getIdea(id: string, viewer: string | null): Idea | undefined {
  const row = getDb().prepare(`${IDEA_SELECT} WHERE i.id = @id`).get({ viewer: viewer ?? "", id }) as IdeaRow | undefined;
  return row && toIdea(row);
}

export function ideaExists(id: string): boolean {
  return !!getDb().prepare(`SELECT 1 FROM ideas WHERE id = ?`).get(id);
}

export function insertIdea(organizerId: string, input: CreateIdeaInput): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, organizerId, input.title, input.description, input.category, input.place, input.startsAt,
      JSON.stringify(input.needs), JSON.stringify(input.images), new Date().toISOString());
  syncResidentBadges(getDb(),organizerId);
  return id;
}

// ---------- Complices ----------
export type CompliceRow = {
  id: string; idea_id: string; user_id: string; contribution: string; message: string; created_at: string;
  display_name: string; account_type: string; sector: string | null; address: string | null; description: string | null;
};

export function listComplices(ideaId: string): CompliceRow[] {
  return getDb()
    .prepare(
      `SELECT c.*, u.display_name, u.account_type, u.sector, u.address, u.description
       FROM complices c JOIN users u ON u.id = c.user_id WHERE c.idea_id = ? ORDER BY c.created_at ASC`,
    )
    .all(ideaId) as CompliceRow[];
}

export function alreadyJoined(ideaId: string, userId: string, contribution: string): boolean {
  return !!getDb()
    .prepare(`SELECT 1 FROM complices WHERE idea_id = ? AND user_id = ? AND contribution = ?`)
    .get(ideaId, userId, contribution);
}

export function insertComplice(ideaId: string, userId: string, input: JoinInput): string {
  const db = getDb();
  return db.transaction(() => {
    const id = randomUUID();
    db.prepare(`INSERT INTO complices(id,idea_id,user_id,contribution,message,created_at) VALUES(?,?,?,?,?,?)`).run(id,ideaId,userId,input.contribution,input.message,new Date().toISOString());
    const idea = db.prepare("SELECT organizer_id FROM ideas WHERE id=?").get(ideaId) as {organizer_id:string};
    if (idea.organizer_id !== userId) awardResidentPoints(db,userId,"join",ideaId);
    const {n} = db.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM complices WHERE idea_id=? AND user_id<>?").get(ideaId,idea.organizer_id) as {n:number};
    if(n>=2) awardResidentPoints(db,idea.organizer_id,"idea",ideaId);
    syncResidentBadges(db,userId);
    syncResidentBadges(db,idea.organizer_id);
    return id;
  }).immediate();
}

// ---------- Invitations (problème 1 : « Inviter mes complices ») ----------
export type InvitationRow = {
  id: string; idea_id: string; from_id: string; to_id: string; contribution: string; reason: string;
  status: "pending" | "accepted" | "declined"; created_at: string; answered_at: string | null;
};

/** Crée les invitations (une seule par personne et par idée ; jamais à soi-même). Renvoie le nombre créé. */
export function insertInvitations(ideaId: string, fromId: string, invites: { userId: string; contribution: string; reason: string }[]): number {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO invitations (id, idea_id, from_id, to_id, contribution, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  );
  let n = 0;
  db.transaction(() => {
    for (const i of invites) {
      if (i.userId === fromId || !getUserRow(i.userId)) continue;
      n += stmt.run(randomUUID(), ideaId, fromId, i.userId, i.contribution, i.reason, new Date().toISOString()).changes;
    }
  })();
  return n;
}

export function listInvitationsTo(userId: string): InvitationRow[] {
  return getDb().prepare(`SELECT * FROM invitations WHERE to_id = ? ORDER BY (status = 'pending') DESC, created_at DESC`).all(userId) as InvitationRow[];
}

export function listInvitationsFrom(userId: string): InvitationRow[] {
  return getDb().prepare(`SELECT * FROM invitations WHERE from_id = ? ORDER BY created_at DESC`).all(userId) as InvitationRow[];
}

export function listInvitationsForIdea(ideaId: string): InvitationRow[] {
  return getDb().prepare(`SELECT * FROM invitations WHERE idea_id = ? ORDER BY created_at ASC`).all(ideaId) as InvitationRow[];
}

export function countPendingInvitations(userId: string): number {
  return (getDb().prepare(`SELECT COUNT(*) AS n FROM invitations WHERE to_id = ? AND status = 'pending'`).get(userId) as { n: number }).n;
}

/** L'invité·e répond. « Je suis complice » l'ajoute aux complices de l'idée. null = invitation introuvable. */
export function answerInvitation(id: string, userId: string, accept: boolean): InvitationRow | null {
  const db = getDb();
  const inv = db.prepare(`SELECT * FROM invitations WHERE id = ? AND to_id = ?`).get(id, userId) as InvitationRow | undefined;
  if (!inv) return null;
  db.transaction(() => {
    db.prepare(`UPDATE invitations SET status = ?, answered_at = ? WHERE id = ?`).run(accept ? "accepted" : "declined", new Date().toISOString(), id);
    if (accept && !alreadyJoined(inv.idea_id, userId, inv.contribution)) {
      insertComplice(inv.idea_id, userId, { contribution: inv.contribution as JoinInput["contribution"], message: "Invité·e par l'organisateur·rice, et partant·e !" });
    }
  })();
  return db.prepare(`SELECT * FROM invitations WHERE id = ?`).get(id) as InvitationRow;
}

/** Comptes candidats pour le moteur de complices (tout le monde sauf la personne qui lance l'idée). */
export function listMatchCandidates(exceptId: string | null) {
  return getDb()
    .prepare(
      `SELECT u.id, u.display_name, u.account_type, u.sector, u.address, u.description,
              (SELECT COUNT(*) FROM complices c WHERE c.user_id = u.id AND c.contribution <> 'participer') AS helped,
              (SELECT GROUP_CONCAT(i.category) FROM complices c JOIN ideas i ON i.id = c.idea_id WHERE c.user_id = u.id) AS helped_categories,
              (SELECT GROUP_CONCAT(c.contribution) FROM complices c WHERE c.user_id = u.id) AS contributions
       FROM users u WHERE u.id <> ?`,
    )
    .all(exceptId ?? "") as {
    id: string; display_name: string; account_type: string; sector: string | null; address: string | null; description: string | null;
    helped: number; helped_categories: string | null; contributions: string | null;
  }[];
}

/** Dates déjà prises par d'autres activités (pour proposer une date sans conflit). */
export function listScheduledIdeas(): { title: string; starts_at: string }[] {
  return getDb().prepare(`SELECT title, starts_at FROM ideas WHERE starts_at IS NOT NULL`).all() as { title: string; starts_at: string }[];
}

// ---------- Signalements (privés) ----------
export type ReportRow = {
  id: string; user_id: string; kind: string; category: string; description: string;
  moment: string | null; address: string | null; photos: string; lat: number; lng: number; created_at: string;
};

export function listReportsByUser(userId: string): ReportRow[] {
  return getDb().prepare(`SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as ReportRow[];
}

export function insertReport(
  userId: string,
  r: { kind: string; category: string; description: string; moment: string | null; address: string | null; photos: string[]; lat: number; lng: number },
): ReportRow {
  const row: ReportRow = {
    id: randomUUID(), user_id: userId, kind: r.kind, category: r.category, description: r.description,
    moment: r.moment, address: r.address, photos: JSON.stringify(r.photos), lat: r.lat, lng: r.lng, created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO reports (id, user_id, kind, category, description, moment, address, photos, lat, lng, created_at)
       VALUES (@id, @user_id, @kind, @category, @description, @moment, @address, @photos, @lat, @lng, @created_at)`,
    )
    .run(row);
  return row;
}

/** Supprime un signalement seulement s'il appartient à cette personne. Renvoie ses photos (à effacer), ou null s'il est introuvable. */
export function deleteOwnReport(id: string, userId: string): string[] | null {
  const db = getDb();
  const row = db.prepare(`SELECT photos FROM reports WHERE id = ? AND user_id = ?`).get(id, userId) as { photos: string } | undefined;
  if (!row) return null;
  db.prepare(`DELETE FROM reports WHERE id = ? AND user_id = ?`).run(id, userId);
  return JSON.parse(row.photos || "[]");
}

/** Cette photo appartient-elle à un des signalements de cette personne ? (les photos ne sont jamais publiques) */
export function ownsReportPhoto(userId: string, url: string): boolean {
  return !!getDb().prepare(`SELECT 1 FROM reports WHERE user_id = ? AND instr(photos, ?) > 0`).get(userId, JSON.stringify(url));
}

// ---------- Données de démo (fictives) ----------
type DemoUser = { name: string; type: string; sector?: string; address?: string; description?: string; login?: keyof typeof DEMO_LOGINS };

// Comptes fictifs. Deux d'entre eux sont connectables pour la démo (voir src/lib/demo-accounts.ts).
const DEMO_USERS: Record<string, DemoUser> = {
  voisins: { name: "Comité des voisins du Parvis", type: "habitant" },
  parents: { name: "Les Parents du Faubourg", type: "organisme", sector: "communautaire", description: "Activités pour les familles du quartier." },
  atelier: { name: "Atelier Couleurs Saint-Roch", type: "organisme", sector: "culture", description: "Art participatif avec les jeunes." },
  marieeve: { name: "Marie-Ève", type: "habitant", login: "habitant" },
  cafe: { name: "Café du Coin (démo)", type: "commerce", sector: "cafe", address: "Rue Saint-Joseph Est", description: "Petit café de quartier, terrasse l'été.", login: "commerce" },
  club: { name: "Club Lecture Basse-Ville", type: "organisme", sector: "culture" },
  marche: { name: "Marché solidaire (démo)", type: "organisme", sector: "communautaire" },
  pixel: { name: "Studio Pixel (démo)", type: "entreprise", sector: "tech", address: "Rue du Parvis", description: "Studio de jeux vidéo indépendant." },
  julien: { name: "Julien", type: "travailleur" },
  sofia: { name: "Sofia", type: "etudiant" },
  friperie: { name: "Boutique Friperie (démo)", type: "commerce", sector: "boutique", address: "Rue Saint-Joseph Est" },
  quincaillerie: { name: "Quincaillerie du quartier (démo)", type: "commerce", sector: "services", address: "Rue du Pont" },
  amina: { name: "Amina", type: "habitant" },
  bistro: { name: "Bistro du Faubourg (démo)", type: "commerce", sector: "restaurant", address: "Rue Saint-Joseph Est", description: "Cuisine de quartier, ouvert tard quand le quartier est au rendez-vous." },
};

const demoEmail = (key: string) => {
  const login = DEMO_USERS[key].login;
  return login ? DEMO_LOGINS[login].email : `demo-${key}@complices.local`;
};

/** Prochain jour de la semaine donné (0 = dimanche … 6 = samedi), au moins `minDays` jours plus tard, à l'heure locale. */
function nextWeekday(weekday: number, hour: number, minute = 0, minDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Retrouve un compte de démo par son courriel (ou le crée s'il manque, ex. le Bistro dans une ancienne base). */
function demoUserId(db: Db, key: string): string {
  const found = db.prepare(`SELECT id FROM users WHERE email = ?`).get(demoEmail(key)) as { id: string } | undefined;
  if (found) return found.id;
  const u = DEMO_USERS[key];
  const id = randomUUID();
  const login = u.login ? DEMO_LOGINS[u.login] : null;
  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, account_type, sector, address, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, demoEmail(key), login ? hashPassword(login.password) : NO_PASSWORD, u.name, u.type, u.sector ?? null, u.address ?? null, u.description ?? null, new Date(Date.now() - 50 * 3_600_000).toISOString());
  return id;
}

// Lot de départ : inséré seulement si la base est vide.
function seedIfEmpty(db: Db) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number };
  if (n > 0) return;

  const now = Date.now();
  const day = (offsetDays: number, hour: number, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const users = DEMO_USERS;

  const insertUserStmt = db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, account_type, sector, address, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const ids: Record<string, string> = {};
  const ideas: [string, string, string, string, string, string | null, string[]][] = [
    // [organisateur, titre, description, catégorie, lieu, date, besoins]
    ["voisins", "Tournoi de pétanque du midi sur le parvis", "Une pause de 30 minutes pour les travailleurs et les voisins : pétanque, café et rencontres. On cherche des boules, un café partenaire et quelques bénévoles pour l'accueil.", "sport", "Parvis de l'église Saint-Roch", day(2, 12), ["participants", "materiel", "commandite"]],
    ["parents", "Fête d'Halloween pour les enfants du quartier", "Parcours de bonbons chez les commerçants de la rue Saint-Joseph, maquillage et bricolage. On cherche des commerces participants et des bénévoles costumés !", "communautaire", "Rue Saint-Joseph Est", day(15, 16), ["benevoles", "commandite", "participants"]],
    ["atelier", "Murale collective sous les piliers de l'îlot Fleurie", "Projet d'art participatif avec des jeunes du quartier. On cherche un artiste mentor, de la peinture et une commandite pour le matériel.", "culturel", "Îlot Fleurie", day(9, 10), ["expertise", "materiel", "commandite", "benevoles"]],
    ["marieeve", "Corvée de verdissement du jardin Jean-Paul-L'Allier", "Plantation de vivaces et nettoyage d'automne. Gants fournis, collation offerte. Ouvert à toutes et tous, même si c'est ta première fois.", "environnement", "Jardin Jean-Paul-L'Allier", day(5, 9, 30), ["benevoles", "materiel"]],
    ["cafe", "On recrute : barista à temps partiel", "Petit café de quartier cherche une personne souriante pour les matins de semaine. Idéal pour un·e étudiant·e. Passe nous voir ou propose-toi ici.", "recrutement", "Rue Saint-Joseph Est", null, ["participants"]],
    ["club", "Soirée lecture et jeux de société à la bibliothèque", "Une soirée conviviale pour rencontrer ses voisins, surtout si tu viens d'arriver dans le quartier. Viens seul·e, on t'accueille !", "culturel", "Bibliothèque Gabrielle-Roy", day(3, 18, 30), ["participants", "benevoles"]],
    ["marche", "Banque de bénévoles pour le marché solidaire du samedi", "On a besoin de bras pour monter les tables, accueillir et ranger. 2 heures par semaine suffisent pour faire une vraie différence.", "benevolat", "Parvis de l'église Saint-Roch", nextWeekday(6, 9), ["benevoles", "materiel"]],
    ["pixel", "Dîner-rencontre des studios tech de Saint-Roch", "Les entreprises tech du quartier se rencontrent le temps d'un dîner pour se connaître, partager des idées et monter des projets communs.", "commerce", "Place de l'Université-du-Québec", day(7, 12), ["participants", "lieu"]],
  ];
  const complices: [number, string, string, string][] = [
    // [index de l'idée, complice, contribution, message]
    [0, "cafe", "commandite", "On offre le café aux 20 premiers !"],
    [0, "julien", "materiel", "J'ai 3 jeux de boules."],
    [0, "sofia", "participer", ""],
    [1, "friperie", "commandite", "Bonbons et décorations offerts."],
    [1, "julien", "benevole", "Je serai déguisé en pirate."],
    [2, "sofia", "benevole", ""],
    [3, "julien", "benevole", ""],
    [3, "quincaillerie", "materiel", "Je prête 10 pelles et des gants."],
    [5, "amina", "participer", "Je viens d'arriver dans le quartier !"],
  ];

  db.transaction(() => {
    Object.entries(users).forEach(([key, u], k) => {
      ids[key] = randomUUID();
      const login = u.login ? DEMO_LOGINS[u.login] : null;
      insertUserStmt.run(
        ids[key],
        demoEmail(key),
        login ? hashPassword(login.password) : NO_PASSWORD,
        u.name, u.type, u.sector ?? null, u.address ?? null, u.description ?? null,
        new Date(now - (40 - k) * 3_600_000).toISOString(),
      );
    });
    const ideaIds = ideas.map(([org, title, description, category, place, startsAt, needs], k) => {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
      ).run(id, ids[org], title, description, category, place, startsAt, JSON.stringify(needs), new Date(now - (ideas.length - k) * 3_600_000).toISOString());
      return id;
    });
    complices.forEach(([k, who, contribution, message], j) => {
      db.prepare(`INSERT INTO complices (id, idea_id, user_id, contribution, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
        randomUUID(), ideaIds[k], ids[who], contribution, message, new Date(now - (complices.length - j) * 600_000).toISOString(),
      );
    });
  })();
}

// Lot n° 2 (15 oct.) : 9 publications illustrées qui montrent les fonctionnalités de Complices.
// Ajouté UNE fois par base (clé dans `meta`), même dans une base existante : rien n'est effacé.
// Les illustrations sont dans public/demo/ (dessinées en code, aucune image externe ni donnée confidentielle).
const DEMO_EXTRAS_KEY = "demo-posts-v2";

function seedDemoExtras(db: Db) {
  if (db.prepare(`SELECT 1 FROM meta WHERE key = ?`).get(DEMO_EXTRAS_KEY)) return;
  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  const userId = (key: string) => demoUserId(db, key);

  type DemoPost = {
    key: string; by: string; title: string; description: string; category: string; place: string;
    startsAt: string | null; needs: string[]; images: string[]; age: number; // âge en minutes
    complices: [who: string, contribution: string, message: string][];
  };
  const posts: DemoPost[] = [
    {
      key: "soiree", by: "bistro", age: 35,
      title: "Jeudi soir, la rue Saint-Joseph reste allumée ✨",
      description: "6 commerces de la rue s'engagent à rester ouverts jusqu'à 22 h jeudi… si assez de monde confirme sa venue ! Terrasses chauffées, musique, menus à partager et vitrines illuminées. Clique sur « Je me propose » pour confirmer que tu viens : plus on est nombreux, plus la rue s'allume.",
      category: "commerce", place: "Rue Saint-Joseph Est", startsAt: nextWeekday(4, 18), needs: ["participants", "benevoles"],
      images: ["/demo/soiree-complice.svg"],
      complices: [
        ["cafe", "commandite", "Café offert aux 30 premiers !"],
        ["friperie", "participer", "La friperie reste ouverte jusqu'à 22 h 🛍️"],
        ["julien", "participer", "J'y serai avec mes collègues !"],
        ["marieeve", "benevole", "Je peux aider à installer les guirlandes."],
        ["amina", "participer", ""],
        ["sofia", "participer", ""],
      ],
    },
    {
      key: "midi", by: "cafe", age: 130,
      title: "Le Midi Complice : -15 % pour les travailleurs du quartier 🥣",
      description: "Tu travailles à Saint-Roch ? Montre ta carte d'employé·e et profite de 15 % de rabais sur la formule soupe + sandwich, du lundi au vendredi. Et chaque mercredi, une grande table commune pour dîner avec les autres travailleurs du coin. Viens seul·e, repars avec des contacts !",
      category: "commerce", place: "Rue Saint-Joseph Est", startsAt: nextWeekday(3, 12), needs: ["participants"],
      images: ["/demo/midi-complice.svg"],
      complices: [
        ["julien", "participer", "On est 5 du bureau à venir mercredi."],
        ["pixel", "participer", "L'équipe du studio réserve la grande table !"],
      ],
    },
    {
      key: "marche", by: "parents", age: 180,
      title: "Marche exploratoire de soir : repérons les coins sombres 🔦",
      description: "Mardi à 19 h, on fait le tour du quartier à pied, en groupe, pour repérer les endroits mal éclairés ou peu accueillants. Chaque coin repéré sera signalé sur la carte de l'onglet 📍 Signaler : regroupés, les signalements montrent où agir en premier. Lampes de poche et chocolat chaud fournis. Ouvert à toutes et à tous.",
      category: "communautaire", place: "Parvis de l'église Saint-Roch", startsAt: nextWeekday(2, 19), needs: ["participants", "benevoles"],
      images: ["/demo/marche-exploratoire.svg"],
      complices: [
        ["voisins", "benevole", "On guide le groupe dans les ruelles."],
        ["bistro", "lieu", "Point de chute au chaud au bistro à la fin !"],
        ["marieeve", "participer", ""],
      ],
    },
    {
      key: "vitrine", by: "atelier", age: 300,
      title: "Une vitrine vide devient une galerie 🖼️",
      description: "Un local vacant de la rue nous prête sa vitrine pour tout le mois de novembre ! On cherche 4 artistes du quartier (même débutant·e·s) pour exposer, et un commerce voisin pour éclairer la vitrine le soir. Vernissage en plein air, chocolat chaud offert.",
      category: "culturel", place: "Rue Saint-Joseph Est", startsAt: nextWeekday(5, 17, 0, 17), needs: ["participants", "expertise", "materiel"],
      images: ["/demo/vitrine-ephemere.svg"],
      complices: [
        ["friperie", "materiel", "On prête nos spots et des rallonges."],
        ["amina", "participer", "Je peins depuis 2 ans, je veux bien exposer !"],
      ],
    },
    {
      key: "travaux", by: "friperie", age: 420,
      title: "Ouvert pendant les travaux 🚧 Entrez par la ruelle !",
      description: "Les travaux bloquent notre entrée principale cette semaine, mais on est bel et bien ouverts ! Passe par la ruelle à l'arrière et suis les flèches orange. Pour vous remercier de votre fidélité : 2 morceaux achetés = le 3ᵉ à moitié prix.",
      category: "commerce", place: "Rue Saint-Joseph Est", startsAt: null, needs: ["participants"],
      images: ["/demo/ouvert-travaux.svg"],
      complices: [["marieeve", "participer", "J'y passe samedi !"]],
    },
    {
      key: "bienvenue", by: "club", age: 540,
      title: "Nouveaux dans le quartier ? Café de bienvenue ☕",
      description: "Tu viens d'emménager à Saint-Roch ? Viens rencontrer tes voisin·e·s autour d'un café, puis on part pour une petite visite à pied : la bibliothèque, le marché, les parcs et nos bonnes adresses. Les enfants sont les bienvenus !",
      category: "communautaire", place: "Bibliothèque Gabrielle-Roy", startsAt: nextWeekday(6, 10), needs: ["participants", "benevoles"],
      images: ["/demo/bienvenue-voisin.svg"],
      complices: [
        ["amina", "participer", "J'aurais aimé ça à mon arrivée, je viens !"],
        ["parents", "benevole", "On anime un coin pour les enfants."],
      ],
    },
    {
      key: "gamejam", by: "pixel", age: 780,
      title: "Game jam de quartier : un jeu vidéo sur Saint-Roch 🎮",
      description: "48 h pour créer ensemble un petit jeu inspiré du quartier : ses rues, son église, ses histoires. On forme des équipes mixtes (devs, artistes, étudiant·e·s, curieux·ses) : aucune expérience requise ! On cherche un lieu avec du Wi-Fi, des mentors et des commanditaires pour la bouffe.",
      category: "culturel", place: "Place de l'Université-du-Québec", startsAt: nextWeekday(5, 18, 0, 14), needs: ["lieu", "commandite", "expertise", "participants"],
      images: ["/demo/game-jam.svg"],
      complices: [
        ["atelier", "expertise", "Nos jeunes artistes peuvent dessiner les personnages !"],
        ["club", "expertise", "On peut écrire l'histoire du jeu 📚"],
        ["sofia", "participer", ""],
      ],
    },
    {
      key: "clinique", by: "sofia", age: 960,
      title: "Clinique CV gratuite, par des étudiant·e·s 📄",
      description: "Avec trois ami·e·s en ressources humaines, on offre des corrections de CV et des simulations d'entrevue, gratuitement, aux gens du quartier. Il nous manque juste un lieu calme avec quelques tables, un samedi par mois. Un commerce ou un organisme pour nous accueillir ?",
      category: "benevolat", place: "Saint-Roch (lieu à trouver)", startsAt: null, needs: ["lieu", "participants"],
      images: [],
      complices: [["julien", "participer", "Mon CV en a bien besoin 😅"]],
    },
    {
      key: "bonnes", by: "voisins", age: 1200,
      title: "Mission accomplie : le parvis a retrouvé ses couleurs 🌷",
      description: "Samedi dernier, 28 voisin·e·s, 3 commerces et une classe du quartier ont planté 120 bulbes autour du parvis. Merci à la Quincaillerie pour les pelles et au Café du Coin pour le chocolat chaud ! Rendez-vous au printemps pour voir le résultat. 📣 Une bonne nouvelle de Saint-Roch, à partager !",
      category: "environnement", place: "Parvis de l'église Saint-Roch", startsAt: null, needs: [],
      images: ["/demo/bonne-nouvelle-1.svg", "/demo/bonne-nouvelle-2.svg"],
      complices: [
        ["quincaillerie", "materiel", "Pelles et gants prêtés."],
        ["cafe", "commandite", "Chocolat chaud pour tout le monde !"],
        ["marieeve", "benevole", ""],
        ["julien", "benevole", ""],
      ],
    },
  ];

  const keys = Object.keys(DEMO_USERS);
  db.transaction(() => {
    const ids = Object.fromEntries(keys.map((k) => [k, userId(k)]));
    posts.forEach((p) => {
      const ideaId = randomUUID();
      db.prepare(
        `INSERT INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(ideaId, ids[p.by], p.title, p.description, p.category, p.place, p.startsAt, JSON.stringify(p.needs), JSON.stringify(p.images), minutesAgo(p.age));
      p.complices.forEach(([who, contribution, message], j) => {
        db.prepare(`INSERT OR IGNORE INTO complices (id, idea_id, user_id, contribution, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
          randomUUID(), ideaId, ids[who], contribution, message, minutesAgo(Math.max(1, p.age - 5 - j * 7)),
        );
      });
    });
    db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(DEMO_EXTRAS_KEY, new Date(now).toISOString());
  })();
}
