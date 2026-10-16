import type Database from "better-sqlite3";

export function prepareSdc(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sdc_imports (
      sha TEXT PRIMARY KEY, source_name TEXT NOT NULL, sheet TEXT NOT NULL,
      imported_at TEXT NOT NULL, row_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sdc_members (
      id TEXT PRIMARY KEY, source_sha TEXT NOT NULL REFERENCES sdc_imports(sha), source_row INTEGER NOT NULL,
      name TEXT NOT NULL, street TEXT NOT NULL, activity TEXT NOT NULL, nonprofit INTEGER NOT NULL,
      is_vacant INTEGER NOT NULL CHECK(is_vacant IN (0,1)),
      address TEXT, lat REAL, lng REAL,
      location_status TEXT NOT NULL DEFAULT 'unverified' CHECK(location_status IN ('verified','unverified')),
      google_maps_url TEXT, checked_at TEXT,
      UNIQUE(source_sha, source_row),
      CHECK(location_status = 'unverified' OR (address IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_sdc_members_source ON sdc_members(source_sha, is_vacant);
  `);
  const columns = new Set((db.prepare("PRAGMA table_info(vacancies)").all() as { name: string }[]).map((c) => c.name));
  if (!columns.has("source_member_id")) db.exec("ALTER TABLE vacancies ADD COLUMN source_member_id TEXT REFERENCES sdc_members(id)");
  if (!columns.has("location_status")) db.exec("ALTER TABLE vacancies ADD COLUMN location_status TEXT NOT NULL DEFAULT 'verified'");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_vacancy_source_member ON vacancies(source_member_id)");
}
