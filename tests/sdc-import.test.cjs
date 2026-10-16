const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-sdc-import-'));
process.env.COMPLICES_DATA_DIR = temporary;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { getDb } = require('../src/lib/db.ts');
const service = require('../src/lib/vacancies.ts');
const sdc = require('../src/lib/sdc-members.ts');
const db = getDb();
// La base de démo n'a plus de comptes automatiques (retirés le 15 oct.) : on en crée un si elle est vide.
const user = db.prepare('SELECT id FROM users LIMIT 1').get()?.id ?? require('../src/lib/db.ts').insertUser({ displayName: 'Résident test', accountType: 'habitant', email: 'test-resident', password: 'x', sector: null, address: null, description: null });
process.env.COMPLICES_SDC_USER_IDS = user;
const input = {
  sha: 'a'.repeat(64), sourceName: 'fixture.xlsx', sheet: 'Membres - SDC Centre-Ville', rows: [
    { row: 2, name: 'Boutique X20', street: 'rue Saint-Joseph Est', activity: 'Boutique', nonprofit: false, vacant: false },
    { row: 29, name: 'Vacant', street: 'rue Saint-Joseph Est', activity: 'Locaux vacants', nonprofit: false, vacant: true },
    { row: 33, name: 'Vacant', street: 'rue Saint-Joseph Est', activity: 'Locaux vacants (À louer)', nonprofit: false, vacant: true },
  ], locations: [{ row: 2, expectedName: 'Boutique X20', address: '200 rue Saint-Joseph Est, Québec', lat: 46.8131137, lng: -71.2283755,
    googleMapsUrl: 'https://www.google.com/maps/place/Boutique+X20', checkedAt: new Date().toISOString() }],
};
after(() => { globalThis.__complicesDb?.close(); delete globalThis.__complicesDb; fs.rmSync(temporary, { recursive: true, force: true }); });
test('import preserves existing records and distinguishes anonymous vacant source rows', () => {
  service.recordVacancyVote(user, 'v1', { wish: 'cafe', frequency: 1 });
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const ideas = db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n;
  assert.deepEqual(sdc.importSdcSnapshot(input), { rows: 3, vacancies: 2, added: 3, verified: 1 });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, users);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n, ideas);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM vacancy_votes WHERE vacancy_id=?').get('v1').n, 1);
  const locals = service.listVacancies(user);
  assert.equal(locals.length, 2);
  assert.equal(new Set(locals.map((v) => v.id)).size, 2);
  for (const local of locals) { assert.equal(local.isDemo, false); assert.equal(local.lat, null); assert.equal(local.lng, null); assert.equal(local.locationStatus, 'unverified'); }
  assert.equal(sdc.listSdcMembers().members[0].lat, 46.8131137);
  assert.throws(() => service.recordVacancyVote(user, 'v2', { wish: 'cafe', frequency: 1 }), (error) => error.code === 'vacancy_not_found');
});
test('reimport is idempotent and retains votes and reservations; unknown locations block final confirmation', () => {
  const local = service.listVacancies()[0];
  service.recordVacancyVote(user, local.id, { wish: 'epicerie', frequency: 2 });
  const booking = service.requestVacancyBooking(user, local.id, { project: 'expo', title: 'Test SDC', startsOn: service.quebecDay(new Date(Date.now() + 10 * 86400000)), weeks: 2 });
  const ideas = db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n;
  assert.throws(() => service.confirmVacancyBooking(user, booking.id), (error) => error.code === 'location_unverified');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n, ideas);
  assert.equal(sdc.importSdcSnapshot(input).added, 0);
  assert.equal(service.listVacancies(user)[0].myVote.wish, 'epicerie');
  assert.equal(service.listMyVacancyBookings(user)[0].id, booking.id);
  assert.equal(service.listVacancies()[0].bookings.length, 0);
  assert.equal(db.pragma('foreign_key_check').length, 0);
});
test('location provenance must match source name, local boundary and safe Google Maps URL', () => {
  for (const bad of [{ expectedName: 'Autre commerce' }, { lat: 0, lng: 0 }, { googleMapsUrl: 'https://example.com/fake' }]) {
    assert.throws(() => sdc.importSdcSnapshot({ ...input, locations: [{ ...input.locations[0], ...bad }] }));
  }
  assert.throws(() => sdc.importSdcSnapshot({ ...input, rows: [...input.rows, input.rows[0]] }));
  assert.throws(() => sdc.importSdcSnapshot({ ...input, rows: [{ ...input.rows[0], vacant: true }] }));
  assert.equal(sdc.activeSdcSnapshot(), input.sha);
});
