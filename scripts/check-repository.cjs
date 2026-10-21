const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9_]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/, /AKIA[0-9A-Z]{16}/, /(?:sk_live_|xoxb-)[A-Za-z0-9-]{20,}/];
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== '.env.example') findings.push(`${file} : configuration personnelle suivie`);
  if (/\.(db|sqlite3?|xlsx|pem|key)$/i.test(file)) findings.push(`${file} : fichier à vérifier avant publication`);
  if (!fs.existsSync(file)) continue;
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  if (patterns.some((pattern) => pattern.test(bytes.toString('utf8')))) findings.push(`${file} : motif de secret potentiel`);
}
// N'affiche jamais le contenu d'un secret éventuel.
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`${files.length} fichiers suivis vérifiés : aucun fichier privé ni motif de secret détecté. Contrôle limité, pas une garantie exhaustive.`);
