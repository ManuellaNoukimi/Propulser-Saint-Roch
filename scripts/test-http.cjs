const { spawnSync } = require('node:child_process');
const path = require('node:path');
// Séquentiel : les scénarios existants partagent .next-test, mais pas les données.
for (const test of ['vacancies-http.cjs', 'resident-needs-http.cjs', 'resident-progress-http.cjs']) {
  console.log(`\nScénario HTTP : ${test}`);
  const result = spawnSync(process.execPath, ['--conditions=react-server', path.join('tests', test)], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true, timeout: 300000,
  });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Échec : ${test}`);
    process.exit(result.status || 1);
  }
}
