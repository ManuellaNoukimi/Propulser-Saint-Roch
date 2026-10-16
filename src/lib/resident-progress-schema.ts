import type Database from "better-sqlite3";

export function prepareResidentProgress(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS points (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK(action IN ('checkin','help','idea','join','vote','midi','booking','referral')),
      reference TEXT NOT NULL,points INTEGER NOT NULL CHECK(points>=0),day TEXT NOT NULL,created_at TEXT NOT NULL,
      UNIQUE(user_id,action,reference)
    );
    CREATE INDEX IF NOT EXISTS idx_points_user ON points(user_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_points_day ON points(user_id,day);
    CREATE TABLE IF NOT EXISTS resident_badges (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,badge_id TEXT NOT NULL,awarded_at TEXT NOT NULL,
      PRIMARY KEY(user_id,badge_id)
    );
    CREATE TABLE IF NOT EXISTS resident_progress_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,public_profile INTEGER NOT NULL DEFAULT 0 CHECK(public_profile IN(0,1))
    );
    CREATE TABLE IF NOT EXISTS resident_checkins (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,place_key TEXT NOT NULL,day TEXT NOT NULL,
      idea_id TEXT REFERENCES ideas(id) ON DELETE SET NULL,created_at TEXT NOT NULL,
      PRIMARY KEY(user_id,place_key,day)
    );
    CREATE TABLE IF NOT EXISTS resident_help_confirmations (
      complice_id TEXT PRIMARY KEY,helper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resident_referral_codes (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS resident_referrals (
      newcomer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TEXT NOT NULL,
      CHECK(newcomer_id<>inviter_id)
    );
    CREATE TABLE IF NOT EXISTS resident_midi_redemptions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,day TEXT NOT NULL,created_at TEXT NOT NULL,
      PRIMARY KEY(user_id,day)
    );
    CREATE TABLE IF NOT EXISTS resident_reward_cards (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offer_id TEXT NOT NULL,code TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,UNIQUE(user_id,offer_id)
    );
  `);
}
