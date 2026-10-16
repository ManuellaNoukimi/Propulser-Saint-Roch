import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import {
  isResidentAccount,
  RESIDENT_DAILY_POINTS_LIMIT,
  RESIDENT_POINT_RULES,
  progressDay,
  residentLevel,
  type ResidentPointAction,
} from "./resident-progress-options";

export { isResidentAccount } from "./resident-progress-options";

/** Persist badges at the action, so removing an expired initiative never removes recognition. */
export function syncResidentBadges(db: Database.Database, userId: string) {
  const user = db
    .prepare("SELECT account_type FROM users WHERE id=?")
    .get(userId) as { account_type: string } | undefined;
  if (!user || !isResidentAccount(user.account_type)) return;
  const count = (sql: string) =>
    (db.prepare(sql).get(userId) as { n: number }).n;
  const badges: string[] = [];
  if (count("SELECT COUNT(*) AS n FROM ideas WHERE organizer_id=?"))
    badges.push("batisseur");
  if (
    count(
      "SELECT COUNT(DISTINCT c.idea_id) AS n FROM complices c JOIN ideas i ON i.id=c.idea_id WHERE c.user_id=? AND i.organizer_id<>c.user_id",
    ) >= 3
  )
    badges.push("super-voisin");
  if (
    count(
      "SELECT COUNT(*) AS n FROM complices c JOIN ideas i ON i.id=c.idea_id WHERE c.user_id=? AND c.contribution<>'participer' AND i.organizer_id<>c.user_id",
    )
  )
    badges.push("bonne-personne");
  if (
    count(
      "SELECT COUNT(*) AS n FROM complices c JOIN ideas i ON i.id=c.idea_id WHERE c.user_id=? AND i.organizer_id<>c.user_id AND NOT EXISTS(SELECT 1 FROM complices earlier WHERE earlier.idea_id=c.idea_id AND earlier.user_id<>i.organizer_id AND (earlier.created_at<c.created_at OR (earlier.created_at=c.created_at AND earlier.rowid<c.rowid)))",
    )
  )
    badges.push("premier-complice");
  if (
    count(
      "SELECT COUNT(*) AS n FROM (SELECT i.id FROM ideas i JOIN complices c ON c.idea_id=i.id WHERE i.organizer_id=? AND c.user_id<>i.organizer_id GROUP BY i.id HAVING COUNT(DISTINCT c.user_id)>=5)",
    )
  )
    badges.push("rassembleur");
  if (
    count(
      "SELECT COUNT(*) AS n FROM points WHERE user_id=? AND action IN('vote','booking')",
    ) >= 3
  )
    badges.push("ami-vitrines");
  const save = db.prepare(
    "INSERT OR IGNORE INTO resident_badges(user_id,badge_id,awarded_at) VALUES(?,?,?)",
  );
  for (const badge of badges) save.run(userId, badge, new Date().toISOString());
}

export function residentPointSummary(db: Database.Database, userId: string) {
  const { score } = db
    .prepare(
      "SELECT COALESCE(SUM(points),0) AS score FROM points WHERE user_id=?",
    )
    .get(userId) as { score: number };
  const badges = (
    db
      .prepare(
        "SELECT badge_id FROM resident_badges WHERE user_id=? ORDER BY badge_id",
      )
      .all(userId) as { badge_id: string }[]
  ).map((row) => row.badge_id);
  return { score, ...residentLevel(score), badges };
}

/** Server-owned scale and idempotency key; callers never choose the amount. */
export function awardPoints(
  db: Database.Database,
  userId: string,
  action: ResidentPointAction,
  reference: string,
) {
  if (!Object.hasOwn(RESIDENT_POINT_RULES, action))
    throw new Error("Action de points inconnue.");
  if (!reference.trim() || reference.length > 512)
    throw new Error("Référence de points invalide.");
  return db
    .transaction(() => {
      const before = residentPointSummary(db, userId);
      const result = (points: number, eligible: boolean) => {
        const after = residentPointSummary(db, userId);
        return {
          points,
          eligible,
          ...after,
          newBadges: after.badges.filter((id) => !before.badges.includes(id)),
          levelChanged: before.level.id !== after.level.id,
        };
      };
      const user = db
        .prepare("SELECT account_type FROM users WHERE id=?")
        .get(userId) as { account_type: string } | undefined;
      if (!user || !isResidentAccount(user.account_type))
        return result(0, false);
      if (
        db
          .prepare(
            "SELECT 1 FROM points WHERE user_id=? AND action=? AND reference=?",
          )
          .get(userId, action, reference)
      )
        return result(0, true);
      const day = progressDay();
      const { total, votes } = db
        .prepare(
          "SELECT COALESCE(SUM(points),0) AS total,COALESCE(SUM(CASE WHEN action='vote' THEN points ELSE 0 END),0) AS votes FROM points WHERE user_id=? AND day=?",
        )
        .get(userId, day) as { total: number; votes: number };
      const points = Math.max(
        0,
        Math.min(
          RESIDENT_POINT_RULES[action].points,
          RESIDENT_DAILY_POINTS_LIMIT - total,
          action === "vote" ? 15 - votes : Infinity,
        ),
      );
      db.prepare(
        "INSERT INTO points(id,user_id,action,reference,points,day,created_at) VALUES(?,?,?,?,?,?,?)",
      ).run(
        randomUUID(),
        userId,
        action,
        reference,
        points,
        day,
        new Date().toISOString(),
      );
      const badge =
        action === "idea"
          ? "batisseur-idees"
          : action === "help"
            ? "coup-main"
            : null;
      if (badge)
        db.prepare(
          "INSERT OR IGNORE INTO resident_badges(user_id,badge_id,awarded_at) VALUES(?,?,?)",
        ).run(userId, badge, new Date().toISOString());
      syncResidentBadges(db, userId);
      return result(points, true);
    })
    .immediate();
}

/** Compatibility for existing F4 endpoints returning a numerical gain. */
export function awardResidentPoints(
  db: Database.Database,
  userId: string,
  action: ResidentPointAction,
  reference: string,
) {
  return awardPoints(db, userId, action, reference).points;
}
