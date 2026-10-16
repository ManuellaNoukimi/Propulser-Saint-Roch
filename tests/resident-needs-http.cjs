const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'complices-resident-http-'));
const port = Number(process.env.RESIDENT_TEST_PORT || 3015);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: path.resolve(__dirname, '..'), env: { ...process.env, COMPLICES_DATA_DIR: directory, COMPLICES_DIST_DIR: '.next-test', COMPLICES_STRICT_AUTH: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (chunk) => { output = (output + chunk).slice(-12000); });
server.stderr.on('data', (chunk) => { output = (output + chunk).slice(-12000); });
async function request(url, method = 'GET', body, cookie) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], cache: response.headers.get('cache-control') };
}
async function main() {
  const deadline = Date.now() + 45000;
  while (!output.includes('Ready in')) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(output || 'Server startup timeout');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const anonymous = await request('/api/resident-needs');
  assert.equal(anonymous.status, 200); assert.deepEqual(anonymous.body.needs, []); assert.match(anonymous.cache, /no-store/);
  const input = { category: 'epicerie', lat: 46.8148, lng: -71.224, frequency: 2, radiusMeters: 500 };
  assert.equal((await request('/api/resident-needs', 'POST', input)).status, 401);
  const a = (await request('/api/auth/login', 'POST', { email: 'resident-http-a' })).cookie;
  const b = (await request('/api/auth/login', 'POST', { email: 'resident-http-b' })).cookie;
  assert.equal((await request('/api/resident-needs', 'POST', { ...input, lat: 0, lng: 0 }, a)).status, 422);
  assert.equal((await request('/api/resident-needs', 'POST', { ...input, userId: 'forged' }, a)).status, 400);
  const created = await request('/api/resident-needs', 'POST', input, a);
  assert.equal(created.status, 201); assert.equal(created.body.created, true);
  const id = created.body.id;
  const joined = await request('/api/resident-needs', 'POST', { ...input, frequency: 3 }, b);
  assert.equal(joined.body.id, id); assert.equal(joined.body.created, false);
  assert.equal((await request(`/api/resident-needs/${id}/support`, 'PUT', { frequency: 0 }, a)).status, 200);
  const publicNeed = (await request('/api/resident-needs')).body.needs[0];
  assert.equal(publicNeed.zone.radiusMeters, 500); assert.equal(publicNeed.zone.lat, 46.815); assert.equal('sector' in publicNeed, false);
  assert.equal(publicNeed.supporters, 2); assert.equal(publicNeed.visitsPerWeek, 3); assert.equal(publicNeed.mySupport, null);
  assert.equal((await request('/api/resident-needs', 'GET', undefined, a)).body.needs[0].mySupport.frequency, 0);
  assert.equal((await request(`/api/resident-needs/${id}/support`, 'DELETE')).status, 401);
  assert.equal((await request(`/api/resident-needs/${id}/support`, 'DELETE', undefined, a)).status, 200);
  assert.equal((await request('/api/resident-needs', 'GET', undefined, a)).body.needs[0].mySupport, null);
  assert.equal((await request('/api/resident-needs')).body.needs[0].supporters, 1);
  assert.equal((await request(`/api/resident-needs/${id}/support`, 'PUT', { frequency: 1.5 }, a)).status, 400);
  for (const category of ['gym', 'cafe']) assert.equal((await request('/api/resident-needs', 'POST', { ...input, category }, a)).status, 201);
  assert.equal((await request('/api/resident-needs', 'POST', { ...input, category: 'pharmacie' }, a)).status, 429);
  assert.equal((await request(`/api/resident-needs/${id}/support`, 'DELETE', undefined, b)).status, 200);
  const page = await fetch(`http://127.0.0.1:${port}/vitrines`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Vitrine/);
  console.log('HTTP résident : accès public, sessions, regroupement, soutien, modification, retrait, quota et page vérifiés.');
}
main().catch((error) => { console.error(error, output); process.exitCode = 1; }).finally(async () => {
  if (server.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else server.kill('SIGTERM');
    await new Promise((resolve) => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  }
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});
