/* Checks the WCAG contrast of the colour tokens in assets/styles.css, for dark and light mode.
   Run: node tools/check-contrast.js   (exits 1 if a pair is below its threshold)
   Text needs 4.5:1; borders, focus rings and other controls need 3:1. */
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'styles.css'), 'utf8');

// The first :root block is dark mode; the one inside @media (prefers-color-scheme: light) overrides it.
function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const dark = tokens(css.match(/:root\s*\{([^}]*)\}/)[1]);
const lightBlock = css.match(/@media \(prefers-color-scheme: light\)\s*\{\s*:root\s*\{([^}]*)\}/);
const light = Object.assign({}, dark, tokens(lightBlock[1]));

const lum = (hex) => {
  let h = hex.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// [foreground token or hex, background token or hex, minimum, what it is]
const PAIRS = [
  ['ink', 'bg', 4.5, 'body text on the page'],
  ['ink', 'panel', 4.5, 'text on a card'],
  ['ink', 'panel-2', 4.5, 'text on the lighter end of a card / raised surface'],
  ['muted', 'bg', 4.5, 'secondary text on the page'],
  ['muted', 'panel', 4.5, 'secondary text on a card'],
  ['muted', 'panel-2', 4.5, 'secondary text on a raised surface'],
  ['accent-ink', 'bg', 4.5, 'amber emphasis text on the page'],
  ['accent-ink', 'panel', 4.5, 'amber emphasis text on a card'],
  ['accent-ink', 'panel-2', 4.5, 'amber emphasis text on a raised surface'],
  ['on-accent', 'accent', 4.5, 'label on an amber button'],
  ['#ffffff', 'accent2', 4.5, 'white label on an indigo (selected) control'],
  ['on-ok', 'ok', 4.5, 'label on a green (done) fill'],
  ['ok-ink', 'panel', 4.5, 'green text on a card'],
  ['danger', 'panel', 4.5, 'warning text on a card'],
  ['line-strong', 'panel', 3, 'control borders on a card'],
  ['line-strong', 'bg', 3, 'control borders on the page'],
  ['accent2', 'bg', 3, 'indigo ring / indicator on the page'],
  ['accent2', 'panel', 3, 'indigo ring / indicator on a card'],
  ['focus', 'bg', 3, 'focus ring on the page'],
  ['focus', 'panel', 3, 'focus ring on a card']
];

let failed = 0;
for (const [mode, t] of [['dark', dark], ['light', light]]) {
  console.log(`\n${mode} mode`);
  for (const [fg, bg, min, what] of PAIRS) {
    const f = fg.startsWith('#') ? fg : t[fg], b = bg.startsWith('#') ? bg : t[bg];
    if (!f || !b) { console.log(`  MISSING token for ${fg} / ${bg}`); failed++; continue; }
    const r = ratio(f, b), ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}  (min ${min})  ${what}  [${fg} ${f} on ${bg} ${b}]`);
  }
}
console.log(failed ? `\n${failed} pair(s) below the threshold` : '\nall contrast pairs pass');
process.exit(failed ? 1 : 0);
