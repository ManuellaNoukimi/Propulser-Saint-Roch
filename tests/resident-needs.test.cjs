const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-resident-needs-'));
process.env.COMPLICES_DATA_DIR = directory;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { getDb } = require('../src/lib/db.ts');
const service = require('../src/lib/resident-needs.ts');
const { approximateResidentPoint } = require('../src/lib/resident-need-options.ts');
const db = getDb();
for (const id of ['resident-a', 'resident-b', 'resident-c', 'resident-quota']) {
  db.prepare('INSERT INTO users(id,email,password_hash,display_name,account_type,created_at) VALUES(?,?,?,?,?,?)').run(id, id, 'unused', id, 'habitant', new Date().toISOString());
}
const input = (extra = {}) => ({ category: 'epicerie', frequency: 2, lat: 46.8148, lng: -71.224, ...extra });
const code = (value) => (error) => error.code === value;
after(() => { globalThis.__complicesDb?.close(); delete globalThis.__complicesDb; fs.rmSync(directory, { recursive: true, force: true }); });

test('validates categories, frequencies, ownership fields and actual Saint-Roch boundary', () => {
  for (const value of [input({ category: 'inconnu' }), input({ frequency: 1.5 }), input({ frequency: 4 }), input({ userId: 'resident-b' }), input({ category: 'autre', label: '' })]) {
    assert.equal(service.residentNeedSchema.safeParse(value).success, false);
  }
  assert.throws(() => service.expressResidentNeed('resident-a', input({ lat: 0, lng: 0 })), code('outside_neighborhood'));
  for (const sector of [{ lat: 46.8132, lng: -71.2283 }, { lat: 46.8148, lng: -71.224 }, { lat: 46.8162, lng: -71.2208 }]) {
    const need = service.expressResidentNeed('resident-c', input({ category: 'clinique', lat: sector.lat, lng: sector.lng }));
    assert.deepEqual(service.listResidentNeeds(null).find((item) => item.id === need.id).zone, { ...approximateResidentPoint(sector.lat, sector.lng), radiusMeters: 300 });
  }
});
test('groups nearby requests, supports once per account, and publishes no individual identity or coordinates', () => {
  const first = service.expressResidentNeed('resident-a', input());
  const second = service.expressResidentNeed('resident-b', input({ lat: 46.81481, frequency: 3 }));
  assert.equal(second.id, first.id); assert.equal(second.created, false);
  service.supportResidentNeed('resident-a', first.id, { frequency: 0 });
  const publicNeed = service.listResidentNeeds(null).find((item) => item.id === first.id);
  assert.equal(publicNeed.supporters, 2); assert.equal(publicNeed.visitsPerWeek, 3); assert.equal(publicNeed.mySupport, null);
  assert.equal('userId' in publicNeed, false); assert.equal('createdBy' in publicNeed, false); assert.equal('lat' in publicNeed, false);
  assert.equal(service.listResidentNeeds('resident-a').find((item) => item.id === first.id).mySupport.frequency, 0);
  assert.equal(service.residentSupportsRemaining('resident-a'), 2);
  assert.equal(publicNeed.zone.lat, 46.815); assert.equal(publicNeed.zone.lng, -71.224); assert.equal(publicNeed.zone.radiusMeters, 300);
});
test('withdrawing affects only the signed-in account, retains neighbors and removes empty needs', () => {
  const first = service.listResidentNeeds('resident-a').find((item) => item.mySupport);
  service.withdrawResidentSupport('resident-c', first.id);
  assert.equal(service.listResidentNeeds(null).find((item) => item.id === first.id).supporters, 2);
  service.withdrawResidentSupport('resident-a', first.id);
  assert.equal(service.listResidentNeeds('resident-a').find((item) => item.id === first.id).mySupport, null);
  assert.equal(service.listResidentNeeds(null).find((item) => item.id === first.id).supporters, 1);
  service.withdrawResidentSupport('resident-b', first.id);
  assert.equal(service.listResidentNeeds(null).some((item) => item.id === first.id), false);
});
test('daily cap rolls back new needs, permits edits, and is not bypassed by withdrawing', () => {
  const ids = ['cafe', 'gym', 'pharmacie'].map((category) => service.expressResidentNeed('resident-quota', input({ category })).id);
  const before = db.prepare('SELECT COUNT(*) AS n FROM resident_needs').get().n;
  assert.throws(() => service.expressResidentNeed('resident-quota', input({ category: 'librairie' })), code('daily_support_limit'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM resident_needs').get().n, before);
  service.supportResidentNeed('resident-quota', ids[0], { frequency: 3 });
  service.withdrawResidentSupport('resident-quota', ids[0]);
  assert.equal(service.residentSupportsRemaining('resident-quota'), 0);
  assert.throws(() => service.expressResidentNeed('resident-quota', input({ category: 'librairie' })), code('daily_support_limit'));
  db.prepare('UPDATE resident_need_activity SET day=? WHERE user_id=?').run('2000-01-01', 'resident-quota');
  assert.equal(service.residentSupportsRemaining('resident-quota'), 3);
});
test('custom service labels merge with normalized accents while migrations preserve the data', () => {
  const first = service.expressResidentNeed('resident-a', input({ category: 'autre', label: 'Réparation de vélos' }));
  const second = service.expressResidentNeed('resident-b', input({ category: 'autre', label: '  reparation   de velos  ' }));
  assert.equal(first.id, second.id);
  const before = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  require('../src/lib/resident-needs-schema.ts').prepareResidentNeeds(db);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, before);
  assert.equal(service.listResidentNeeds(null).find((item) => item.id === first.id).supporters, 2);
  assert.equal(db.pragma('foreign_key_check').length, 0);
  db.close(); delete globalThis.__complicesDb;
  assert.equal(service.listResidentNeeds(null).find((item) => item.id === first.id).supporters, 2);
});
