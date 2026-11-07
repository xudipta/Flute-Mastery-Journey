/* Lists CSS class and id names that no HTML or JS file mentions, so dead rules can be found and removed.
   Run: node tools/check-css-unused.js   (prints the names and the rules that use them; exits 1 if any are found)
   A name counts as used if its text appears in index.html or in any assets/*.js file. Names built at run time
   (for example 'is-' + state) have to be allow-listed below. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');

const cssFiles = fs.readdirSync(assets).filter((f) => f.endsWith('.css'));
const sources = ['index.html'].map((f) => fs.readFileSync(path.join(root, f), 'utf8'))
  .concat(fs.readdirSync(assets).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(assets, f), 'utf8')))
  .join('\n');

// built from pieces at run time, or set by the browser: not findable as whole words in the source
const ALLOW = new Set(['lv1', 'lv2', 'has-note', 'today', 'sel', 'is-done', 'is-running', 'is-current', 'running', 'tuck', 'on', 'ok', 'active', 'done', 'tuning', 'now', 'sep']);

const used = (name) => ALLOW.has(name) || new RegExp('(^|[^\\w-])' + name.replace(/[-]/g, '\\-') + '([^\\w-]|$)').test(sources);

let bad = 0;
for (const f of cssFiles) {
  const css = fs.readFileSync(path.join(assets, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // split into rules ("selector { body }"), flattening @media blocks
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (sel.startsWith('@') || /^(from|to|\d+%)/.test(sel)) continue;
    rules.push(sel);
  }
  const missing = new Map();
  for (const sel of rules) {
    for (const part of sel.split(',')) {
      for (const t of part.matchAll(/([.#])([A-Za-z_][\w-]*)/g)) {
        if (/^#[0-9a-f]{3,8}$/i.test(t[0])) continue;
        if (!used(t[2])) { if (!missing.has(t[2])) missing.set(t[2], new Set()); missing.get(t[2]).add(part.trim()); }
      }
    }
  }
  if (missing.size) {
    console.log(`\n${f}`);
    for (const [name, sels] of missing) { bad++; console.log(`  ${name}   in: ${[...sels].slice(0, 2).join(' | ').slice(0, 110)}`); }
  }
}
console.log(bad ? `\n${bad} unused name(s)` : '\nno unused class or id names');
process.exit(bad ? 1 : 0);
