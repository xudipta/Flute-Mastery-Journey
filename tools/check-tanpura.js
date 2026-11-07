#!/usr/bin/env node
/* Measures the synthesised tanpura without a browser: pitch error of every string for all Sa choices at
   44.1 and 48 kHz, build time, and how loud and bright a string stays over time.
   Usage: node tools/check-tanpura.js [path/to/audio.js]   (exits 1 if any string is more than 1 cent off) */
const vm = require('vm'), fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'assets', 'audio.js');
vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });   // not a sandbox: the sandbox makes the build several times slower
const A = globalThis.FluteAudio, T = A.TANPURA || {};
const MAX_CENTS = 1;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const saFreq = (i) => 130.81 * Math.pow(2, i / 12);
const cents = (f, t) => 1200 * Math.log2(f / t);

// Frequency of the k-th harmonic of a string meant to sound at f0: demodulate at k*f0, average over whole
// periods of f0 (which also cancels the other harmonics), and fit a line to the unwrapped phase. Unlike
// autocorrelation this is not thrown off by a level that rises or falls while the string rings.
function harmonicHz(x, sr, f0, k) {
  const fk = f0 * k, w = 2 * Math.PI * fk / sr, start = Math.floor(sr * 0.1), N = Math.floor(sr * 1.8);
  const re = new Float64Array(N + 1), im = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) { const n = start + i; re[i + 1] = re[i] + x[n] * Math.cos(w * n); im[i + 1] = im[i] - x[n] * Math.sin(w * n); }
  const L = Math.round(6 * sr / f0), step = Math.max(1, L >> 2), xs = [], ys = [];
  let prev = null, off = 0;
  for (let p = 0; p + L <= N; p += step) {
    let ph = Math.atan2(im[p + L] - im[p], re[p + L] - re[p]);
    if (prev !== null) { while (ph + off - prev > Math.PI) off -= 2 * Math.PI; while (ph + off - prev < -Math.PI) off += 2 * Math.PI; }
    ph += off; prev = ph; xs.push(start + p + L / 2); ys.push(ph);
  }
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0; xs.forEach((xv, i) => { sxy += (xv - mx) * (ys[i] - my); sxx += (xv - mx) ** 2; });
  return fk + (sxy / sxx) * sr / (2 * Math.PI);
}
// Error of a string in cents: the larger of its 1st and 2nd harmonic (k=1 is what you hear as the note).
const stringError = (buf, sr, f) => [1, 2].map((k) => cents(harmonicHz(buf, sr, f, k), f * k)).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));

// Parts of the string set: [first, Sa, Sa, low Sa] ratios.
const ratios = T.ratios || { Pa: 0.75 };
const strings = [['first (Pa)', ratios.Pa], ['Sa', 1], ['low Sa', 0.5]];
let worst = 0, bad = 0;
for (const sr of [44100, 48000]) {
  console.log(`\n== ${sr} Hz: pitch error in cents (first string Pa, Sa, low Sa) ==`);
  for (let i = 0; i < 12; i++) {
    const sa = saFreq(i), e = strings.map(([, r]) => { const f = sa * r; return stringError(A.tanpuraString(sr, f, 3), sr, f); });
    e.forEach((x) => { worst = Math.max(worst, Math.abs(x)); if (Math.abs(x) > MAX_CENTS) bad++; });
    console.log(NAMES[i].padEnd(3), `${sa.toFixed(1)}Hz`.padEnd(8), 'Pa', e[0].toFixed(2).padStart(6), ' Sa', e[1].toFixed(2).padStart(6), ' lowSa', e[2].toFixed(2).padStart(6), ' | Sa vs low Sa octave', (e[1] - e[2]).toFixed(2).padStart(6));
  }
}
if (T.ratios) {
  for (const first of ['Ma', 'Ni']) {
    const sr = 48000, sa = saFreq(2), f = sa * ratios[first], e = stringError(A.tanpuraString(sr, f, 3), sr, f);
    worst = Math.max(worst, Math.abs(e)); if (Math.abs(e) > MAX_CENTS) bad++;
    console.log(`first string ${first} at D (${f.toFixed(1)} Hz, ratio ${ratios[first].toFixed(4)}): ${e.toFixed(2)} cents`);
  }
  for (const sa of [98, 103.83, 110, 116.54, 123.47]) {   // the low-octave Sa choices, G to B
    const sr = 44100, e = [0.5, 1, 0.75].map((r) => stringError(A.tanpuraString(sr, sa * r, 3), sr, sa * r));
    e.forEach((x) => { worst = Math.max(worst, Math.abs(x)); if (Math.abs(x) > MAX_CENTS) bad++; });
    console.log(`low Sa ${sa.toFixed(1)} Hz (low Sa / Sa / Pa): ${e.map((x) => x.toFixed(2)).join(' / ')} cents`);
  }
}
console.log(`\nworst single-string pitch error: ${worst.toFixed(2)} cents  (${bad} strings over ${MAX_CENTS} cent)`);

// Time to build the four strings (this runs in a worker in the app; on the main thread it would freeze the page).
for (const sr of [44100, 48000]) {
  const t = process.hrtime.bigint(); A.tanpuraStrings(sr, 146.83);
  console.log(`build 4 strings @${sr}: ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(0)} ms`);
}

// Level and brightness of the Sa string over time.
const sr = 44100, strs = A.tanpuraStrings(sr, 146.83), b = strs[1], secs = Math.floor(b.length / sr);
const rms = (x, a, z) => { let s = 0; for (let i = a; i < z; i++) s += x[i] * x[i]; return Math.sqrt(s / (z - a)); };
const bright = (x, a, z) => { let d = 0, s = 0; for (let i = a + 1; i < z; i++) { d += (x[i] - x[i - 1]) ** 2; s += x[i] ** 2; } return Math.sqrt(d / (s || 1)); };
const lv = [], br = [];
for (let s = 0; s < secs; s++) { lv.push(rms(b, s * sr, (s + 1) * sr)); br.push(bright(b, s * sr, (s + 1) * sr)); }
console.log('\nSa string level by second (dB vs second 0):', lv.map((v) => (20 * Math.log10(v / lv[0])).toFixed(0)).join(' '));
console.log('Sa string brightness by second          :', br.map((v) => v.toFixed(2)).join(' '));
const at = (arr, s) => arr[Math.min(s, arr.length - 1)];
console.log(`summary: level at 2 s ${(20 * Math.log10(at(lv, 2) / lv[0])).toFixed(1)} dB, 4 s ${(20 * Math.log10(at(lv, 4) / lv[0])).toFixed(1)} dB, 6 s ${(20 * Math.log10(at(lv, 6) / lv[0])).toFixed(1)} dB; brightness at 2 s / at 0 s = ${(at(br, 2) / br[0]).toFixed(2)}`);

// The whole drone: pluck the four strings in turn like the app does and look at the steady mix.
const gap = (T.gaps && T.gaps.medium) || 1.15, gains = T.gains || [0.7, 0.9, 0.9, 0.9];
const total = 60, mix = new Float32Array(sr * total);
for (let n = 0, t = 0; t < total; n++, t += gap) {
  const buf = strs[n % 4], g = gains[n % 4], o = Math.floor(t * sr);
  for (let i = 0; i < buf.length && o + i < mix.length; i++) mix[o + i] += g * buf[i];
}
const m0 = 20 * sr, m1 = 60 * sr; let pk = 0; for (let i = m0; i < m1; i++) pk = Math.max(pk, Math.abs(mix[i]));
const per = []; for (let s = 20; s < 60; s++) per.push(rms(mix, s * sr, (s + 1) * sr));
console.log(`drone mix (20-60 s): RMS ${rms(mix, m0, m1).toFixed(3)}, peak ${pk.toFixed(2)}, per-second RMS min ${Math.min(...per).toFixed(3)} max ${Math.max(...per).toFixed(3)} (even = small spread)`);
process.exit(bad ? 1 : 0);
