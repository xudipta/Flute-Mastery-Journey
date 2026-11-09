/* Home: the scale, the tanpura and the taal in one panel, and the sheets they open. (Issue #26, rebuilt in the redesign.)
   One screen, nothing cut off; one tap starts the tanpura; the scale changes in two taps; the taal runs alongside; every
   control stays in step with the keyboard shortcuts, the now-playing bar and persisted settings. */
const { BASE, launch, suite } = require('./lib');
(async () => {
  const b = await launch(); const t = suite();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); t.watch(p, { warnings: true });
  await p.goto(BASE + '/'); await p.waitForTimeout(600);
  const $ = (sel) => p.locator(sel);
  const q = (fn, a) => p.evaluate(fn, a);
  const settings = () => q(() => ({ sa: FluteApp.settings.sa, taal: FluteApp.settings.taal, bpm: FluteApp.settings.bpm, first: FluteApp.settings.tanpuraFirst, speed: FluteApp.settings.tanpuraSpeed, fine: FluteApp.settings.tanpuraFine, dvol: FluteApp.settings.droneVol, tvol: FluteApp.settings.tablaVol }));
  const settled = () => p.waitForFunction(() => !FluteApp.drone.tuning(), null, { timeout: 8000 });
  const sheetOpen = (id) => q((i) => document.querySelector(i).open, id);

  // --- first visit: Home is the tanpura and taal page; the old hero, intro and tools bar are gone
  t.ok((await q(() => FluteNav.current())) === 'home', 'first visit lands on Home');
  t.ok(await q(() => ['#hero-intro', '#hero-sa', '#hero-start', '#show-intro', '#page-title', '.hero', '#dock', '#pill-sa', '#drone-toggle', '#dock-tabla', '#sa-select'].every((s) => !document.querySelector(s))), 'no hero, intro or old tools bar left');
  t.ok((await $('#view-home h1').textContent()) === 'Tanpura and taal', 'Home has a heading for screen readers');
  t.ok((await $('#home-sa-name').textContent()) === 'D' && (await $('#home-sa-freq').textContent()) === '146.8 Hz', 'default scale is D, 146.8 Hz');
  t.ok(!(await q(() => !document.querySelector('#mini').hidden)), 'the now-playing bar is hidden while nothing plays');

  // --- everything fits on one screen above the tab bar, on small and normal phones
  for (const [w, h] of [[360, 740], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
    const fit = await q(() => ({ end: Math.round(document.querySelector('.home-hint').getBoundingClientRect().bottom), tab: Math.round(document.querySelector('.tabbar').getBoundingClientRect().top), scrolls: document.documentElement.scrollHeight > innerHeight }));
    t.ok(fit.end <= fit.tab && !fit.scrolls, `${w}x${h}: the whole panel is above the tab bar, no scrolling`, fit);
  }
  await p.setViewportSize({ width: 360, height: 740 });

  // --- one tap starts the tanpura
  await $('#home-drone').click();
  await p.waitForFunction(() => FluteAudio.Engine.droneOn && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
  t.ok(await q(() => FluteAudio.Engine.droneOn), 'one tap: the tanpura plays');
  await settled();
  t.ok(await q(() => /Stop/.test(document.querySelector('#home-drone').getAttribute('aria-label')) && document.querySelector('#home-drone use').getAttribute('href') === '#i-stop' && /playing/.test(document.querySelector('#home-tp-meta').textContent) && document.querySelector('#home-tanpura').classList.contains('playing')), 'the button becomes Stop and the row says playing');

  // --- two taps change the scale, with no freeze while the drone plays
  await q(() => { window.__gaps = []; window.__long = 0; let last = performance.now(); (function f(tm) { window.__gaps.push(tm - last); last = tm; requestAnimationFrame(f); })(last);
    try { new PerformanceObserver((l) => { window.__long += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  await $('#home-sa-btn').click();
  t.ok(await sheetOpen('#sheet-scale'), 'tap 1 opens the scale sheet');
  t.ok((await q(() => [document.querySelectorAll('#home-sa-grid .sa-opt').length, document.querySelectorAll('#home-sa-grid .sa-group:first-child .sa-opt').length])).join() === '17,5', 'it lists all 17 scales, 5 of them low');
  await $('#home-sa-grid .sa-opt[data-v="4"]').click(); // E
  t.ok(!(await sheetOpen('#sheet-scale')) && (await settings()).sa === 4 && (await $('#home-sa-name').textContent()) === 'E' && (await $('#home-sa-freq').textContent()) === '164.8 Hz', 'tap 2 chooses E: the sheet closes, Sa is E everywhere');
  await settled();
  t.ok(await q(() => FluteAudio.Engine.droneOn), 'the tanpura keeps playing in the new scale');
  await $('#home-sa-next').click(); await $('#home-sa-next').click(); await $('#home-sa-prev').click();
  t.ok((await $('#home-sa-name').textContent()) === 'F' && (await settings()).sa === 5, '◀ ▶ step one semitone each (E, F, F♯, F)');
  await $('#home-sa-btn').click(); await $('#home-sa-grid .sa-opt[data-v="-5"]').click();
  t.ok(await q(() => FluteApp.settings.sa === -5 && document.querySelector('#home-sa-name').textContent === 'G' && !document.querySelector('#home-sa-low').hidden && document.querySelector('#home-sa-prev').disabled), 'the low scale G shows "low" and ◀ is disabled');
  await p.waitForTimeout(900);
  const jank = await q(() => ({ maxGap: Math.round(Math.max(...window.__gaps)), long: window.__long }));
  t.ok(jank.maxGap < 120 && jank.long === 0, 'no freeze while changing scale with the tanpura on (frame gap < 120 ms, no long task)', jank);
  await $('#home-sa-hz').click();
  t.ok(await sheetOpen('#sheet-scale'), 'the caption under the note opens the sheet too');
  await p.keyboard.press('Escape');
  t.ok(!(await sheetOpen('#sheet-scale')) && (await q(() => document.activeElement.id)) === 'home-sa-hz', 'Escape closes it and returns focus to where it came from');
  await $('#home-sa-btn').click(); await p.mouse.click(180, 30);
  t.ok(!(await sheetOpen('#sheet-scale')), 'a tap on the dimmed backdrop closes it');
  await $('#home-sa-btn').click(); await $('#sheet-scale [data-close]').click();
  t.ok(!(await sheetOpen('#sheet-scale')), 'the close button closes it');
  await $('#home-sa-btn').click(); await $('#home-sa-grid .sa-opt[data-v="2"]').click(); // back to D
  await settled();

  // --- the taal runs alongside; the now-playing bar is not shown on Home for sound
  await $('#taal-toggle').click(); await p.waitForTimeout(1500);
  t.ok(await q(() => FluteTransport.running && FluteAudio.Engine.droneOn), 'the taal plays while the tanpura plays');
  const beat = () => q(() => [...document.querySelectorAll('#taal-grid .beat')].indexOf(document.querySelector('#taal-grid .beat.on')));
  const b1 = await beat(); await p.waitForTimeout(1300); const b2 = await beat();
  t.ok(b1 >= 0 && b2 !== b1, 'the beat highlight advances', [b1, b2]);
  t.ok(await q(() => !document.querySelector('#taal-toggle').classList.contains('quiet') && document.querySelector('#taal-toggle use').getAttribute('href') === '#i-stop' && document.querySelector('#mini').hidden), 'the taal button shows Stop, and the now-playing bar stays hidden on Home');

  // --- tempo: − and + (1 BPM), hold to repeat, the ] key (5 BPM), the sheet's slider and tap tempo
  await $('#home-bpm-up').click(); await $('#home-bpm-up').click(); await $('#home-bpm-down').click();
  t.ok((await settings()).bpm === 91 && (await $('#bpm-out').textContent()) === '91', '+ + − changes the tempo by a net 1 (91)');
  await p.keyboard.press(']');
  t.ok((await $('#bpm-out').textContent()) === '96', 'the ] key adds 5 BPM');
  const box = await $('#home-bpm-up').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(1100); await p.mouse.up();
  const held = (await settings()).bpm; t.ok(held > 100, 'holding + keeps raising the tempo', held);
  await $('#home-taal-btn').click();
  t.ok(await sheetOpen('#sheet-taal') && (await q(() => document.querySelector('#bpm').value)) === String((await settings()).bpm), 'the taal and tempo sheet opens with the slider at the current tempo');
  await q(() => { window.__t = []; document.querySelector('#home-tap').addEventListener('click', () => __t.push(performance.now()), true); });
  for (let i = 0; i < 5; i++) { await $('#home-tap').click(); await p.waitForTimeout(500); }
  const tapped = (await settings()).bpm;
  const expected = await q(() => { const l = __t.slice(-6); return 60000 / ((l[l.length - 1] - l[0]) / (l.length - 1)); });
  t.ok(Math.abs(tapped - expected) <= 1, 'tap tempo equals the average of the real tap gaps (within 1 BPM)', { tapped, expected: Math.round(expected * 10) / 10 });
  await p.waitForTimeout(2200); await $('#home-tap').click();
  t.ok((await settings()).bpm === tapped, 'a pause of 2 s starts tap tempo again (one tap changes nothing)');
  await q(() => { const s = document.querySelector('#bpm'); s.value = 120; s.dispatchEvent(new Event('input', { bubbles: true })); });
  t.ok((await settings()).bpm === 120 && (await $('#bpm-out').textContent()) === '120' && Math.abs((await q(() => FluteTransport.bpm)) - 120) < 0.5, 'the slider sets the tempo and the transport follows');

  // --- every taal: the list, the beat grid (rows of up to 8, bar lines, marks)
  const names = await q(() => FluteApp.taals());
  t.ok((await q(() => document.querySelectorAll('#taal-list .row').length)) === 6, 'six taals are listed');
  const wantBeats = [16, 6, 8, 10, 12, 7];
  for (let i = 0; i < names.length; i++) {
    await q((n) => document.querySelector(`#taal-list .row[data-name="${n}"]`).click(), names[i]);
    const g = await q(() => ({ cells: document.querySelectorAll('#taal-grid .beat').length, cols: getComputedStyle(document.querySelector('#taal-grid')).gridTemplateColumns.split(' ').length, bars: document.querySelectorAll('#taal-grid .beat.vs').length, marks: [...document.querySelectorAll('#taal-grid .beat u')].map((u) => u.textContent).filter(Boolean).join(''), title: document.querySelector('#home-taal-title').textContent, beats: document.querySelector('#home-taal-beats').textContent, sel: document.querySelectorAll('#taal-list .row.sel').length, overflow: document.documentElement.scrollWidth > innerWidth }));
    t.ok(g.cells === wantBeats[i] && g.cols === Math.min(g.cells <= 8 ? g.cells : Math.ceil(g.cells / 2), 8) && g.title === names[i].split(' · ')[0] && g.beats === `${wantBeats[i]} beats` && g.sel === 1 && !g.overflow, `${names[i]}: ${wantBeats[i]} beats in ${g.cols} columns, list and title agree, no overflow`, g);
  }
  const tg = await q(() => { const n = FluteApp.taalName(); return { n, vs: document.querySelectorAll('#taal-grid .beat.vs').length }; });
  t.ok(tg.n.startsWith('Rupak') && tg.vs === 2, 'Rupak (3+2+2) has two inner bar lines', tg);
  await q(() => document.querySelector('#taal-list .row[data-name^="Teentaal"]').click());
  t.ok(await q(() => { const m = [...document.querySelectorAll('#taal-grid .beat u')].map((u) => u.textContent).filter(Boolean).join(''); return m === '✕2○3' && document.querySelectorAll('#taal-grid .beat.vs').length === 2 && FluteTransport.running; }), 'Teentaal: sam ✕, tali 2 and 3, khali ○, a bar line at each inner section, and the taal kept playing through the changes');
  await $('#sheet-taal [data-close]').click();
  await $('#taal-toggle').click();
  t.ok(await q(() => !FluteTransport.running && FluteAudio.Engine.droneOn && document.querySelector('#taal-toggle').classList.contains('quiet')), 'Stop stops the taal and leaves the tanpura playing');

  // --- tuning and sound: first string, pluck speed, fine tune, volumes; persisted
  await $('#home-tuning-btn').click();
  t.ok(await sheetOpen('#sheet-tuning'), 'the tuning and sound sheet opens');
  await $('#home-first [data-v="Ni"]').click(); await $('#home-speed [data-v="fast"]').click();
  await q(() => { const f = document.querySelector('#home-fine'); f.value = 12; f.dispatchEvent(new Event('input', { bubbles: true })); const v = document.querySelector('#sheet-dvol'); v.value = 140; v.dispatchEvent(new Event('input', { bubbles: true })); const tv = document.querySelector('#tabla-vol'); tv.value = 60; tv.dispatchEvent(new Event('input', { bubbles: true })); });
  let s = await settings();
  t.ok(s.first === 'Ni' && s.speed === 'fast' && s.fine === 12 && s.dvol === 140 && s.tvol === 60, 'first string, speed, fine tune and both volumes are saved', s);
  t.ok((await $('#home-fine-out').textContent()) === '+12¢' && (await $('#sheet-dvol-out').textContent()) === '140%' && (await $('#tabla-vol-out').textContent()) === '60%' && (await $('#home-tuning-sum').textContent()) === 'Ni · +12¢', 'readouts and the summary on the row show them');
  t.ok((await q(() => document.querySelector('#home-dvol').value)) === '140' && /Ni · Fast/.test(await $('#home-tp-meta').textContent()), 'the volume slider on the tanpura row and its meta line follow');
  t.ok((await q(() => [document.querySelector('#home-first [aria-checked="true"]').dataset.v, document.querySelector('#home-speed [aria-checked="true"]').dataset.v].join())) === 'Ni,fast', 'the segmented controls show the choice');
  await $('#home-first [aria-checked="true"]').focus(); await p.keyboard.press('ArrowLeft');
  t.ok((await settings()).first === 'Ma', 'arrow keys move through the first-string choices');
  await $('#home-fine-reset').click();
  t.ok((await settings()).fine === 0 && (await $('#home-fine-out').textContent()) === '0¢' && await q(() => document.querySelector('#home-fine-reset').disabled), 'Reset puts fine tune back to 0');
  await $('#sheet-dvol').dblclick();
  t.ok((await settings()).dvol === 100, 'double-click puts a volume back to 100%');
  await $('#tabla-vol-reset').click();
  t.ok((await settings()).tvol === 100, 'Reset puts the tabla volume back to 100%');
  await p.keyboard.press('Escape');
  t.ok(!(await sheetOpen('#sheet-tuning')), 'Escape closes the sheet');

  // --- Hear Sa
  await $('#home-hear-sa').click();
  t.ok((await $('#home-hear-sa').textContent()).includes('Stop') && (await q(() => document.querySelector('#home-hear-sa use').getAttribute('href'))) === '#i-stop', 'Hear Sa plays (the button says Stop)');
  await $('#home-hear-sa').click();
  t.ok((await $('#home-hear-sa').textContent()).includes('Hear Sa'), 'a second tap stops it');

  // --- keyboard shortcuts drive the Home controls; the tuner's quiet() and restore() too
  await p.keyboard.press('t'); await p.waitForTimeout(300);
  t.ok(await q(() => !FluteAudio.Engine.droneOn && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'false'), 'T stops the tanpura and Home shows Play');
  await p.keyboard.press('t'); await p.waitForTimeout(500);
  t.ok(await q(() => FluteAudio.Engine.droneOn && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'true'), 'T starts it again');
  await p.keyboard.press('b'); await p.waitForTimeout(400);
  t.ok(await q(() => FluteTransport.running && document.querySelector('#taal-toggle').getAttribute('aria-pressed') === 'true'), 'B starts the taal');
  await q(() => { window.__q = FluteApp.quiet(); });
  t.ok(await q(() => !FluteAudio.Engine.droneOn && !FluteTransport.running && document.querySelector('#home-drone').getAttribute('aria-pressed') === 'false'), 'quiet() pauses both, and Home follows');
  await q(() => window.__q.restore()); await p.waitForTimeout(500);
  t.ok(await q(() => FluteAudio.Engine.droneOn && FluteTransport.running), 'restore() brings both back');

  // --- the now-playing bar: on every other tab, with a stop button that stops sound
  await p.click('.tabbar a[data-view="ragas"]'); await p.waitForTimeout(300);
  const mini = await q(() => ({ shown: !document.querySelector('#mini').hidden, title: document.querySelector('#mini-title').textContent, sub: document.querySelector('#mini-sub').textContent, stop: !document.querySelector('#mini-stop').hidden }));
  t.ok(mini.shown && /^Tanpura · D$/.test(mini.title) && /^Teentaal · \d+ BPM$/.test(mini.sub) && mini.stop, 'on another tab the now-playing bar shows the tanpura and the taal', mini);
  await $('#mini-open').click(); await p.waitForTimeout(300);
  t.ok((await q(() => FluteNav.current())) === 'home', 'tapping its text goes back to Home');
  await p.click('.tabbar a[data-view="learn"]'); await p.waitForTimeout(300);
  await $('#mini-stop').click(); await p.waitForTimeout(300);
  t.ok(await q(() => !FluteAudio.Engine.droneOn && !FluteTransport.running && document.querySelector('#mini').hidden), 'its stop button stops the tanpura and the taal, and the bar goes away');

  // --- persistence across reload
  const before = await settings();
  await p.reload(); await p.waitForTimeout(700);
  const after = await settings();
  t.ok(JSON.stringify([before.sa, before.taal, before.bpm, before.first, before.speed]) === JSON.stringify([after.sa, after.taal, after.bpm, after.first, after.speed]), 'settings survive a reload', after);
  t.ok((await $('#home-sa-name').textContent()) === 'D' && (await $('#bpm-out').textContent()) === String(after.bpm) && (await $('#home-taal-title').textContent()) === after.taal.split(' · ')[0] && (await q(() => document.querySelector('#home-first [aria-checked="true"]').dataset.v)) === after.first, 'Home shows the saved values');

  // --- the Today card and stats are on Practice, above the cards
  await q(() => FluteNav.go('practice'));
  t.ok(await q(() => { const td = document.querySelector('#today'), h = document.querySelector('#practice .pc-carousel'); return !td.hidden && td.getBoundingClientRect().top < h.getBoundingClientRect().top && !!document.querySelector('#view-practice .stats'); }), 'the Today card is at the top of Practice');
  t.ok(/Start today/.test(await $('#t-go').textContent()), 'Today says start (nothing done)', await $('#t-go').textContent());
  await p.goto(BASE + '/#practice'); await p.waitForTimeout(500);
  t.ok(await q(() => { const r = document.querySelector('#today').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.bottom > 0; }), 'a #practice link lands with the Today card on screen');

  // --- layout at every width
  for (const w of [360, 390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 800 }); await q(() => FluteNav.go('home')); await p.waitForTimeout(250);
    t.ok(await q(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${w} px`);
  }
  await t.finish(b);
})();
