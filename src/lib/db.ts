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
import type { PublicationSource } from "./quartier";
import type { ImportedPost } from "./social-import";

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
  // Deux espaces séparés : « activite » (Vie Saint-Roch) et « entreprise » (publications des commerces : promo, emploi…)
  const ideaCols = new Set((db.prepare(`PRAGMA table_info(ideas)`).all() as { name: string }[]).map((c) => c.name));
  if (!ideaCols.has("kind")) db.exec(`ALTER TABLE ideas ADD COLUMN kind TEXT NOT NULL DEFAULT 'activite'`);
  if (!ideaCols.has("post_type")) db.exec(`ALTER TABLE ideas ADD COLUMN post_type TEXT`);
  // F3 (Stelle) : provenance de la publication. Le type promo / nouveauté d'une publication d'entreprise va dans
  // post_type (comme celles écrites dans l'app) ; un événement importé est une activité (kind = 'activite').
  // source = manuel | facebook | instagram ; external_id = id du post chez la source (idempotence de l'import).
  if (!ideaCols.has("source")) db.exec(`ALTER TABLE ideas ADD COLUMN source TEXT NOT NULL DEFAULT 'manuel'`);
  if (!ideaCols.has("external_id")) db.exec(`ALTER TABLE ideas ADD COLUMN external_id TEXT`);
  if (!ideaCols.has("hidden")) db.exec(`ALTER TABLE ideas ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`);
  // Partielle : les publications manuelles n'ont pas d'external_id et ne se gênent pas entre elles.
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_external ON ideas(source, external_id) WHERE external_id IS NOT NULL`);
  // F3 : pages sociales liées par un compte entreprise, ex. {"facebook":{"name":"Café du Coin","linkedAt":"…"}}
  const userCols = new Set((db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map((c) => c.name));
  if (!userCols.has("linked_pages")) db.exec(`ALTER TABLE users ADD COLUMN linked_pages TEXT NOT NULL DEFAULT '{}'`);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
  purgeDemoData(db);
}

// ---------- Utilisateurs ----------
export type UserRow = {
  id: string; email: string; password_hash: string; display_name: string; account_type: string;
  sector: string | null; address: string | null; description: string | null; created_at: string;
  linked_pages: string;
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
  kind?: string; post_type?: string | null;
  source: string; external_id: string | null; hidden: number;
  complices_count: number;
  o_name: string; o_type: string; o_sector: string | null; o_address: string | null; o_description: string | null;
};

// @viewer = id de la personne connectée ('' si personne) pour savoir si elle a aimé la publication
const IDEA_SELECT = `
  SELECT i.*,
         (SELECT COUNT(*) FROM complices c WHERE c.idea_id = i.id) AS complices_count,
         u.display_name AS o_name, u.account_type AS o_type, u.sector AS o_sector, u.address AS o_address, u.description AS o_description
  FROM ideas i JOIN users u ON u.id = i.organizer_id`;

// F3 : une publication masquée par son auteur disparaît du fil, mais lui la voit encore.
const VISIBLE = `(i.hidden = 0 OR i.organizer_id = @viewer)`;

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
    source: (r.source as Idea["source"]) ?? "manuel",
    complicesCount: r.complices_count,
    kind: r.kind === "entreprise" ? "entreprise" : "activite",
    postType: r.post_type ?? null,
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
// Par défaut : seulement les ACTIVITÉS (Vie Saint-Roch). Les publications d'entreprises ne s'y mélangent jamais.
export function listIdeas(viewer: string | null, kind: "activite" | "entreprise" = "activite"): Idea[] {
  purgeEndedResidentPosts();
  const rows = getDb().prepare(`${IDEA_SELECT} WHERE COALESCE(i.kind, 'activite') = @kind AND ${VISIBLE} ORDER BY i.created_at DESC`).all({ viewer: viewer ?? "", kind }) as IdeaRow[];
  return rows.map(toIdea);
}

export function listIdeasByOrganizer(userId: string, viewer: string | null): Idea[] {
  return (getDb().prepare(`${IDEA_SELECT} WHERE i.organizer_id = @user AND ${VISIBLE} ORDER BY i.created_at DESC`).all({ viewer: viewer ?? "", user: userId }) as IdeaRow[]).map(toIdea);
}

export function listIdeasJoinedBy(userId: string, viewer: string | null): Idea[] {
  return (
    getDb()
      .prepare(`${IDEA_SELECT} WHERE i.id IN (SELECT idea_id FROM complices WHERE user_id = @user) AND ${VISIBLE} ORDER BY i.created_at DESC`)
      .all({ viewer: viewer ?? "", user: userId }) as IdeaRow[]
  ).map(toIdea);
}

export function getIdea(id: string, viewer: string | null): Idea | undefined {
  const row = getDb().prepare(`${IDEA_SELECT} WHERE i.id = @id AND ${VISIBLE}`).get({ viewer: viewer ?? "", id }) as IdeaRow | undefined;
  return row && toIdea(row);
}

export function ideaExists(id: string): boolean {
  return !!getDb().prepare(`SELECT 1 FROM ideas WHERE id = ?`).get(id);
}

export function insertIdea(organizerId: string, input: Omit<CreateIdeaInput, "kind">): string { // « kind » (F3) n'est pas stocké : une idée reste une activité
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at, kind, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activite', 'manuel')`,
    )
    // Toujours une activité de Vie Saint-Roch (séparation des espaces) : le champ « kind » de createIdeaSchema
    // (promo / nouveauté / événement, F3) n'est pas stocké ici ; les promos passent par insertBusinessPost.
    .run(id, organizerId, input.title, input.description, input.category, input.place, input.startsAt,
      JSON.stringify(input.needs), JSON.stringify(input.images), new Date().toISOString());
  syncResidentBadges(getDb(),organizerId);
  return id;
}

/** Publication d'entreprise (promo, nouveauté, emploi, offre…) : va dans l'onglet « Entreprises », jamais dans Vie Saint-Roch. */
export function insertBusinessPost(organizerId: string, p: { postType: string; title: string; description: string; images: string[]; place: string }): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at, kind, post_type)
       VALUES (?, ?, ?, ?, 'commerce', ?, NULL, '[]', ?, ?, 'entreprise', ?)`,
    )
    .run(id, organizerId, p.title, p.description, p.place, JSON.stringify(p.images), new Date().toISOString(), p.postType);
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
       FROM users u WHERE u.id <> ? AND u.account_type <> 'invite'`,
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

// ---------- Plus de données de démo (demande de Danny, 15 oct.) ----------
// Nettoyage unique : efface les anciens comptes de démo (courriels en « @complices.local ») et tout ce qui leur est lié
// (publications, complices, invitations, signalements) grâce aux ON DELETE CASCADE. Les vrais comptes ne sont pas touchés.
const DEMO_PURGE_KEY = "demo-supprimee";

function purgeDemoData(db: Db) {
  if (db.prepare(`SELECT 1 FROM meta WHERE key = ?`).get(DEMO_PURGE_KEY)) return;
  db.transaction(() => {
    db.prepare(`DELETE FROM users WHERE email LIKE '%@complices.local'`).run();
    db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(DEMO_PURGE_KEY, new Date().toISOString());
  })();
}

// ---------- F3 : pages sociales liées et import simulé ----------

/** État de la liaison d'un compte : { facebook: { name, linkedAt }, … } */
export type LinkedPage = { name: string; linkedAt: string };
export type LinkedPages = Partial<Record<Exclude<PublicationSource, "manuel">, LinkedPage>>;

export function getLinkedPages(userId: string): LinkedPages {
  const row = getDb().prepare(`SELECT linked_pages FROM users WHERE id = ?`).get(userId) as { linked_pages: string } | undefined;
  if (!row) return {};
  try {
    return JSON.parse(row.linked_pages || "{}") as LinkedPages;
  } catch {
    return {}; // base d'une version précédente : on repart d'aucune liaison
  }
}

function setLinkedPages(userId: string, pages: LinkedPages) {
  getDb().prepare(`UPDATE users SET linked_pages = ? WHERE id = ?`).run(JSON.stringify(pages), userId);
}

export function linkPage(userId: string, source: Exclude<PublicationSource, "manuel">, name: string) {
  setLinkedPages(userId, { ...getLinkedPages(userId), [source]: { name, linkedAt: new Date().toISOString() } });
}

/** Délier : la liaison tombe et les publications venues de cette source repartent. */
export function unlinkPage(userId: string, source: Exclude<PublicationSource, "manuel">): number {
  const pages = getLinkedPages(userId);
  delete pages[source];
  setLinkedPages(userId, pages);
  return getDb().prepare(`DELETE FROM ideas WHERE organizer_id = ? AND source = ?`).run(userId, source).changes;
}

/**
 * Insère un lot importé. `INSERT OR IGNORE` + l'index unique (source, external_id)
 * rendent l'opération idempotente : relier deux fois n'ajoute rien de plus.
 * Renvoie le nombre de publications réellement ajoutées.
 */
export function insertImportedIdeas(
  organizerId: string,
  source: Exclude<PublicationSource, "manuel">,
  posts: ImportedPost[],
  category: string,
  place: string,
): number {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO ideas (id, organizer_id, title, description, category, place, starts_at, needs, images, created_at, kind, post_type, source, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?)`,
  );
  const run = getDb().transaction((batch: ImportedPost[]) => {
    let added = 0;
    for (const p of batch) {
      // Séparation des espaces : une promo ou une nouveauté va dans Entreprises (post_type) ; un événement daté
      // est une activité de Vie Saint-Roch, comme si le commerce l'avait publiée dans l'app.
      const event = p.kind === "evenement";
      added += stmt.run(randomUUID(), organizerId, p.title, p.description, category, place, p.startsAt, p.createdAt,
        event ? "activite" : "entreprise", event ? null : p.kind, source, p.externalId).changes;
    }
    return added;
  });
  return run(posts);
}

/** Masquer ou réafficher une publication. Seul son auteur peut le faire. */
export function setIdeaHidden(ideaId: string, userId: string, hidden: boolean): boolean {
  return getDb().prepare(`UPDATE ideas SET hidden = ? WHERE id = ? AND organizer_id = ?`).run(hidden ? 1 : 0, ideaId, userId).changes > 0;
}

/** F1 « Nouveau dans le quartier » : les promos et nouveautés récentes des entreprises. */
export function listNewInQuartier(viewer: string | null, limit = 6): Idea[] {
  const rows = getDb()
    .prepare(
      `${IDEA_SELECT} WHERE COALESCE(i.kind, 'activite') = 'entreprise' AND i.post_type IN ('promo', 'nouveaute') AND ${VISIBLE}
       ORDER BY i.created_at DESC LIMIT @limit`,
    )
    .all({ viewer: viewer ?? "", limit }) as IdeaRow[];
  return rows.map(toIdea);
}
