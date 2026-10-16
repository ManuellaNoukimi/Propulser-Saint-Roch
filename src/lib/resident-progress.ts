import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb, getUserRow } from "./db";

import { VacancyError } from "./vacancies";
import {
  awardResidentPoints,
  isResidentAccount,
  syncResidentBadges,
  residentPointSummary,
} from "./resident-points";
import {
  RESIDENT_BADGES,
  RESIDENT_DAILY_POINTS_LIMIT,
  RESIDENT_POINT_RULES,
  progressDay,
  residentLevel,
  type ResidentPointAction,
} from "./resident-progress-options";

export function requireResident(userId: string) {
  const user = getUserRow(userId);
  if (!user || !isResidentAccount(user.account_type))
    throw new VacancyError(
      403,
      "residents_only",
      "Cet espace est réservé aux comptes résidents.",
    );
  return user;
}
const scoreFor = (userId: string) =>
  (
    getDb()
      .prepare(
        "SELECT COALESCE(SUM(points),0) AS score FROM points WHERE user_id=?",
      )
      .get(userId) as { score: number }
  ).score;
export function getResidentProgress(userId: string) {
  requireResident(userId);
  const db = getDb();
  syncResidentBadges(db, userId);
  db.prepare(
    "INSERT OR IGNORE INTO resident_referral_codes(user_id,code) VALUES(?,?)",
  ).run(userId, randomBytes(8).toString("hex").toUpperCase());
  const score = scoreFor(userId);
  const { total } = db
    .prepare(
      "SELECT COALESCE(SUM(points),0) AS total FROM points WHERE user_id=? AND day=?",
    )
    .get(userId, progressDay()) as { total: number };
  const earned = new Set(
    (
      db
        .prepare("SELECT badge_id FROM resident_badges WHERE user_id=?")
        .all(userId) as { badge_id: string }[]
    ).map((row) => row.badge_id),
  );
  const history = db
    .prepare(
      "SELECT id,action,points,created_at AS createdAt FROM points WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50",
    )
    .all(userId) as {
    id: string;
    action: ResidentPointAction;
    points: number;
    createdAt: string;
  }[];
  const activities = db
    .prepare(
      "SELECT id,title,place,starts_at AS startsAt FROM ideas WHERE starts_at IS NOT NULL ORDER BY created_at DESC LIMIT 20",
    )
    .all() as { id: string; title: string; place: string; startsAt: string }[];
  const helpToConfirm = db
    .prepare(
      `SELECT c.id,c.contribution,i.title,u.display_name AS displayName FROM complices c JOIN ideas i ON i.id=c.idea_id
    JOIN users u ON u.id=c.user_id LEFT JOIN resident_help_confirmations h ON h.complice_id=c.id
    WHERE i.organizer_id=? AND c.user_id<>? AND c.contribution<>'participer' AND u.account_type='habitant' AND h.complice_id IS NULL ORDER BY c.created_at DESC LIMIT 30`,
    )
    .all(userId, userId) as {
    id: string;
    contribution: string;
    title: string;
    displayName: string;
  }[];
  const referralCode = (
    db
      .prepare("SELECT code FROM resident_referral_codes WHERE user_id=?")
      .get(userId) as { code: string }
  ).code;
  const settings = db
    .prepare(
      "SELECT public_profile FROM resident_progress_settings WHERE user_id=?",
    )
    .get(userId) as { public_profile: number } | undefined;
  const card = db
    .prepare(
      "SELECT code,created_at AS createdAt FROM resident_reward_cards WHERE user_id=? AND offer_id='demo-100'",
    )
    .get(userId) as { code: string; createdAt: string } | undefined;
  return {
    score,
    ...residentLevel(score),
    today: total,
    dailyLimit: RESIDENT_DAILY_POINTS_LIMIT,
    badges: RESIDENT_BADGES.map((badge) => ({
      ...badge,
      earned: earned.has(badge.id),
    })),
    history: history.map((entry) => ({
      ...entry,
      label: RESIDENT_POINT_RULES[entry.action].label,
    })),
    publicProfile: Boolean(settings?.public_profile),
    referralCode,
    activities,
    helpToConfirm,
    reward: {
      threshold: 100,
      discount: 10,
      simulated: true as const,
      available: score >= 100,
      card: card ?? null,
    },
  };
}
export const progressSettingsSchema = z
  .object({ publicProfile: z.boolean() })
  .strict();
export function updateResidentProgressSettings(userId: string, input: unknown) {
  requireResident(userId);
  const data = progressSettingsSchema.parse(input);
  getDb()
    .prepare(
      "INSERT INTO resident_progress_settings(user_id,public_profile) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET public_profile=excluded.public_profile",
    )
    .run(userId, Number(data.publicProfile));
  return { publicProfile: data.publicProfile };
}
export function publicResidentProgress(userId: string) {
  const user = getUserRow(userId);
  const visible = getDb()
    .prepare(
      "SELECT 1 FROM resident_progress_settings WHERE user_id=? AND public_profile=1",
    )
    .get(userId);
  if (!user || !isResidentAccount(user.account_type) || !visible)
    throw new VacancyError(
      404,
      "profile_private",
      "Ce profil n'est pas public.",
    );
  const earned = new Set(
    (
      getDb()
        .prepare("SELECT badge_id FROM resident_badges WHERE user_id=?")
        .all(userId) as { badge_id: string }[]
    ).map((row) => row.badge_id),
  );
  return {
    level: residentLevel(scoreFor(userId)).level.label,
    badges: RESIDENT_BADGES.filter((badge) => earned.has(badge.id)),
  };
}
export function checkinActivity(userId: string, ideaId: string) {
  requireResident(userId);
  const activity = getDb()
    .prepare(
      "SELECT id,title,place FROM ideas WHERE id=? AND starts_at IS NOT NULL",
    )
    .get(ideaId) as { id: string; title: string; place: string } | undefined;
  if (!activity)
    throw new VacancyError(
      404,
      "activity_not_found",
      "Cette activité n'est plus disponible.",
    );
  return { activity, simulated: true };
}
export function checkinResident(userId: string, ideaId: string) {
  const { activity } = checkinActivity(userId, ideaId);
  const db = getDb();
  return db
    .transaction(() => {
      const place = activity.place
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const key = createHash("sha256").update(place).digest("hex");
      const day = progressDay();
      if (
        db
          .prepare(
            "SELECT 1 FROM resident_checkins WHERE user_id=? AND idea_id=?",
          )
          .get(userId, ideaId) ||
        db
          .prepare(
            "SELECT 1 FROM points WHERE user_id=? AND action='checkin' AND reference=?",
          )
          .get(userId, `activity:${ideaId}`)
      )
        throw new VacancyError(
          409,
          "already_checked_in",
          "Cette activité a déjà été enregistrée.",
        );
      if (
        db
          .prepare(
            "SELECT 1 FROM resident_checkins WHERE user_id=? AND place_key=? AND day=?",
          )
          .get(userId, key, day)
      )
        throw new VacancyError(
          409,
          "already_checked_in",
          "Un check-in est déjà enregistré pour ce lieu aujourd'hui.",
        );
      db.prepare(
        "INSERT INTO resident_checkins(user_id,place_key,day,idea_id,created_at) VALUES(?,?,?,?,?)",
      ).run(userId, key, day, ideaId, new Date().toISOString());
      return {
        points: awardResidentPoints(
          db,
          userId,
          "checkin",
          `activity:${ideaId}`,
        ),
        simulated: true,
      };
    })
    .immediate();
}
export function confirmResidentHelp(organizerId: string, compliceId: string) {
  const db = getDb();
  return db
    .transaction(() => {
      const row = db
        .prepare(
          "SELECT c.user_id,c.contribution,i.organizer_id FROM complices c JOIN ideas i ON i.id=c.idea_id WHERE c.id=?",
        )
        .get(compliceId) as
        | { user_id: string; contribution: string; organizer_id: string }
        | undefined;
      if (!row)
        throw new VacancyError(
          404,
          "help_not_found",
          "Ce coup de main n'existe plus.",
        );
      if (row.organizer_id !== organizerId || row.user_id === organizerId)
        throw new VacancyError(
          403,
          "organizer_required",
          "Seul l'organisateur peut confirmer l'aide d'une autre personne.",
        );
      if (row.contribution === "participer")
        throw new VacancyError(
          400,
          "not_help",
          "Une participation seule n'est pas un coup de main à confirmer.",
        );
      requireResident(row.user_id);
      const saved = db
        .prepare(
          "INSERT OR IGNORE INTO resident_help_confirmations(complice_id,helper_id,organizer_id,created_at) VALUES(?,?,?,?)",
        )
        .run(compliceId, row.user_id, organizerId, new Date().toISOString());
      return {
        confirmed: true,
        points: saved.changes
          ? awardResidentPoints(db, row.user_id, "help", compliceId)
          : 0,
      };
    })
    .immediate();
}
export function redeemResidentMidi(userId: string, input: unknown) {
  requireResident(userId);
  const { code } = z
    .object({ code: z.string().trim().max(80) })
    .strict()
    .parse(input);
  if (code !== (process.env.COMPLICES_MIDI_CODE || "MIDI-DEMO"))
    throw new VacancyError(
      400,
      "invalid_code",
      "Code Midi Complice incorrect.",
    );
  const db = getDb();
  return db
    .transaction(() => {
      const day = progressDay();
      if (
        db
          .prepare(
            "SELECT 1 FROM resident_midi_redemptions WHERE user_id=? AND day=?",
          )
          .get(userId, day)
      )
        throw new VacancyError(
          409,
          "already_redeemed",
          "Ton Midi Complice est déjà enregistré aujourd'hui.",
        );
      db.prepare(
        "INSERT INTO resident_midi_redemptions(user_id,day,created_at) VALUES(?,?,?)",
      ).run(userId, day, new Date().toISOString());
      return {
        points: awardResidentPoints(db, userId, "midi", day),
        simulated: true,
      };
    })
    .immediate();
}
export function claimResidentReward(userId: string) {
  requireResident(userId);
  const db = getDb();
  return db
    .transaction(() => {
      if (scoreFor(userId) < 100)
        throw new VacancyError(
          409,
          "reward_locked",
          "Atteins 100 points pour débloquer cette carte de démonstration.",
        );
      db.prepare(
        "INSERT OR IGNORE INTO resident_reward_cards(id,user_id,offer_id,code,created_at) VALUES(?,?,'demo-100',?,?)",
      ).run(
        randomUUID(),
        userId,
        `DEMO-${randomBytes(5).toString("hex").toUpperCase()}`,
        new Date().toISOString(),
      );
      return {
        card: db
          .prepare(
            "SELECT code,created_at AS createdAt FROM resident_reward_cards WHERE user_id=? AND offer_id='demo-100'",
          )
          .get(userId),
        simulated: true,
      };
    })
    .immediate();
}
export function referralInviter(code: string) {
  const row = getDb()
    .prepare(
      "SELECT c.user_id,u.account_type FROM resident_referral_codes c JOIN users u ON u.id=c.user_id WHERE c.code=?",
    )
    .get(code.trim().toUpperCase()) as
    | { user_id: string; account_type: string }
    | undefined;
  return row && isResidentAccount(row.account_type) ? row.user_id : null;
}
export function registerResidentReferral(
  newcomerId: string,
  inviterId: string,
) {
  requireResident(newcomerId);
  requireResident(inviterId);
  if (newcomerId === inviterId)
    throw new VacancyError(
      400,
      "self_referral",
      "Une personne ne peut pas s'inviter elle-même.",
    );
  const db = getDb();
  return db
    .transaction(() => {
      const inserted = db
        .prepare(
          "INSERT OR IGNORE INTO resident_referrals(newcomer_id,inviter_id,created_at) VALUES(?,?,?)",
        )
        .run(newcomerId, inviterId, new Date().toISOString());
      return inserted.changes
        ? awardResidentPoints(db, inviterId, "referral", newcomerId)
        : 0;
    })
    .immediate();
}

export function getResidentPointSummary(userId: string) {
  requireResident(userId);
  syncResidentBadges(getDb(), userId);
  return residentPointSummary(getDb(), userId);
}
