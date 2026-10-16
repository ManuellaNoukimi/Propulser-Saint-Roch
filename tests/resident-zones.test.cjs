const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const Database = require('better-sqlite3');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-free-zones-'));
process.env.COMPLICES_DATA_DIR = directory;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { getDb } = require('../src/lib/db.ts');
const service = require('../src/lib/resident-needs.ts');
const { residentZonesOverlap } = require('../src/lib/resident-need-options.ts');
const { prepareResidentNeeds } = require('../src/lib/resident-needs-schema.ts');
const db = getDb();
const user = db.prepare('SELECT id FROM users LIMIT 1').get().id;
after(() => { globalThis.__complicesDb?.close(); delete globalThis.__complicesDb; fs.rmSync(directory, { recursive: true, force: true }); });

test('free centers in the same former sector remain distinct and radius is respected', () => {
  const first = service.expressResidentNeed(user, { category: 'cafe', frequency: 1, lat: 46.8132, lng: -71.2283, radiusMeters: 100 });
  const moved = service.expressResidentNeed(user, { category: 'cafe', frequency: 1, lat: 46.814, lng: -71.2275, radiusMeters: 100 });
  const widened = service.expressResidentNeed(user, { category: 'cafe', frequency: 2, lat: 46.8132, lng: -71.2283, radiusMeters: 500 });
  assert.equal(new Set([first.id, moved.id, widened.id]).size, 3);
  const duplicate = service.expressResidentNeed(user, { category: 'cafe', frequency: 3, lat: 46.81321, lng: -71.22831, radiusMeters: 100 });
  assert.equal(duplicate.id, first.id); assert.equal(duplicate.created, false);
  const listed = service.listResidentNeeds(user);
  assert.equal(listed.find((need) => need.id === widened.id).zone.radiusMeters, 500);
  assert.equal('sector' in listed[0], false);
  for (const radiusMeters of [0, 99, 125, 1001, 100.5]) assert.equal(service.residentNeedSchema.safeParse({ category: 'cafe', frequency: 1, lat: 46.8132, lng: -71.2283, radiusMeters }).success, false);
  assert.equal(residentZonesOverlap({ lat: 46.813, lng: -71.228, radiusMeters: 100 }, { lat: 46.816, lng: -71.22, radiusMeters: 100 }), false);
});
function legacyDb() {
  const old = new Database(':memory:');
  old.pragma('foreign_keys=ON');
  old.exec(`CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('owner');
    CREATE TABLE resident_needs(id TEXT PRIMARY KEY,category TEXT NOT NULL,label TEXT NOT NULL,custom_key TEXT NOT NULL DEFAULT '',sector TEXT NOT NULL CHECK(sector IN ('ouest','centre','est')),created_by TEXT REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL,UNIQUE(category,custom_key,sector));
    CREATE TABLE resident_need_supports(need_id TEXT REFERENCES resident_needs(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id),frequency INTEGER,created_at TEXT,updated_at TEXT,PRIMARY KEY(need_id,user_id));
    CREATE TABLE resident_need_activity(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),day TEXT,created_at TEXT);
    INSERT INTO resident_needs VALUES('old','cafe','Café','','centre','owner','2026-10-15');
    INSERT INTO resident_need_supports VALUES('old','owner',2,'2026-10-15','2026-10-15');
    INSERT INTO resident_need_activity VALUES('action','owner','2026-10-15','2026-10-15');`);
  return old;
}
test('legacy sector migration keeps IDs, supports and quotas and removes the old restriction', () => {
  const old = legacyDb();
  prepareResidentNeeds(old);
  assert.equal(old.prepare('SELECT zone_radius FROM resident_needs WHERE id=?').get('old').zone_radius, 300);
  assert.equal(old.prepare('SELECT frequency FROM resident_need_supports WHERE need_id=?').get('old').frequency, 2);
  assert.equal(old.prepare('SELECT COUNT(*) AS n FROM resident_need_activity').get().n, 1);
  assert.equal(old.pragma('foreign_keys', { simple: true }), 1);
  assert.deepEqual(old.pragma('foreign_key_check'), []);
  old.prepare('INSERT INTO resident_needs(id,category,label,custom_key,zone_lat,zone_lng,zone_radius,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('new','cafe','Café','',46.814,-71.224,100,'owner','2026-10-15');
  prepareResidentNeeds(old);
  assert.equal(old.prepare('SELECT COUNT(*) AS n FROM resident_needs').get().n, 2);
  old.close();
});
test('failed migration rolls back and always restores foreign-key enforcement', () => {
  const old = legacyDb();
  old.pragma('foreign_keys=OFF');
  old.exec("UPDATE resident_needs SET created_by='missing'");
  old.pragma('foreign_keys=ON');
  assert.throws(() => prepareResidentNeeds(old), /références/);
  assert.equal(old.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(old.prepare('SELECT sector FROM resident_needs WHERE id=?').get('old').sector, 'centre');
  assert.equal(old.prepare('SELECT frequency FROM resident_need_supports').get().frequency, 2);
  old.close();
});
