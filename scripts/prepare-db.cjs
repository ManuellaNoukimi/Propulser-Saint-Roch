require('./load-typescript.cjs');
const { getDb, DATA_DIR } = require('../src/lib/db.ts');
try {
  const db = getDb();
  if (db.pragma('foreign_key_check').length) throw new Error('Intégrité référentielle invalide');
  console.log(`Schéma prêt : ${DATA_DIR}. Aucun serveur SQL externe nécessaire.`);
} finally {
  globalThis.__complicesDb?.close();
  delete globalThis.__complicesDb;
}
