#!/usr/bin/env node
/* Checks the alankar data (assets/alankar-data.js) without a browser: every pattern must resolve to valid swars in
   every scale it is offered in, start and end on Sa, and come back down as the mirror of the way up.
   Run: node tools/check-alankar.js   (exits 1 on any failure) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'assets');
// demo.js and ragas.js are browser scripts: load them with a minimal window/document so parseSwar and RAGA_NOTATION are the real ones.
globalThis.window = globalThis;
globalThis.document = { addEventListener() {} };
['audio.js', 'ragas.js', 'demo.js'].forEach((f) => vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f }));
const { parseSwar } = globalThis.FluteDemo, RAGAS = globalThis.RAGA_NOTATION;
const A = require(path.join(dir, 'alankar-data.js'));

let failed = 0, checks = 0;
const check = (name, ok, detail) => { checks++; if (!ok) { failed++; console.log(`FAIL ${name}${detail ? ' (' + detail + ')' : ''}`); } };

// ----- shape -----
const unique = (list) => new Set(list).size === list.length;
check('pattern ids are unique', unique(A.patterns.map((p) => p.id)));
check('scale ids are unique', unique(A.scales.map((s) => s.id)));
check('at least 15 patterns', A.patterns.length >= 15, A.patterns.length + ' patterns');
check('at least 8 scales', A.scales.length >= 8, A.scales.length + ' scales');

// ----- scales -----
A.scales.forEach((s) => {
  const toks = s.tokens.split(/\s+/), sw = toks.map(parseSwar);
  check(`scale ${s.id}: every token is a valid swar`, sw.every(Boolean), s.tokens);
  if (!sw.every(Boolean)) return;
  check(`scale ${s.id}: runs from Sa to the upper Sa`, toks[0] === 'S' && toks[toks.length - 1] === "S'");
  check(`scale ${s.id}: notes rise within one octave`, sw.every((x, i) => i === 0 || x.a > sw[i - 1].a) && sw[0].a === 0 && sw[sw.length - 1].a === 12);
  check(`scale ${s.id}: has a name`, !!s.name);
  if (s.raga) check(`scale ${s.id}: matches the aroha of raga ${s.raga}`, !!RAGAS[s.raga] && RAGAS[s.raga].aroha === s.tokens, RAGAS[s.raga] && RAGAS[s.raga].aroha);
});

// ----- patterns -----
A.patterns.forEach((p) => {
  check(`pattern ${p.id}: has a name and a description`, !!p.name && !!p.about);
  check(`pattern ${p.id}: kernel starts on Sa and holds whole degrees`, Array.isArray(p.kernel) && p.kernel.length > 0 && p.kernel[0] === 0 && p.kernel.every((k) => Number.isInteger(k) && k >= 0));
  check(`pattern ${p.id}: step is a whole number of 1 or more`, (p.step || 1) >= 1 && Number.isInteger(p.step || 1));
});

// ----- every pattern in every scale -----
let rounds = 0, longest = 0;
A.patterns.forEach((p) => A.scales.forEach((s) => {
  const id = `${p.id} in ${s.id}`, b = A.build(p, s), toks = s.tokens.split(/\s+/);
  rounds++;
  const flat = (groups) => [].concat.apply([], groups);
  const asc = flat(b.ascGroups), desc = flat(b.descGroups.slice(0, b.ascGroups.length));
  check(`${id}: has at least two groups going up`, b.ascGroups.length >= 2, b.ascGroups.length + ' groups');
  check(`${id}: no empty group`, b.ascGroups.every((g) => g.length === p.kernel.length));
  check(`${id}: every degree is inside the scale`, b.degrees.every((d) => Number.isInteger(d) && d >= 0 && d <= b.top));
  check(`${id}: every token is a valid swar`, b.tokens.every((t) => !!parseSwar(t)) && b.tokens.length === b.degrees.length);
  check(`${id}: tokens come from the scale`, b.tokens.every((t, i) => t === toks[b.degrees[i]]));
  check(`${id}: starts on Sa`, b.tokens[0] === 'S');
  check(`${id}: ends on Sa`, b.tokens[b.tokens.length - 1] === 'S');
  check(`${id}: coming down mirrors going up`, desc.length === asc.length && asc.every((d, i) => desc[i] === b.top - d));
  check(`${id}: round is not empty or very long`, b.tokens.length >= 4 && b.tokens.length <= 80, b.tokens.length + ' notes');
  check(`${id}: the final Sa is only added when needed`, b.resolved === (desc[desc.length - 1] !== 0) && (!b.resolved || b.descGroups[b.descGroups.length - 1].length === 1));
  longest = Math.max(longest, b.tokens.length);
}));

console.log(`${A.patterns.length} patterns x ${A.scales.length} scales = ${rounds} rounds, longest ${longest} notes; ${checks} checks`);
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('all checks passed');
