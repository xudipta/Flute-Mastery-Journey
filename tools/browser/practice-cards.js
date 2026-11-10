const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8800').replace(/\/$/, ''); // the app under test
const OUT = process.argv[2] || require('os').tmpdir(); // screenshots go here
const URL = BASE + '/';
let fails = 0;
const ok = (c, msg, extra) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  async function page(vp, opts = {}) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 700, colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
    return p;
  }
  const S = (p) => p.evaluate(() => ({ idx: PracticeCards.index(), cur: document.querySelector('.pc-card.is-current')?.dataset.id, count: document.querySelector('#pc-count').textContent, overflow: document.documentElement.scrollWidth > innerWidth }));
  const swipe = async (p, dx) => { // real touch events: the browser does the scrolling and snapping itself
    const cdp = await p.context().newCDPSession(p);
    const box = await p.locator('.pc-card.is-current').boundingBox();
    const y = Math.round(Math.min(Math.max(box.y, 90) + 70, 560)), x0 = dx < 0 ? 330 : 40, steps = 8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= steps; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / steps, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(800);
  };
  const seed = (p, o) => p.evaluate((o) => localStorage.setItem('flute-journey', JSON.stringify(o)), o);
  const row = (p, id) => p.locator(`.routine li[data-id="${id}"]`);

  // ---------- 1. swipe, buttons, keys, dots ----------
  let p = await page({ width: 375, height: 740 });
  await p.goto(URL); await seed(p, { settings: { onboarded: true } }); await p.goto(URL + '#practice'); await p.waitForTimeout(600);
  let s = await S(p); ok(s.idx === 0 && s.count === '1 of 6', 'opens on the first block', s);
  await swipe(p, -260); s = await S(p); ok(s.idx === 1 && s.cur === 'sa', 'touch swipe left -> next card', s);
  await swipe(p, -260); s = await S(p); ok(s.idx === 2, 'second swipe -> third card', s);
  await swipe(p, 260); s = await S(p); ok(s.idx === 1, 'touch swipe right -> previous card', s);
  await p.click('#pc-next'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 2, 'next button', s);
  await p.click('#pc-prev'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 1, 'prev button', s);
  await p.focus('.pc-card.is-current .pc-toggle'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 2, 'ArrowRight from a card button', s);
  await p.keyboard.press('End'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 5, 'End -> last card', s);
  await p.keyboard.press('Home'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 0, 'Home -> first card', s);
  await p.click('.pc-dot >> nth=3'); await p.waitForTimeout(600); s = await S(p); ok(s.idx === 3, 'dot jumps to block 4', s);
  ok(await p.locator('#pc-prev').isEnabled() && await p.locator('#pc-next').isEnabled(), 'prev/next enabled mid-way');
  await p.click('.pc-dot >> nth=5'); await p.waitForTimeout(600); ok(await p.locator('#pc-next').isDisabled(), 'next disabled on the last card');
  ok(!s.overflow, 'no sideways page scroll (375)');
  const labels = await p.evaluate(() => [...document.querySelectorAll('.pc-card')].map((c) => c.getAttribute('aria-label')));
  ok(labels.length === 6 && labels[2] === 'Alankars / paltas, 3 of 6', 'slides are labelled', labels[2]);

  // ---------- 2. a running timer keeps running while swiping away ----------
  await p.click('.pc-dot >> nth=1'); await p.waitForTimeout(600);
  await p.click('.routine li[data-id="sa"] .pc-toggle'); await p.waitForTimeout(1300);
  const run1 = await p.evaluate(() => ({ time: document.querySelector('li[data-id="sa"] .pc-time').textContent, label: document.querySelector('li[data-id="sa"] .pc-toggle').textContent, badge: document.querySelector('li[data-id="sa"] .pc-badge').textContent, chip: document.querySelector('#mini').hidden, statusLabel: document.querySelector('#timer-label').textContent }));
  ok(run1.label === 'Pause' && /Running/.test(run1.badge) && !run1.chip && run1.statusLabel === 'Sur sadhana (long tones)', 'Start on a card runs that block', run1);
  await swipe(p, -260); await swipe(p, -260);
  s = await S(p);
  const run2 = await p.evaluate(() => ({ saTime: document.querySelector('li[data-id="sa"] .pc-time').textContent, saBadge: document.querySelector('li[data-id="sa"] .pc-badge').textContent, otherTime: document.querySelector('li[data-id="alankar"] .pc-time').textContent, otherBtn: document.querySelector('li[data-id="alankar"] .pc-toggle').textContent, dotRunning: document.querySelectorAll('.pc-dot.is-running').length, chip: document.querySelector('#mini-title').textContent.slice(0, 5) }));
  ok(s.idx === 3 && /Running/.test(run2.saBadge) && run2.otherTime === '10:00' && run2.otherBtn === 'Start' && run2.dotRunning === 1, 'swiping away does not stop it; other cards show full length', run2);
  ok(run2.saTime < '10:00' && run2.chip === run2.saTime, 'timer kept counting, chip matches', run2);
  // chip tap returns to the running card
  await p.click('#mini-open'); await p.waitForTimeout(900);
  s = await S(p);
  const vis = await p.evaluate(() => { const r = document.querySelector('li[data-id="sa"] .pc-time').getBoundingClientRect(); return r.top >= 0 && r.bottom <= document.querySelector('.mini').getBoundingClientRect().top; });
  ok(s.idx === 1 && vis, 'chip tap opens the running card with its timer on screen', { idx: s.idx, vis });
  ok(await p.evaluate(() => document.activeElement.classList.contains('pc-toggle') && document.activeElement.closest('li').dataset.id === 'sa'), 'chip tap focuses that card\'s Pause button');
  // pause / reset on the card
  await p.click('li[data-id="sa"] .pc-toggle'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('li[data-id="sa"] .pc-toggle').textContent === 'Resume' && /Paused/.test(document.querySelector('li[data-id="sa"] .pc-badge').textContent)), 'Pause shows Resume + Paused badge');
  // ---------- 3. reload restores the paused timer and its card ----------
  await p.click('.pc-dot >> nth=0'); await p.waitForTimeout(500);
  await p.reload(); await p.waitForTimeout(800);
  s = await S(p);
  const rest = await p.evaluate(() => ({ time: document.querySelector('li[data-id="sa"] .pc-time').textContent, label: document.querySelector('#timer-label').textContent, badge: document.querySelector('li[data-id="sa"] .pc-badge').textContent }));
  ok(s.idx === 1 && /paused/.test(rest.label) && /Paused/.test(rest.badge), 'reload restores the paused timer and opens its card', { s, rest });
  // running + reload
  await p.click('li[data-id="sa"] .pc-toggle'); await p.waitForTimeout(500); await p.click('.pc-dot >> nth=4'); await p.waitForTimeout(500);
  await p.reload(); await p.waitForTimeout(900);
  s = await S(p); ok(s.idx === 1 && await p.evaluate(() => /Running/.test(document.querySelector('li[data-id="sa"] .pc-badge').textContent)), 'reload restores a running timer and opens its card', s);

  // ---------- 4. tick, undo and done state ----------
  await p.click('.pc-dot >> nth=0'); await p.waitForTimeout(500);
  await row(p, 'breath').locator('input').check();
  ok(await row(p, 'breath').evaluate((e) => e.classList.contains('done')) && await p.evaluate(() => document.querySelectorAll('.pc-dot.is-done').length === 1), 'ticking marks the card and its dot done');
  await row(p, 'breath').locator('input').uncheck(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.querySelectorAll('.pc-dot.is-done').length === 0), 'unticking clears the done dot');
  await p.click('#toast-undo'); await p.waitForTimeout(100); ok(await row(p, 'breath').locator('input').isChecked(), 'undo re-ticks it');

  // ---------- 5. routine editor rebuilds the cards ----------
  await p.click('.pc-dot >> nth=5'); await p.waitForTimeout(500);
  await p.click('#edit-routine'); await p.waitForTimeout(200);
  await p.uncheck('#re-list li:nth-child(6) input[type=checkbox]'); await p.click('#re-save'); await p.waitForTimeout(600);
  s = await S(p); ok((await p.locator('.pc-card').count()) === 5 && s.count.endsWith('of 5') && s.idx === 4, 'editing the routine rebuilds the cards and keeps a valid place', s);
  ok(await p.evaluate(() => !!document.querySelector('#mini')), 'editor ok');
  await p.screenshot({ path: OUT + '/after-edit.png' });
  await p.context().close();

  // ---------- 6. Today "Continue" opens the next unticked card ----------
  p = await page({ width: 375, height: 740 });
  await p.goto(URL); const k = new Date(); const day = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`;
  await seed(p, { settings: { onboarded: true }, checks: { breath: true, sa: true }, checkMins: { breath: 5, sa: 10 }, checkDate: day, log: { [day]: { minutes: 15, blocks: ['breath', 'sa'], complete: false, note: '' } } });
  await p.goto(URL + '#practice'); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => FluteNav.go('practice', { top: true })); await p.waitForTimeout(300);
  await p.click('#t-go'); await p.waitForTimeout(1200);
  s = await S(p); ok(s.cur === 'alankar' && await p.evaluate(() => FluteNav.current()) === 'practice' && await p.evaluate(() => /Running/.test(document.querySelector('li[data-id="alankar"] .pc-badge').textContent)), 'Today Continue opens + starts the next unticked card', s);
  await p.context().close();
  // opening Practice cold also lands on the next unticked block
  p = await page({ width: 375, height: 740 });
  await p.goto(URL); await seed(p, { settings: { onboarded: true }, checks: { breath: true, sa: true }, checkMins: { breath: 5, sa: 10 }, checkDate: day, log: { [day]: { minutes: 15, blocks: ['breath', 'sa'], complete: false, note: '' } } });
  await p.goto(URL + '#practice'); await p.reload(); await p.waitForTimeout(800);
  s = await S(p); ok(s.cur === 'alankar', 'first visit to Practice opens the next block to do', s);
  await p.context().close();

  // ---------- 7. layout at widths, light and dark, with screenshots ----------
  for (const [w, h] of [[360, 740], [390, 780], [768, 900], [1280, 800]]) {
    for (const dark of [false, true]) {
      p = await page({ width: w, height: h }, { dark });
      await p.goto(URL); await seed(p, { settings: { onboarded: true } }); await p.goto(URL + '#practice'); await p.waitForTimeout(600);
      await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('.pc-carousel').scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });
      await p.click('.pc-dot >> nth=1'); await p.waitForTimeout(500);
      await p.click('.routine li[data-id="sa"] .pc-toggle'); await p.waitForTimeout(1200);
      const o = await p.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, cardW: Math.round(document.querySelector('.pc-card.is-current').getBoundingClientRect().width), cardH: Math.round(document.querySelector('.pc-card.is-current').getBoundingClientRect().height) }));
      ok(!o.over, `no sideways page scroll ${w}px ${dark ? 'dark' : 'light'}`, o);
      await p.screenshot({ path: `${OUT}/cards-${w}-${dark ? 'dark' : 'light'}.png` });
      await p.context().close();
    }
  }

  // ---------- 8. reduced motion: no animated scrolling ----------
  p = await page({ width: 375, height: 740 }, { reduce: true });
  await p.goto(URL); await seed(p, { settings: { onboarded: true } }); await p.goto(URL + '#practice'); await p.waitForTimeout(500);
  await p.click('#pc-next'); await p.waitForTimeout(80);
  ok((await S(p)).idx === 1 && await p.evaluate(() => { const t = document.querySelector('#routine'); return Math.abs(t.scrollLeft - (document.querySelector('.pc-card.is-current').offsetLeft - parseFloat(getComputedStyle(t).paddingLeft))) < 2; }), 'reduced motion: card changes instantly');
  await p.context().close();

  console.log('console errors/warnings:', errs);
  ok(errs.length === 0, 'no console errors');
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  await b.close();
})();
