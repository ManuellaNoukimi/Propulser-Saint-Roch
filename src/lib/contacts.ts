import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, getUserRow, toPublicUser } from "./db";
import type { PublicUser } from "./types";

// « Contacter » un acteur (annuaire, tableau de bord, page publique) : un message laissé dans l'app.
// Le courriel n'est jamais montré ; le destinataire voit le message dans son tableau de bord et peut répondre.
// Table ajoutée sans rien effacer (CREATE TABLE IF NOT EXISTS), créée au premier usage.

type Db = ReturnType<typeof getDb>;
let ready: Db | null = null;
function db(): Db {
  const d = getDb();
  if (ready !== d) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_contact_requests_to ON contact_requests(to_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_contact_requests_from ON contact_requests(from_id, created_at);
    `);
    ready = d;
  }
  return d;
}

export const CONTACTS_PER_DAY = 20;

export class ContactError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function sendContact(fromId: string, toId: string, message: string): string {
  if (fromId === toId) throw new ContactError(400, "Tu ne peux pas te contacter toi-même.");
  if (!getUserRow(toId)) throw new ContactError(404, "Ce compte n'existe pas.");
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { n } = db().prepare(`SELECT COUNT(*) AS n FROM contact_requests WHERE from_id = ? AND created_at > ?`).get(fromId, since) as { n: number };
  if (n >= CONTACTS_PER_DAY) throw new ContactError(429, "Tu as envoyé beaucoup de messages aujourd'hui. Réessaie demain.");
  const id = randomUUID();
  db().prepare(`INSERT INTO contact_requests (id, from_id, to_id, message, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id, fromId, toId, message, new Date().toISOString());
  return id;
}

export type ContactMessage = { id: string; with: PublicUser; message: string; createdAt: string; read: boolean };

function withUser(id: string): PublicUser | null {
  const u = getUserRow(id);
  return u ? toPublicUser(u) : null;
}

export function listContacts(userId: string): { received: ContactMessage[]; sent: ContactMessage[]; unread: number } {
  type Row = { id: string; from_id: string; to_id: string; message: string; created_at: string; read_at: string | null };
  const received = db().prepare(`SELECT * FROM contact_requests WHERE to_id = ? ORDER BY created_at DESC LIMIT 50`).all(userId) as Row[];
  const sent = db().prepare(`SELECT * FROM contact_requests WHERE from_id = ? ORDER BY created_at DESC LIMIT 50`).all(userId) as Row[];
  const map = (r: Row, other: string): ContactMessage | null => {
    const w = withUser(other);
    return w ? { id: r.id, with: w, message: r.message, createdAt: r.created_at, read: !!r.read_at } : null;
  };
  return {
    received: received.map((r) => map(r, r.from_id)).filter((m): m is ContactMessage => !!m),
    sent: sent.map((r) => map(r, r.to_id)).filter((m): m is ContactMessage => !!m),
    unread: received.filter((r) => !r.read_at).length,
  };
}

export function markContactsRead(userId: string): number {
  return db().prepare(`UPDATE contact_requests SET read_at = ? WHERE to_id = ? AND read_at IS NULL`).run(new Date().toISOString(), userId).changes;
}

/** Messages reçus cette semaine (pour les chiffres du tableau de bord). */
export function countContactsSince(userId: string, sinceIso: string): number {
  return (db().prepare(`SELECT COUNT(*) AS n FROM contact_requests WHERE to_id = ? AND created_at > ?`).get(userId, sinceIso) as { n: number }).n;
}
