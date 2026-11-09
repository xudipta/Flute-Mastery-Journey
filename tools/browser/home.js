const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8800').replace(/\/$/, ''); // the app under test
let fails = 0;
const ok = (name, cond, extra) => { if (!cond) fails++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
  await p.goto(BASE + '/'); await p.waitForTimeout(600);
  const $ = (sel) => p.locator(sel);
  const q = (fn, a) => p.evaluate(fn, a);
  const settings = () => q(() => ({ sa: FluteApp.settings.sa, taal: FluteApp.settings.taal, bpm: FluteApp.settings.bpm, first: FluteApp.settings.tanpuraFirst, speed: FluteApp.settings.tanpuraSpeed, fine: FluteApp.settings.tanpuraFine, dvol: FluteApp.settings.droneVol, onboarded: FluteApp.settings.onboarded }));

  // --- first-time visitor: no intro, Home is the Tanpura and Taal page
  ok('first visit lands on Home', (await q(() => FluteNav.current())) === 'home');
  ok('no hero / intro / old ids left', (await q(() => ['#hero-intro', '#hero-sa', '#hero-start', '#show-intro', '#page-title', '.hero'].every((s) => !document.querySelector(s)))));
  ok('Home heading is h1 "Tanpura & Taal"', (await $('#view-home h1').textContent()) === 'Tanpura & Taal');
  ok('default scale shown is D', (await $('#home-sa-name').textContent()) === 'D');

  // --- one tap starts the tanpura
  await $('#home-drone').click();
  await p.waitForFunction(() => FluteAudio.Engine.droneOn && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
  ok('one tap: tanpura playing', await q(() => FluteAudio.Engine.droneOn));
  ok('Home button says Stop (or Tuning) and tools-bar button agrees', await q(() => /Stop|Tuning/.test(document.querySelector('#home-drone').textContent) && document.querySelector('#drone-toggle').getAttribute('aria-pressed') === 'true'));
  await p.waitForFunction(() => !document.querySelector('#home-drone').classList.contains('tuning'), null, { timeout: 5000 });
  ok('settled: button reads Stop', (await $('#home-drone .play-txt').textContent()) === 'Stop');

  // --- two taps change the scale, with no freeze while the drone is playing
  await q(() => { window.__gaps = []; window.__long = 0; let last = performance.now(); (function f(t) { window.__gaps.push(t - last); last = t; requestAnimationFrame(f); })(last);
    try { new PerformanceObserver((l) => { window.__long += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  await $('#home-sa-btn').click();
  ok('tap 1 opens the scale grid', await $('#home-sa-grid').isVisible());
  ok('grid has all 17 scales, 5 of them low', (await q(() => [document.querySelectorAll('#home-sa-grid .sa-opt').length, document.querySelectorAll('#home-sa-grid .sa-group:first-child .sa-opt').length])).join() === '17,5');
  await $('#home-sa-grid .sa-opt[data-v="4"]').click();   // E
  ok('tap 2 chose E: grid closed, Sa = E everywhere', await q(() => document.querySelector('#home-sa-grid').hidden && FluteApp.settings.sa === 4 && document.querySelector('#home-sa-name').textContent === 'E' && document.querySelector('#pill-sa-name').textContent === 'E' && document.querySelector('#sa-select').value === '4'));
  await p.waitForFunction(() => !document.querySelector('#home-drone').classList.contains('tuning'), null, { timeout: 5000 });
  ok('drone kept playing in the new scale', await q(() => FluteAudio.Engine.droneOn));
  await $('#home-sa-next').click(); await $('#home-sa-next').click(); await $('#home-sa-prev').click();
  ok('◀ ▶ step one semitone each (E -> F -> F♯ -> F)', (await $('#home-sa-name').textContent()) === 'F' && (await settings()).sa === 5);
  await $('#home-sa-btn').click(); await $('#home-sa-grid .sa-opt[data-v="-5"]').click();
  ok('low scale G (low): Sa = -5, ◀ disabled', await q(() => FluteApp.settings.sa === -5 && /low/.test(document.querySelector('#home-sa-name').textContent) && document.querySelector('#home-sa-prev').disabled));
  await p.waitForTimeout(900);
  const jank = await q(() => ({ maxGap: Math.round(Math.max(...window.__gaps)), long: window.__long }));
  ok('no freeze while changing scale with the drone on (max frame gap < 120 ms, no long task > 50 ms)', jank.maxGap < 120 && jank.long === 0, jank);
  await $('#home-sa-btn').click(); await p.keyboard.press('Escape');
  ok('Escape closes the grid and returns focus to the scale button', await q(() => document.querySelector('#home-sa-grid').hidden && document.activeElement.id === 'home-sa-btn'));
  await $('#home-sa-btn').click(); await p.mouse.click(180, 20);
  ok('clicking elsewhere closes the grid', await q(() => document.querySelector('#home-sa-grid').hidden));
  await $('#home-sa-btn').click(); await $('#home-sa-grid .sa-opt[data-v="2"]').click(); // back to D
  await p.waitForFunction(() => !document.querySelector('#home-drone').classList.contains('tuning'), null, { timeout: 5000 });

  // --- taal runs alongside the tanpura
  await $('#taal-toggle').click(); await p.waitForTimeout(1500);
  ok('taal plays while the tanpura plays', await q(() => FluteTransport.running && FluteAudio.Engine.droneOn));
  const beats1 = await q(() => document.querySelector('#taal-grid .beat.on') && [...document.querySelectorAll('#taal-grid .beat')].indexOf(document.querySelector('#taal-grid .beat.on')));
  await p.waitForTimeout(1300);
  const beats2 = await q(() => [...document.querySelectorAll('#taal-grid .beat')].indexOf(document.querySelector('#taal-grid .beat.on')));
  ok('beat highlight advances', beats1 !== null && beats2 !== beats1, [beats1, beats2]);
  ok('dock tabla button agrees', (await $('#dock-tabla').getAttribute('aria-pressed')) === 'true');

  // --- tempo: -/+ (1 BPM), hold to repeat, tap tempo, sync with the tools bar
  await $('#home-bpm-up').click(); await $('#home-bpm-up').click(); await $('#home-bpm-down').click();
  ok('+ + − changes tempo by net +1 (91) and the tools bar shows it', (await settings()).bpm === 91 && (await $('#dock-bpm').textContent()) === '91' && (await $('#bpm-out').textContent()) === '91');
  await q(() => document.querySelector('#bpm-up').click());
  ok('tools-bar + (5 BPM) shows on Home too', (await $('#bpm-out').textContent()) === '96' && (await q(() => document.querySelector('#bpm').value)) === '96');
  const box = await $('#home-bpm-up').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(1100); await p.mouse.up();
  const held = (await settings()).bpm; ok('hold + keeps raising the tempo', held > 100, held);
  await q(() => { window.__t = []; document.querySelector('#home-tap').addEventListener('click', () => __t.push(performance.now()), true); });
  for (let i = 0; i < 5; i++) { await $('#home-tap').click(); await p.waitForTimeout(500); }
  const tapped = (await settings()).bpm;
  const expected = await q(() => { const l = __t.slice(-6); return 60000 / ((l[l.length - 1] - l[0]) / (l.length - 1)); });
  ok('tap tempo equals the average of the real tap gaps (within 1 BPM)', Math.abs(tapped - expected) <= 1, { tapped, expected: Math.round(expected * 10) / 10 });
  await p.waitForTimeout(2200); await $('#home-tap').click();
  ok('a pause of 2 s starts tap tempo again (one tap changes nothing)', (await settings()).bpm === tapped);
  ok('transport follows the tempo', Math.abs((await q(() => FluteTransport.bpm)) - tapped) < 0.5);
  await $('#taal-select').selectOption({ index: 1 });
  ok('taal select changes the taal, the tools bar follows', (await settings()).taal === (await $('#taal-select').inputValue()) && (await $('#dock-taal-select').inputValue()) === (await $('#taal-select').inputValue()));
  await $('#taal-toggle').click();
  ok('Stop stops the taal and leaves the tanpura playing', await q(() => !FluteTransport.running && FluteAudio.Engine.droneOn));

  // --- tanpura options stay in sync with the tools bar, both ways, and persist
  await $('#home-first').selectOption('Ni'); await $('#home-speed').selectOption('fast');
  await q(() => { const f = document.querySelector('#home-fine'); f.value = 12; f.dispatchEvent(new Event('input', { bubbles: true })); const v = document.querySelector('#home-dvol'); v.value = 140; v.dispatchEvent(new Event('input', { bubbles: true })); });
  let s = await settings();
  ok('Home -> settings and tools bar (first, speed, fine, volume)', s.first === 'Ni' && s.speed === 'fast' && s.fine === 12 && s.dvol === 140 && (await q(() => [document.querySelector('#tp-first').value, document.querySelector('#tp-speed').value, document.querySelector('#tp-fine').value, document.querySelector('#drone-vol').value].join())) === 'Ni,fast,12,140', s);
  ok('readouts', (await $('#home-fine-out').textContent()) === '+12¢' && (await $('#home-dvol-out').textContent()) === '140%' && (await $('#tp-fine-out').textContent()) === '+12¢' && (await $('#drone-vol-out').textContent()) === '140%');
  await q(() => { const e = document.querySelector('#tp-first'); e.value = 'Ma'; e.dispatchEvent(new Event('input', { bubbles: true })); const f = document.querySelector('#tp-fine'); f.value = -7; f.dispatchEvent(new Event('input', { bubbles: true })); });
  ok('tools bar -> Home', (await $('#home-first').inputValue()) === 'Ma' && (await $('#home-fine').inputValue()) === '-7' && (await $('#home-fine-out').textContent()) === '-7¢');
  await $('#home-fine').dblclick();
  ok('double-click resets fine tune to 0', (await settings()).fine === 0 && (await $('#home-fine-out').textContent()) === '0¢');
  await $('#home-dvol').dblclick();
  ok('double-click resets volume to 100%', (await settings()).dvol === 100);

  // --- Hear Sa
  await $('#home-hear-sa').click();
  ok('Hear Sa plays (button says Stop)', (await $('#home-hear-sa').textContent()) === 'Stop');
  await $('#home-hear-sa').click();
  ok('second tap stops it', (await $('#home-hear-sa').textContent()).includes('Hear Sa'));

  // --- keyboard shortcut still drives the Home button; the tools bar drives it too
  await p.keyboard.press('t'); await p.waitForTimeout(300);
  ok('T stops the tanpura and Home shows Play', await q(() => !FluteAudio.Engine.droneOn && /Play/.test(document.querySelector('#home-drone').textContent)));
  await q(() => document.querySelector('#drone-toggle').click()); await p.waitForTimeout(500);
  ok('tools-bar button starts it and Home shows it', await q(() => FluteAudio.Engine.droneOn && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'true'));
  // tools-bar Sa panel changes Home's scale too
  await q(() => { const s = document.querySelector('#sa-select'); s.value = '7'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  ok('tools-bar Sa select -> Home scale name', (await $('#home-sa-name').textContent()) === 'G');

  // --- tuner Hear Sa / quiet still work with the Home controls
  await q(() => { const r = FluteApp.quiet(); window.__q = r; });
  ok('quiet() pauses the tanpura, Home follows', await q(() => !FluteAudio.Engine.droneOn && /Play/.test(document.querySelector('#home-drone').textContent)));
  await q(() => window.__q.restore()); await p.waitForTimeout(500);
  ok('restore() brings it back', await q(() => FluteAudio.Engine.droneOn));
  await q(() => document.querySelector('#drone-toggle').click());

  // --- persistence across reload
  const before = await settings();
  await p.reload(); await p.waitForTimeout(700);
  const after = await settings();
  ok('settings survive a reload', JSON.stringify([before.sa, before.taal, before.bpm, before.first]) === JSON.stringify([after.sa, after.taal, after.bpm, after.first]), after);
  ok('Home shows the saved values', (await $('#home-sa-name').textContent()) === 'G' && (await $('#home-first').inputValue()) === after.first && (await $('#taal-select').inputValue()) === after.taal && (await $('#bpm-out').textContent()) === String(after.bpm));

  // --- Today card and stats now live on Practice and always show
  await q(() => FluteNav.go('practice'));
  ok('Today card visible at the top of Practice, no intro mode', await q(() => { const t = document.querySelector('#today'), h = document.querySelector('#practice .pc-carousel'); return !t.hidden && t.getBoundingClientRect().top < h.getBoundingClientRect().top && !!document.querySelector('#view-practice .stats'); }));
  ok('Today says start (nothing done)', /Start today/.test(await $('#t-go').textContent()), await $('#t-go').textContent());

  // --- a #practice link (and the manifest shortcut) lands with the Today card on screen
  await p.goto(BASE + '/#practice'); await p.waitForTimeout(500);
  ok('#practice deep link lands on the Today card (not scrolled past it)', await q(() => { const r = document.querySelector('#today').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.bottom > 0; }));

  // --- layout
  for (const w of [360, 390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 800 }); await q(() => FluteNav.go('home')); await p.waitForTimeout(250);
    ok(`no horizontal overflow at ${w}px`, await q(() => document.documentElement.scrollWidth <= innerWidth));
  }
  ok('two columns on desktop', await q(() => getComputedStyle(document.querySelector('.home-grid')).gridTemplateColumns.split(' ').length === 2));
  console.log('console errors/warnings:', errs);
  ok('no console errors', errs.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  await b.close(); process.exit(fails ? 1 : 0);
})();
