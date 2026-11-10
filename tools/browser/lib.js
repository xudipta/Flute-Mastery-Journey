/* Shared helpers for the browser suites in tools/browser.

   Run one suite against a running copy of the site (any static server, for example
   `python3 -m http.server 8800` in the repo):

     BASE=http://localhost:8800 node tools/browser/<suite>.js [screenshot-folder]

   `run-all.js` runs them all. Needs `playwright` (npm i playwright). Every suite prints one line per check
   ("ok" or "FAIL"), ends with "all passed" or "N FAILED", and exits non-zero when a check failed.

   SEL and act hold the controls the suites touch, in one place: when the UI is rebuilt, update this file
   and the suites keep working. */
const { chromium } = require('playwright');
const os = require('os');

const BASE = (process.env.BASE || 'http://localhost:8800').replace(/\/$/, '');
const OUT = process.argv[2] || os.tmpdir(); // screenshots go here

const launch = (extra = []) => chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', ...extra] });

const SEL = {
  runAll: '#run-all',
  cardToggle: '.pc-card.active .pc-toggle',
  cardReset: '.pc-card.active .pc-reset',
  cardTime: '.pc-card.active .pc-time',
  timerChip: '#mini', // the now-playing bar: it carries the running timer on every tab
  bottomBar: '.mini', // the fixed bar that content must stay above while a timer runs
};

/* The sound controls live on Home, so the suites drive them through the app's API (FluteApp), which Home also uses.
   The Home suite (home.js) clicks the real buttons. */
const act = {
  droneToggle: (p) => p.evaluate(() => FluteApp.drone.toggle()),
  taalToggle: (p) => p.evaluate(() => FluteApp.tabla.toggle()),
  bpmUp: (p) => p.evaluate(() => FluteApp.setBpm(FluteApp.bpm() + 5)),
  /* true while the now-playing bar is on screen */
  chipVisible: (p) => p.evaluate((s) => { const c = document.querySelector(s); return !!c && !c.hidden && getComputedStyle(c).display !== 'none'; }, SEL.timerChip), // (fixed elements have no offsetParent)
  chipText: (p) => p.evaluate((s) => document.querySelector(s).innerText.replace(/\s+/g, ' ').trim(), SEL.timerChip),
};

/* A suite: ok(cond, label, detail) records a check; watch(page) collects page errors and console errors;
   finish(browser) closes the browser, prints the summary and sets the exit code. */
function suite() {
  let fails = 0;
  const errs = [];
  return {
    errs,
    ok(cond, label, detail) {
      if (!cond) fails++;
      console.log(cond ? 'ok  ' : 'FAIL', label, detail === undefined ? '' : JSON.stringify(detail));
      return !!cond;
    },
    watch(page, { warnings = false } = {}) {
      page.on('pageerror', (e) => errs.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' || (warnings && m.type() === 'warning')) errs.push(m.text()); });
    },
    async finish(browser) {
      this.ok(errs.length === 0, 'no console errors', errs.length ? errs : undefined);
      console.log(fails ? `\n${fails} FAILED` : '\nall passed');
      await browser.close();
      process.exit(fails ? 1 : 0);
    },
  };
}

/* Replace the saved state with a small routine, so tests with timers are short. */
const seed = (p, state) => p.evaluate((s) => localStorage.setItem('flute-journey', JSON.stringify(s)), state);

module.exports = { chromium, BASE, OUT, launch, SEL, act, suite, seed };
