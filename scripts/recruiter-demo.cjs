// Jeu de démonstration FICTIF, local et explicite. Ne copie aucun fichier privé.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
if (process.env.NODE_ENV === 'production') throw new Error('Démo réservée au développement local.');
require('./load-typescript.cjs');
const service = require('../src/lib/db.ts');
const { expressResidentNeed } = require('../src/lib/resident-needs.ts');
const password = 'Demo-Complice-2026!'; // Identifiant public de démonstration, jamais un secret réel.
const marker = '[DEMO RECRUTEUR]';
try {
  const db = service.getDb();
  const account = (email, displayName, accountType) => {
    const existing = service.findUserByEmail(email);
    if (existing && !existing.description?.startsWith(marker)) throw new Error('Identifiant de démo déjà utilisé par un autre compte. Aucune modification.');
    return existing?.id || service.insertUser({ email, password, displayName, accountType, sector: null, address: null, description: `${marker} Personne ou structure fictive.`, referralCode: undefined });
  };
  const resident = account('resident@example.test', 'Alex · démo', 'habitant');
  const organizer = account('organisme@example.test', 'Collectif du quartier · démo', 'organisme');
  account('commerce@example.test', 'Commerce local · démo', 'commerce');
  const examples = [
    ['Rencontre au jardin · démo', 'jardin-photo.jpg', 'communautaire', 'Parc des Pékans', -15],
    ['Atelier vélo entre voisins · démo', 'velo-photo.jpg', 'sport', 'Parvis de Saint-Roch', 120],
    ['Lecture partagée · démo', 'lecture-photo.jpg', 'culturel', 'Bibliothèque Gabrielle-Roy', 1440],
  ];
  let first;
  for (const [title, photo, category, place, minutes] of examples) {
    const existing = db.prepare('SELECT id FROM ideas WHERE organizer_id=? AND title=?').get(organizer, title);
    const startsAt = new Date(Date.now() + minutes * 60000).toISOString();
    let id = existing?.id;
    if (id) db.prepare('UPDATE ideas SET starts_at=? WHERE id=?').run(startsAt, id);
    else {
      const name = `${randomUUID()}.jpg`;
      fs.copyFileSync(path.join(__dirname, '../public/images/activities', photo), path.join(service.UPLOAD_DIR, name));
      id = service.insertIdea(organizer, { title, description: `${marker} Exemple fictif pour découvrir la participation. Photo illustrative de stock, crédits dans public/images/activities/CREDITS.md.`, category, place, startsAt, needs: ['participants', 'benevoles'], images: [`/api/uploads/${name}`] });
    }
    first ??= id;
  }
  if (!service.alreadyJoined(first, resident, 'participer')) service.insertComplice(first, resident, { contribution: 'participer', message: 'Participation fictive pour la démonstration.' });
  if (!db.prepare('SELECT 1 FROM resident_need_supports WHERE user_id=?').get(resident)) {
    expressResidentNeed(resident, { category: 'epicerie', frequency: 2, lat: 46.8148, lng: -71.224, radiusMeters: 300 });
  }
  console.log('Démo fictive prête. Comptes : resident@example.test, organisme@example.test, commerce@example.test.');
  console.log('Mot de passe public de démonstration : voir README.md. Aucun compte SDC créé.');
} finally {
  globalThis.__complicesDb?.close();
  delete globalThis.__complicesDb;
}
