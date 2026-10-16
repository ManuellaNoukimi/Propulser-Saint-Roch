import type Database from "better-sqlite3";

const needsTable = (name: string) => `CREATE TABLE ${name} (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, label TEXT NOT NULL, custom_key TEXT NOT NULL DEFAULT '',
  zone_lat REAL NOT NULL CHECK(zone_lat BETWEEN -90 AND 90), zone_lng REAL NOT NULL CHECK(zone_lng BETWEEN -180 AND 180),
  zone_radius INTEGER NOT NULL DEFAULT 300 CHECK(zone_radius BETWEEN 100 AND 1000 AND zone_radius % 50 = 0),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL,
  UNIQUE(category,custom_key,zone_lat,zone_lng,zone_radius)
)`;

export function prepareResidentNeeds(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(resident_needs)").all() as { name: string }[];
  if (columns.length && !columns.some((column) => column.name === "zone_lat")) {
    // Retire la contrainte d'unicité par secteur en conservant ids, soutiens et compteurs.
    // Les clés étrangères sont réactivées après la reconstruction atomique de cette seule table.
    db.pragma("foreign_keys = OFF");
    try {
      db.transaction(() => {
        const current = db.prepare("PRAGMA table_info(resident_needs)").all() as { name: string }[];
        if (current.some((column) => column.name === "zone_lat")) return;
        db.exec(needsTable("resident_needs_zones"));
        db.exec(`INSERT INTO resident_needs_zones(id,category,label,custom_key,zone_lat,zone_lng,zone_radius,created_by,created_at)
          SELECT id,category,label,custom_key,
            CASE sector WHEN 'ouest' THEN 46.813 WHEN 'est' THEN 46.816 ELSE 46.815 END,
            CASE sector WHEN 'ouest' THEN -71.228 WHEN 'est' THEN -71.221 ELSE -71.224 END,
            300,created_by,created_at FROM resident_needs;
          DROP TABLE resident_needs;
          ALTER TABLE resident_needs_zones RENAME TO resident_needs;`);
        if ((db.pragma("foreign_key_check") as unknown[]).length) throw new Error("La migration des zones ne préserve pas les références existantes.");
      }).immediate();
    } finally { db.pragma("foreign_keys = ON"); }
  } else if (!columns.length) db.exec(needsTable("IF NOT EXISTS resident_needs"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS resident_need_supports (
      need_id TEXT NOT NULL REFERENCES resident_needs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      frequency INTEGER NOT NULL CHECK(frequency IN (0,1,2,3)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(need_id,user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_resident_support_user ON resident_need_supports(user_id);
    CREATE TABLE IF NOT EXISTS resident_need_activity (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resident_activity_day ON resident_need_activity(user_id,day);
  `);
}
