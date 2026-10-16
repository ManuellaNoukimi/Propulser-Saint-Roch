// Run explicitly: node --conditions=react-server tests/vacancies-http.cjs
// Real HTTP routes + session cookies, using an isolated SQLite database and build cache.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const ts = require('typescript');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-f4-http-'));
process.env.COMPLICES_DATA_DIR = directory;
process.env.COMPLICES_SDC_USER_IDS = 'f4-http-sdc';
process.env.COMPLICES_SDC_API_KEY = 'f4-isolated-http-test-secret-32-characters';
process.env.COMPLICES_STRICT_AUTH = '0';
process.env.COMPLICES_DIST_DIR = '.next-test';
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const database = require('../src/lib/db.ts');
const { quebecDay } = require('../src/lib/vacancies.ts');
const db = database.getDb();
for (const id of ['f4-http-voter', 'f4-http-sdc', 'f4-http-other']) {
  db.prepare('INSERT INTO users (id,email,password_hash,display_name,account_type,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, id, 'unused', id, 'habitant', new Date().toISOString());
}
db.close();
delete globalThis.__complicesDb;

const port = Number(process.env.F4_TEST_PORT || 3014);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: path.resolve(__dirname, '..'), env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (chunk) => { output = (output + chunk).slice(-12000); });
server.stderr.on('data', (chunk) => { output = (output + chunk).slice(-12000); });
async function request(url, method = 'GET', body, cookie, sdcKey) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(sdcKey ? { 'X-SDC-Key': sdcKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], cache: response.headers.get('cache-control') };
}
async function main() {
  const deadline = Date.now() + 45000;
  while (!output.includes('Ready in')) {
    if (server.exitCode !== null) throw new Error(output);
    if (Date.now() > deadline) throw new Error(`Server startup timeout: ${output}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const anonymous = await request('/api/vacancies');
  assert.equal(anonymous.status, 200);
  assert.equal(anonymous.body.vacancies.length, 5);
  assert.match(anonymous.cache, /no-store/);
  assert.equal((await request('/api/vacancies/v1/votes', 'POST', { wish: 'cafe', frequency: 1 })).status, 401);
  assert.equal((await request('/api/vacancies/sdc')).status, 401);
  const voter = (await request('/api/auth/login', 'POST', { email: 'f4-http-voter' })).cookie;
  const sdc = (await request('/api/auth/login', 'POST', { email: 'f4-http-sdc' })).cookie;
  const other = (await request('/api/auth/login', 'POST', { email: 'f4-http-other' })).cookie;
  const key = process.env.COMPLICES_SDC_API_KEY;
  assert.ok(voter && sdc && other);
  assert.equal((await request('/api/vacancies/sdc', 'GET', undefined, voter)).status, 403);
  assert.equal((await request('/api/vacancies/sdc', 'GET', undefined, voter, key)).status, 403);
  assert.equal((await request('/api/vacancies/sdc', 'GET', undefined, sdc)).status, 403);
  assert.equal((await request('/api/vacancies/sdc', 'GET', undefined, sdc, 'incorrect-key')).status, 403);
  assert.equal((await request('/api/vacancies/v1/votes', 'POST', { wish: 'cafe', frequency: 1, userId: 'f4-http-sdc' }, voter)).status, 400);
  for (const id of ['v1', 'v2', 'v3']) assert.equal((await request(`/api/vacancies/${id}/votes`, 'POST', { wish: 'cafe', frequency: 2 }, voter)).status, 201);
  assert.equal((await request('/api/vacancies/v1/votes', 'POST', { wish: 'cafe', frequency: 2 }, voter)).status, 409);
  assert.equal((await request('/api/vacancies/v4/votes', 'POST', { wish: 'cafe', frequency: 2 }, voter)).status, 429);
  const future = new Date(Date.now() + 10 * 86400000);
  const booking = { project: 'expo', title: 'Exposition HTTP de test', startsOn: quebecDay(future), weeks: 2 };
  const pending = await request('/api/vacancies/v1/bookings', 'POST', booking, voter);
  assert.equal(pending.status, 201);
  assert.equal(pending.body.booking.status, 'pending');
  const competing = await request('/api/vacancies/v1/bookings', 'POST', booking, other);
  assert.equal(competing.status, 201);
  assert.equal((await request('/api/vacancies')).body.vacancies[0].bookings.length, 0);
  assert.equal((await request('/api/vacancy-bookings', 'GET', undefined, voter)).body.bookings.length, 1);
  const id = pending.body.booking.id;
  assert.equal((await request(`/api/vacancy-bookings/${id}`, 'PATCH', { status: 'confirmed' }, voter)).status, 403);
  assert.equal((await request(`/api/vacancy-bookings/${id}`, 'PATCH', { status: 'confirmed' }, sdc)).status, 403);
  const confirmed = await request(`/api/vacancy-bookings/${id}`, 'PATCH', { status: 'confirmed' }, sdc, key);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.booking.status, 'confirmed');
  assert.equal((await request(`/api/vacancy-bookings/${id}`, 'PATCH', { status: 'confirmed' }, sdc, key)).body.booking.ideaId, confirmed.body.booking.ideaId);
  assert.equal((await request(`/api/vacancy-bookings/${competing.body.booking.id}`, 'PATCH', { status: 'confirmed' }, sdc, key)).status, 409);
  const publicLocal = (await request('/api/vacancies')).body.vacancies[0];
  assert.equal(publicLocal.visits, 2);
  assert.equal(publicLocal.myVote, null);
  assert.equal(publicLocal.bookings.length, 1);
  assert.equal('applicant' in publicLocal.bookings[0], false);
  const dashboard = await request('/api/vacancies/sdc', 'GET', undefined, sdc, key);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.vacancies[0].bookings.length, 2);
  const ideas = await request('/api/ideas');
  assert.equal(ideas.status, 200);
  assert.equal(ideas.body.ideas.filter((idea) => idea.id === confirmed.body.booking.ideaId).length, 1);
  console.log('HTTP F4 : sessions, permissions, validation, votes, plafond, confidentialité, confirmation et accueil vérifiés.');
}
main().catch((error) => { console.error(error, output); process.exitCode = 1; }).finally(async () => {
  if (server.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else server.kill('SIGTERM');
    await new Promise((resolve) => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  }
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});
