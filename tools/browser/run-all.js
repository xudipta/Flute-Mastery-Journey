/* Runs every browser suite in this folder, in turn, against BASE, and prints one pass/fail line per suite.
   Exits non-zero when any suite fails.

     python3 -m http.server 8800                              (in the repo, in another terminal)
     BASE=http://localhost:8800 node tools/browser/run-all.js [--long] [screenshot-folder]

   --long adds tools/check-alankar-browser.js (about 100 s of real audio time). */
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const long = args.includes('--long');
const out = args.find((a) => !a.startsWith('--')) || os.tmpdir();
const here = __dirname;
const suites = ['nav', 'home', 'practice-cards', 'ragas-learn', 'timer-chip', 'timer-restore', 'wake-lock', 'bell-fallback', 'polish']
  .map((n) => ({ name: n, file: path.join(here, n + '.js') }));
if (long) suites.push({ name: 'alankar (long)', file: path.join(here, '..', 'check-alankar-browser.js') });

let failed = 0;
for (const s of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [s.file, out], { env: process.env, encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (r.stdout || '') + (r.stderr || '');
  const failLines = text.split('\n').filter((l) => /^FAIL/.test(l));
  const pass = r.status === 0 && failLines.length === 0 && /all passed|\d+\/\d+ checks passed/.test(text);
  if (!pass) failed++;
  const secs = ((Date.now() - t0) / 1000).toFixed(0).padStart(3);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${s.name.padEnd(16)} ${secs} s`);
  if (!pass) {
    failLines.slice(0, 8).forEach((l) => console.log('      ' + l));
    if (!failLines.length) console.log(text.trim().split('\n').slice(-8).map((l) => '      ' + l).join('\n'));
  }
}
console.log(failed ? `\n${failed} suite(s) FAILED` : '\nall suites passed');
process.exit(failed ? 1 : 0);
