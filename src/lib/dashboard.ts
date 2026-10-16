import "server-only";
import { listActors, type DirectoryActor } from "./actors";
import { countContactsSince, listContacts } from "./contacts";
import { countPendingInvitations, getDb, type UserRow } from "./db";

// Tableau de bord d'un commerce, d'une entreprise ou d'un organisme (/entreprises/tableau).

const DAY = 86_400_000;

type Suggestion = DirectoryActor & { reason: string };

// Pourquoi deux acteurs gagneraient à travailler ensemble, selon leurs types.
const WHY: Record<string, Record<string, string>> = {
  commerce: {
    organisme: "Un organisme organise des activités : ton commerce peut offrir un lieu, du matériel ou un prix.",
    entreprise: "Ses employés sont tes clients du midi : rabais d'équipe, traiteur, dîners de groupe.",
    commerce: "Un commerce voisin d'un autre secteur : promo croisée ou événement commun.",
  },
  entreprise: {
    organisme: "Tes employés peuvent faire du bénévolat avec lui, ou ton entreprise commanditer une activité.",
    commerce: "Rabais pour tes employés, traiteur pour tes réunions, achats locaux.",
    entreprise: "Une autre entreprise du quartier : dîners complices, activités d'équipe communes.",
  },
  organisme: {
    commerce: "Un commerce peut t'offrir un lieu, du matériel ou une commandite pour tes activités.",
    entreprise: "Une entreprise peut t'envoyer des bénévoles ou commanditer une activité.",
    organisme: "Un organisme d'un autre domaine : mettre vos forces ensemble pour une activité.",
  },
};

const activity = (a: DirectoryActor) =>
  [a.activities ? `${a.activities} activité${a.activities > 1 ? "s" : ""}` : "", a.complices ? `${a.complices} complice${a.complices > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");

export function businessDashboard(me: UserRow) {
  const db = getDb();
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const count = (sql: string, ...args: unknown[]) => (db.prepare(sql).get(...args) as { n: number }).n;

  const stats = {
    publicationsWeek: count(`SELECT COUNT(*) AS n FROM ideas WHERE organizer_id = ? AND created_at > ?`, me.id, since),
    publicationsTotal: count(`SELECT COUNT(*) AS n FROM ideas WHERE organizer_id = ?`, me.id),
    complicesWeek: count(`SELECT COUNT(*) AS n FROM complices c JOIN ideas i ON i.id = c.idea_id WHERE i.organizer_id = ? AND c.created_at > ?`, me.id, since),
    complicesTotal: count(`SELECT COUNT(*) AS n FROM complices c JOIN ideas i ON i.id = c.idea_id WHERE i.organizer_id = ?`, me.id),
    pendingInvitations: countPendingInvitations(me.id),
    messagesWeek: countContactsSince(me.id, since),
    unreadMessages: listContacts(me.id).unread,
  };

  const recent = (db.prepare(
    `SELECT id, title, kind, post_type, starts_at, created_at FROM ideas WHERE organizer_id = ? ORDER BY created_at DESC LIMIT 6`,
  ).all(me.id) as { id: string; title: string; kind: string | null; post_type: string | null; starts_at: string | null; created_at: string }[])
    .map((r) => ({ id: r.id, title: r.title, space: r.kind === "entreprise" ? "entreprise" : "activite", postType: r.post_type, startsAt: r.starts_at, createdAt: r.created_at }));

  const others = listActors().filter((a) => a.id !== me.id);
  // Dans ton secteur : même secteur ; sans secteur, même type d'acteur.
  const sameSector = others
    .filter((a) => (me.sector ? a.sector === me.sector : a.accountType === me.account_type))
    .sort((a, b) => b.activities + b.posts - (a.activities + a.posts))
    .slice(0, 6);
  const taken = new Set(sameSector.map((a) => a.id));
  // Complices possibles : types complémentaires d'abord, puis les plus actifs.
  const score = (a: DirectoryActor) => (a.accountType !== me.account_type ? 5 : 0) + a.activities * 2 + a.complices + a.posts;
  const possibles: Suggestion[] = others
    .filter((a) => !taken.has(a.id))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 6)
    .map((a) => ({ ...a, reason: [WHY[me.account_type]?.[a.accountType] ?? "Un acteur du quartier avec qui faire équipe.", activity(a)].filter(Boolean).join(" ") }));

  return { stats, recent, sameSector, possibles };
}
