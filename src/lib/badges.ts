import "server-only";
import { getDb } from "./db";
import type { Badge, ProfileStats } from "./types";

export const BADGES: Record<Badge["id"], Badge> = {
  "super-voisin": { id: "super-voisin", emoji: "🏡", label: "Super voisin", description: "A rejoint au moins 3 initiatives" },
  "bonne-personne": { id: "bonne-personne", emoji: "💛", label: "Bonne personne", description: "A offert une aide concrète (bénévolat, matériel, lieu, commandite, expertise)" },
  batisseur: { id: "batisseur", emoji: "💡", label: "Bâtisseur", description: "A lancé au moins une idée" },
  rassembleur: { id: "rassembleur", emoji: "🔥", label: "Rassembleur", description: "Une de ses idées a réuni au moins 5 complices" },
  "premier-complice": { id: "premier-complice", emoji: "⭐", label: "Premier complice", description: "A été le premier à rejoindre une idée" },
};

export function statsFor(userId: string): ProfileStats {
  const db = getDb();
  const n = (sql: string) => (db.prepare(sql).get(userId) as { n: number }).n;
  return {
    joined: n(`SELECT COUNT(DISTINCT idea_id) AS n FROM complices WHERE user_id = ?`),
    helped: n(`SELECT COUNT(*) AS n FROM complices WHERE user_id = ? AND contribution <> 'participer'`),
    launched: n(`SELECT COUNT(*) AS n FROM ideas WHERE organizer_id = ?`),
    maxComplicesOnIdea: n(
      `SELECT COALESCE(MAX(cnt), 0) AS n FROM (
         SELECT COUNT(*) AS cnt FROM complices c JOIN ideas i ON i.id = c.idea_id WHERE i.organizer_id = ? GROUP BY i.id)`,
    ),
    firstJoins: n(
      `SELECT COUNT(*) AS n FROM complices c
       WHERE c.user_id = ? AND c.created_at = (SELECT MIN(c2.created_at) FROM complices c2 WHERE c2.idea_id = c.idea_id)`,
    ),
  };
}

export function badgesFor(userId: string): Badge[] {
  const s = statsFor(userId);
  const out: Badge[] = [];
  if (s.joined >= 3) out.push(BADGES["super-voisin"]);
  if (s.helped >= 1) out.push(BADGES["bonne-personne"]);
  if (s.launched >= 1) out.push(BADGES.batisseur);
  if (s.maxComplicesOnIdea >= 5) out.push(BADGES.rassembleur);
  if (s.firstJoins >= 1) out.push(BADGES["premier-complice"]);
  return out;
}
