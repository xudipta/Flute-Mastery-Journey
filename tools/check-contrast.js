/* Checks the WCAG contrast of the colour tokens in assets/styles.css, for light and dark mode.
   Run: node tools/check-contrast.js   (exits 1 if a pair is below its threshold)
   Text needs 4.5:1; borders of controls, focus rings and other indicators need 3:1.
   A foreground written "token@0.78" is that token at 78% opacity, blended over the background (secondary lines on dark bars). */
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'styles.css'), 'utf8');

// The first :root block is light mode; the one inside @media (prefers-color-scheme: dark) overrides it.
function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const light = tokens(css.match(/:root\s*\{([^}]*)\}/)[1]);
const darkBlock = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/);
const dark = Object.assign({}, light, tokens(darkBlock[1]));

const rgb = (hex) => {
  let h = hex.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = (hex) => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blend = (fg, bg, a) => '#' + rgb(fg).map((v, i) => Math.round(v * a + rgb(bg)[i] * (1 - a)).toString(16).padStart(2, '0')).join('');

// [foreground token, background token, minimum, what it is]
const PAIRS = [
  ['ink', 'bg', 4.5, 'body text on the page'],
  ['ink', 'surface', 4.5, 'text on a card or the deck'],
  ['ink', 'surface-2', 4.5, 'text on a quiet fill (beat cells, segmented track)'],
  ['ink', 'raised', 4.5, 'text on the selected segment'],
  ['ink-2', 'bg', 4.5, 'secondary text on the page'],
  ['ink-2', 'surface', 4.5, 'secondary text on a card'],
  ['ink-2', 'surface-2', 4.5, 'secondary text on a quiet fill'],
  ['ink-3', 'bg', 4.5, 'tertiary text on the page (captions, hints, tab labels)'],
  ['ink-3', 'surface', 4.5, 'tertiary text on a card (small labels)'],
  ['ink-3', 'surface-2', 4.5, 'tertiary text on a quiet fill (beat marks)'],
  ['accent-ink', 'bg', 4.5, 'accent text on the page (links, active tab)'],
  ['accent-ink', 'surface', 4.5, 'accent text on a card'],
  ['accent-ink', 'surface-2', 4.5, 'accent text on a quiet fill'],
  ['accent-ink', 'accent-soft', 4.5, 'accent text on the soft accent (chips, selected row)'],
  ['ink', 'accent-soft', 4.5, 'text on the soft accent (selected row title)'],
  ['ink-2', 'accent-soft', 4.5, 'secondary text on the soft accent (selected row detail)'],
  ['ink-3', 'accent-soft', 4.5, 'tertiary text on the soft accent (anything that keeps ink-3 inside a selected row)'],
  ['on-accent', 'accent', 4.5, 'label on the accent (primary button, play button, active beat)'],
  ['bg', 'ink', 4.5, 'label on a selected filter chip'],
  ['on-ok', 'ok', 4.5, 'label on a green (done) fill'],
  ['ok', 'bg', 4.5, 'green text on the page'],
  ['ok', 'surface', 4.5, 'green text on a card (tags, in-tune verdict)'],
  ['danger', 'surface', 4.5, 'warning text on a card'],
  ['on-mini', 'mini', 4.5, 'text on the now-playing bar'],
  ['on-mini@0.78', 'mini', 4.5, 'secondary line on the now-playing bar'],
  ['line-2', 'bg', 3, 'control borders on the page'],
  ['line-2', 'surface', 3, 'control borders on a card'],
  ['accent', 'bg', 3, 'accent indicators on the page (active tab icon, brand icon)'],
  ['accent', 'surface', 3, 'accent indicators on a card (check mark, bar line)'],
  ['accent', 'accent-soft', 3, 'accent border on the soft accent'],
  ['focus', 'bg', 3, 'focus ring on the page'],
  ['focus', 'surface', 3, 'focus ring on a card'],
  ['ink', 'surface-2', 3, 'slider fill on its track']
];

let failed = 0;
for (const [mode, t] of [['light', light], ['dark', dark]]) {
  console.log(`\n${mode} mode`);
  for (const [fg, bg, min, what] of PAIRS) {
    const [name, alpha] = fg.split('@');
    const b = t[bg];
    let f = t[name];
    if (!f || !b) { console.log(`  MISSING token for ${fg} / ${bg}`); failed++; continue; }
    if (alpha) f = blend(f, b, Number(alpha));
    const r = ratio(f, b), ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}  (min ${min})  ${what}  [${fg} ${f} on ${bg} ${b}]`);
  }
}
console.log(failed ? `\n${failed} pair(s) below the threshold` : '\nall contrast pairs pass');
process.exit(failed ? 1 : 0);
