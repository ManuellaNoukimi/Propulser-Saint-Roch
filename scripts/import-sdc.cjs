// node --conditions=react-server scripts/import-sdc.cjs data/sdc-import.json
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { getDb, DATA_DIR } = require('../src/lib/db.ts');
const { sdcImportSchema, importSdcSnapshot } = require('../src/lib/sdc-members.ts');
async function main() {
  const input = sdcImportSchema.parse(JSON.parse(fs.readFileSync(process.argv[2] || path.join(DATA_DIR, 'sdc-import.json'), 'utf8')));
  const db = getDb();
  const backup = path.join(DATA_DIR, `before-sdc-${Date.now()}.db`);
  await db.backup(backup);
  console.log(JSON.stringify({ ...importSdcSnapshot(input), backup }));
  db.close();
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
