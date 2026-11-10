const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8800').replace(/\/$/, ''); // the app under test
const S = process.argv[2] || require('os').tmpdir(); // screenshots go here
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = []; let fails = 0;
  const ok = (cond, label, extra) => { if (!cond) fails++; console.log((cond ? 'ok  ' : 'FAIL'), label, extra === undefined ? '' : JSON.stringify(extra)); };
  async function fresh(vp, hash) {
    const ctx = await b.newContext({ viewport: vp || { width: 375, height: 740 } });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(BASE + '/' + (hash || ''));
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    return p;
  }
  const state = (p) => p.evaluate(() => ({ view: FluteNav.current(), visible: [...document.querySelectorAll('.view')].filter((v) => !v.hidden).map((v) => v.dataset.view), hash: location.hash, tab: [...document.querySelectorAll('.tabbar a[aria-current]')].map((a) => a.dataset.view), focus: document.activeElement && (document.activeElement.textContent || '').trim().slice(0, 24) }));
  const inView = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; }, sel);

  // --- deep links: every hash opens the right view and shows the right section
  const deep = { '': ['home', null], '#home': ['home', null], '#top': ['home', null], '#practice': ['practice', null], '#routine': ['practice', null], '#progress': ['practice', '#progress'], '#alankar': ['alankar', null], '#ragas': ['ragas', null], '#learn': ['learn', null], '#tuner': ['learn', '#tuner'], '#fingering': ['learn', '#fingering'], '#roadmap': ['learn', '#roadmap'], '#techniques': ['learn', '#techniques'], '#tabla': ['home', null] };
  for (const [h, [view, sec]] of Object.entries(deep)) {
    const p = await fresh(null, h); await p.waitForTimeout(150);
    const s = await state(p);
    ok(s.view === view && s.visible.length === 1 && s.visible[0] === view, `deep link "${h || '(none)'}" -> ${view}`, { visible: s.visible });
    if (sec) { const top = await p.evaluate((sec) => Math.round(document.querySelector(sec).getBoundingClientRect().top), sec); ok(top < 200 && top > -20, `  scrolled to ${sec}`, top); }
    await p.context().close();
  }

  // --- tabs, Back/Forward, scroll restore, focus
  const p = await fresh(null, '');
  // every view is a direct child of <main>: a view left unclosed would nest the next ones inside it, and they would
  // all disappear together with it
  ok(await p.evaluate(() => { const v = [...document.querySelectorAll('.view')]; return v.length === 5 && v.every((e) => e.parentElement.id === 'main'); }), 'the five views are siblings inside <main>');
  for (const v of ['practice', 'alankar', 'ragas', 'learn', 'home']) {
    await p.click(`.tabbar a[data-view="${v}"]`); await p.waitForTimeout(80);
    const s = await state(p); ok(s.view === v && s.hash === '#' + v && s.tab[0] === v, `tab ${v}`, { focus: s.focus });
  }
  await p.click('.tabbar a[data-view="ragas"]'); await p.evaluate(() => scrollTo(0, 500)); const y = await p.evaluate(() => scrollY);
  await p.click('.tabbar a[data-view="practice"]'); await p.waitForTimeout(80);
  ok((await p.evaluate(() => scrollY)) === 0, 'new tab opens at its own position (practice at top)');
  await p.click('.tabbar a[data-view="ragas"]'); await p.waitForTimeout(80);
  ok(Math.abs((await p.evaluate(() => scrollY)) - y) < 3, 'ragas scroll position restored', { saved: y, now: await p.evaluate(() => scrollY) });
  await p.click('.tabbar a[data-view="ragas"]'); await p.waitForTimeout(80);
  ok((await p.evaluate(() => scrollY)) === 0, 'tapping the open tab scrolls to top');
  await p.goBack(); await p.waitForTimeout(100); ok((await state(p)).view === 'practice', 'Back -> practice');
  await p.goBack(); await p.waitForTimeout(100); const sb = await state(p); ok(sb.view !== 'practice', 'Back again moves on through history', sb.view);
  await p.goForward(); await p.waitForTimeout(100); ok((await state(p)).view === 'practice', 'Forward works');

  // --- in-page links and shortcuts
  await p.goto(BASE + '/#home'); await p.waitForTimeout(100);
  await p.evaluate(() => localStorage.setItem('flute-journey', JSON.stringify({ settings: { onboarded: true } }))); await p.reload(); await p.waitForTimeout(150);
  ok(!(await p.isVisible('#today')), 'the Today card is no longer on Home');
  await p.click('.tabbar a[data-view="practice"]'); await p.waitForTimeout(100);
  ok(await p.isVisible('#today') && await p.isVisible('#today #minutes') && await p.isVisible('#today .pc-streak'), 'the Today summary (minutes and streak) is at the top of Practice');
  await p.click('#t-ragas'); await p.waitForTimeout(100); ok((await state(p)).view === 'ragas' && (await p.textContent('#raga-count')).includes('of 23'), 'Today card "Ragas for now" -> ragas, filtered', await p.textContent('#raga-count'));
  await p.click('.tabbar a[data-view="practice"]'); await p.click('#t-go'); await p.waitForTimeout(300);
  let s = await state(p); ok(s.view === 'practice' && (await p.textContent('.pc-card.active .pc-toggle')) === 'Pause', 'Today card Continue -> practice, timer running', { label: await p.textContent('#timer-label') });
  ok((await inView(p, '.routine li.active')) === true, 'the active block is scrolled into view');
  // the now-playing bar carries the timer to every tab
  await p.click('.tabbar a[data-view="learn"]'); await p.waitForTimeout(100);
  ok(await p.isVisible('#mini'), 'the now-playing bar shows the running timer on another tab');
  await p.click('#mini-open'); await p.waitForTimeout(600);
  s = await state(p); ok(s.view === 'practice' && (await inView(p, '.pc-card.active')) === true, 'tapping the now-playing bar -> practice with the timer card in view', s.focus);
  ok((await p.evaluate(() => document.activeElement.classList.contains('pc-toggle'))) === true, '  focus on Start/Pause');
  await p.click('.pc-card.active .pc-toggle');
  // slash shortcut
  await p.click('.tabbar a[data-view="home"]'); await p.keyboard.press('/'); await p.waitForTimeout(150);
  ok((await state(p)).view === 'ragas' && (await p.evaluate(() => document.activeElement.id)) === 'raga-search', '"/" -> ragas search focused');
  await p.click('.tabbar a[data-view="practice"]');
  for (const id of ['breath', 'sa', 'alankar', 'raga', 'taal', 'cool']) await p.check(`.routine li[data-id="${id}"] input`);
  ok(await p.isVisible('#done-msg'), 'done message shows');
  await p.click('#done-ragas'); await p.waitForTimeout(100); ok((await state(p)).view === 'ragas', 'done message: ragas for this time of day');
  await p.click('.tabbar a[data-view="practice"]'); await p.click('#done-msg a[href="#tuner"]'); await p.waitForTimeout(100);
  s = await state(p); ok(s.view === 'learn' && (await inView(p, '#tuner-toggle')) === true, 'done message: tuner -> learn, tuner in view', s.view);
  await p.click('.tabbar a[data-view="practice"]'); await p.click('#add-note'); await p.waitForTimeout(600);
  ok((await state(p)).view === 'practice' && (await p.evaluate(() => document.activeElement.id)) === 'day-note', 'add a note -> note field focused');
  await p.click('footer a[href="#progress"]'); await p.waitForTimeout(100);
  ok((await state(p)).view === 'practice' && (await inView(p, '#progress h2')) === true, 'footer back-it-up link -> practice, progress section');
  await p.focus('.skip'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok((await state(p)).view === 'practice' && (await p.evaluate(() => document.activeElement.tagName)) === 'H1', 'skip link focuses the view heading, keeps the view');

  // --- audio keeps going across tabs
  await p.click('.tabbar a[data-view="home"]'); await p.click('#taal-toggle'); await p.click('#home-drone'); await p.waitForTimeout(1500);
  const beat = () => p.evaluate(() => [...document.querySelectorAll('#taal-grid .beat')].findIndex((e) => e.classList.contains('on')));
  const b1 = await beat(); await p.click('.tabbar a[data-view="learn"]'); await p.waitForTimeout(1300); await p.click('.tabbar a[data-view="home"]'); const b2 = await beat();
  ok(b1 >= 0 && b2 >= 0 && b2 !== b1, 'tabla beat highlight kept advancing while on another tab', { b1, b2 });
  ok(await p.evaluate(() => FluteApp.tabla.on() && FluteAudio.Engine.droneOn), 'tabla and tanpura still on');
  await p.click('#taal-toggle'); await p.click('#home-drone');

  // --- no horizontal overflow on any tab at 360 px
  const q = await fresh({ width: 360, height: 740 }, '');
  for (const v of ['home', 'practice', 'alankar', 'ragas', 'learn']) {
    await q.click(`.tabbar a[data-view="${v}"]`); await q.waitForTimeout(80);
    const w = await q.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(w[0] <= w[1], `360px: no sideways scroll on ${v}`, w);
    await q.screenshot({ path: S + `/nav-${v}-360.png` });
  }
  // desktop: top nav shows five links and marks the open one
  const d = await fresh({ width: 1280, height: 800 }, '#ragas');
  ok(await d.evaluate(() => [...document.querySelectorAll('.site-header nav a')].map((a) => a.textContent + (a.getAttribute('aria-current') ? '*' : '')).join(',')) === 'Home,Practice,Alankar,Ragas*,Learn', 'desktop top nav');
  ok(!(await d.isVisible('.tabbar')), 'desktop: bottom tab bar hidden');
  // tuner never listens out of sight (fake mic)
  console.log('errors:', errs); await b.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
