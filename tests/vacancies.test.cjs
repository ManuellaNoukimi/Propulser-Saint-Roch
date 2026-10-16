const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual SQLite service, never the developer's database.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-f4-'));
process.env.COMPLICES_DATA_DIR = temporary;
process.env.COMPLICES_SDC_USER_IDS = 'test-sdc';
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const database = require('../src/lib/db.ts');
const service = require('../src/lib/vacancies.ts');
const db = database.getDb();
for (const id of ['test-voter', 'test-other', 'test-sdc', 'test-author', 'test-conflict']) {
  db.prepare(`INSERT INTO users (id,email,password_hash,display_name,account_type,created_at) VALUES (?,?,?,?,?,?)`)
    .run(id, id, 'unused', id, 'habitant', new Date().toISOString());
}
const errorCode = (code) => (error) => error.code === code;
const future = new Date();
future.setUTCDate(future.getUTCDate() + 10);
const startsOn = service.quebecDay(future);
const input = (extra = {}) => ({ project: 'expo', title: 'Une exposition de test', weeks: 2, startsOn, ...extra });
after(() => {
  globalThis.__complicesDb?.close();
  delete globalThis.__complicesDb;
  fs.rmSync(temporary, { recursive: true, force: true });
});

test('Quebec day respects midnight and daylight-saving offsets', () => {
  assert.equal(service.quebecDay(new Date('2026-10-15T03:59:59Z')), '2026-10-14');
  assert.equal(service.quebecDay(new Date('2026-10-15T04:00:00Z')), '2026-10-15');
  assert.equal(service.quebecDay(new Date('2026-01-15T04:59:59Z')), '2026-01-14');
  assert.equal(service.quebecDay(new Date('2026-01-15T05:00:00Z')), '2026-01-15');
});

test('validation rejects invalid enums, fractional values, dates and extra identity fields', () => {
  for (const vote of [{ wish: 'invented', frequency: 1 }, { wish: 'cafe', frequency: 1.5 }, { wish: 'cafe', frequency: 4 }, { wish: 'cafe', frequency: 1, userId: 'test-other' }]) {
    assert.equal(service.voteSchema.safeParse(vote).success, false);
  }
  for (const booking of [input({ startsOn: '2027-02-30' }), input({ weeks: 0 }), input({ weeks: 1.5 }), input({ weeks: 5 }), input({ title: ' ' }), input({ status: 'confirmed' }), input({ project: 'invented' })]) {
    assert.equal(service.bookingSchema.safeParse(booking).success, false);
  }
});

test('votes are unique per user and vacancy with a three-vote daily cap', () => {
  for (const id of ['v1', 'v2', 'v3']) service.recordVacancyVote('test-voter', id, { wish: 'cafe', frequency: 2 });
  assert.throws(() => service.recordVacancyVote('test-voter', 'v1', { wish: 'resto', frequency: 1 }), errorCode('already_voted'));
  assert.throws(() => service.recordVacancyVote('test-voter', 'v4', { wish: 'cafe', frequency: 1 }), errorCode('daily_vote_limit'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM vacancy_votes WHERE user_id = ?').get('test-voter').n, 3);
  db.prepare('UPDATE vacancy_votes SET vote_day = ? WHERE user_id = ?').run('2000-01-01', 'test-voter');
  service.recordVacancyVote('test-voter', 'v4', { wish: 'cafe', frequency: 0 });
  assert.throws(() => service.recordVacancyVote('test-other', 'missing', { wish: 'cafe', frequency: 1 }), errorCode('vacancy_not_found'));
  const v1 = service.listVacancies('test-voter').find((v) => v.id === 'v1');
  assert.equal(v1.votes.cafe, 1);
  assert.equal(v1.visits, 2);
  assert.equal(v1.myVote.wish, 'cafe');
  assert.equal(service.listVacancies('test-other').find((v) => v.id === 'v1').myVote, null);
});

test('pending reservations are private and SDC access requires explicit membership', () => {
  const booking = service.requestVacancyBooking('test-author', 'v1', input());
  assert.equal(booking.status, 'pending');
  assert.equal(service.listVacancies().find((v) => v.id === 'v1').bookings.length, 0);
  assert.equal(service.listMyVacancyBookings('test-other').length, 0);
  assert.equal(service.listMyVacancyBookings('test-author')[0].id, booking.id);
  assert.throws(() => service.getSdcVacancies('test-author'), errorCode('sdc_required'));
  assert.throws(() => service.confirmVacancyBooking('test-author', booking.id), errorCode('sdc_required'));
  const privateBooking = service.getSdcVacancies('test-sdc').vacancies.find((v) => v.id === 'v1').bookings[0];
  assert.equal(privateBooking.applicant.id, 'test-author');
  assert.throws(() => service.requestVacancyBooking('test-author', 'v1', input()), errorCode('duplicate_booking'));
  assert.throws(() => service.requestVacancyBooking('test-other', 'v1', input({ startsOn: '2000-01-01' })), errorCode('past_booking'));
  assert.throws(() => service.requestVacancyBooking('test-other', 'v1', input({ startsOn: '9999-12-31', weeks: 1 })), errorCode('invalid_booking_dates'));
});

test('confirmation creates exactly one feed event and prevents overlapping approvals', () => {
  const first = service.listMyVacancyBookings('test-author')[0];
  const competing = service.requestVacancyBooking('test-conflict', 'v1', input());
  const confirmed = service.confirmVacancyBooking('test-sdc', first.id);
  assert.equal(confirmed.status, 'confirmed');
  assert.ok(confirmed.ideaId);
  assert.equal(service.confirmVacancyBooking('test-sdc', first.id).ideaId, confirmed.ideaId);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ideas WHERE id = ?').get(confirmed.ideaId).n, 1);
  assert.throws(() => service.confirmVacancyBooking('test-sdc', competing.id), errorCode('booking_conflict'));
  assert.equal(service.listMyVacancyBookings('test-conflict')[0].status, 'pending');
  assert.throws(() => service.requestVacancyBooking('test-other', 'v1', input()), errorCode('booking_conflict'));
  const publicBooking = service.listVacancies().find((v) => v.id === 'v1').bookings[0];
  assert.equal('userId' in publicBooking, false);
  assert.equal('applicant' in publicBooking, false);
  assert.equal('confirmedBy' in publicBooking, false);
  const adjacent = service.requestVacancyBooking('test-other', 'v1', input({ startsOn: confirmed.endsOn }));
  assert.equal(service.confirmVacancyBooking('test-sdc', adjacent.id).status, 'confirmed');
  // Simulate the event having started yesterday: multiweek occupancies must survive resident-post cleanup.
  db.prepare('UPDATE ideas SET starts_at = ? WHERE id = ?').run(new Date(Date.now() - 86400000).toISOString(), confirmed.ideaId);
  database.purgeEndedResidentPosts(true);
  assert.ok(database.getIdea(confirmed.ideaId, null));
});

test('failed event creation rolls back confirmation completely', () => {
  const booking = service.requestVacancyBooking('test-other', 'v2', input());
  const before = db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n;
  db.exec(`CREATE TRIGGER fail_f4_confirmation BEFORE UPDATE ON vacancy_bookings WHEN NEW.id = '${booking.id}' BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
  try { assert.throws(() => service.confirmVacancyBooking('test-sdc', booking.id), /test failure/); }
  finally { db.exec('DROP TRIGGER fail_f4_confirmation'); }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ideas').get().n, before);
  assert.equal(service.listMyVacancyBookings('test-other').find((b) => b.id === booking.id).status, 'pending');
});

test('SQLite state survives closing and reopening the connection', () => {
  const votes = db.prepare('SELECT COUNT(*) AS n FROM vacancy_votes').get().n;
  const bookings = db.prepare('SELECT COUNT(*) AS n FROM vacancy_bookings').get().n;
  db.close();
  delete globalThis.__complicesDb;
  const reopened = database.getDb();
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM vacancy_votes').get().n, votes);
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM vacancy_bookings').get().n, bookings);
  assert.equal(service.listVacancies().length, 5);
});

test('additive schema preparation preserves existing users, events, votes and reservations', () => {
  const connection = database.getDb();
  const tables = ['users', 'ideas', 'vacancy_votes', 'vacancy_bookings'];
  const before = tables.map((table) => connection.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
  require('../src/lib/vacancy-schema.ts').prepareVacancies(connection);
  assert.deepEqual(tables.map((table) => connection.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n), before);
  assert.equal(connection.pragma('foreign_key_check').length, 0);
});
