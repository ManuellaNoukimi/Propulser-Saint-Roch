import type Database from "better-sqlite3";
import { prepareSdc } from "./sdc-schema";

/** Migration additive : ne change pas la version 2 ni les données déjà présentes. */
export function prepareVacancies(db: Database.Database) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS vacancies (
        id TEXT PRIMARY KEY, label TEXT NOT NULL, street TEXT NOT NULL,
        lat REAL NOT NULL, lng REAL NOT NULL, surface TEXT NOT NULL, details TEXT NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 1 CHECK(is_demo IN (0,1))
      );
      CREATE TABLE IF NOT EXISTS vacancy_votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vacancy_id TEXT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
        wish TEXT NOT NULL CHECK(wish IN ('epicerie','boucherie','boulangerie','fruiterie','cafe','resto','pharmacie','librairie','quincaillerie','autre')),
        frequency INTEGER NOT NULL CHECK(frequency IN (0,1,2,3)),
        vote_day TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(user_id, vacancy_id)
      );
      CREATE INDEX IF NOT EXISTS idx_vacancy_votes_day ON vacancy_votes(user_id, vote_day);
      CREATE INDEX IF NOT EXISTS idx_vacancy_votes_local ON vacancy_votes(vacancy_id, wish);
      CREATE TABLE IF NOT EXISTS vacancy_bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vacancy_id TEXT NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
        project TEXT NOT NULL CHECK(project IN ('expo','boutique','atelier','etudiant','autre')),
        title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 80),
        weeks INTEGER NOT NULL CHECK(weeks BETWEEN 1 AND 4),
        starts_on TEXT NOT NULL, ends_on TEXT NOT NULL CHECK(ends_on > starts_on),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed')),
        created_at TEXT NOT NULL, confirmed_at TEXT,
        confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        idea_id TEXT UNIQUE REFERENCES ideas(id) ON DELETE SET NULL,
        CHECK((status = 'pending' AND confirmed_at IS NULL) OR (status = 'confirmed' AND confirmed_at IS NOT NULL))
      );
      CREATE INDEX IF NOT EXISTS idx_vacancy_bookings_dates ON vacancy_bookings(vacancy_id, status, starts_on, ends_on);
      CREATE INDEX IF NOT EXISTS idx_vacancy_bookings_user ON vacancy_bookings(user_id, created_at);
    `);
    prepareSdc(db);
    const insert = db.prepare(`INSERT OR IGNORE INTO vacancies (id,label,street,lat,lng,surface,details) VALUES (?,?,?,?,?,?,?)`);
    // Même inventaire fictif que la carte ; aucun faux vote ni réservation confirmée n'est créé.
    const examples = [
      ["v1", "Local vide n° 1", "rue Saint-Joseph Est", 46.81391, -71.22548, "Petit local, environ 60 m²", "Ancienne boutique avec grande vitrine."],
      ["v2", "Local vide n° 2", "rue Saint-Joseph Est", 46.81508, -71.222, "Local moyen, environ 120 m²", "Rez-de-chaussée lumineux avec arrière-boutique."],
      ["v3", "Local vide n° 3", "rue Saint-Joseph Est", 46.81603, -71.21899, "Grand local, environ 200 m²", "Ancien restaurant, cuisine sur place."],
      ["v4", "Local vide n° 4", "rue Saint-Joseph Est", 46.81272, -71.2292, "Petit local, environ 45 m²", "Vitrine d'angle très visible."],
      ["v5", "Local vide n° 5", "rue du Pont", 46.8164, -71.22146, "Local moyen, environ 90 m²", "Près de l'intersection avec Saint-Joseph."],
    ];
    for (const row of examples) insert.run(...row);
  })();
}
