#!/usr/bin/env node
/* Browser test of the Alankar tab (needs `playwright`, and the site served somewhere).
   It records every tabla hit and melody note the page schedules (audio-clock times), then checks:
   a pattern stays on the taal's beats for 60+ s of audio, tempo and laya changes while playing leave no gap and no
   double beat, the speed trainer raises the tempo on schedule, switching tabs does not stop it, and stopping is silent.
   Run:  python3 -m http.server 8796   (in the repo)
         BASE=http://localhost:8800 node tools/check-alankar-browser.js [screenshot-folder]   (about 100 s)
   Exits 1 on any failure. Screenshots (360 px, light and dark) are written to the folder when one is given. */
const { chromium } = require('playwright');
const path = require('path');
const BASE = (process.env.BASE || 'http://localhost:8800').replace(/\/$/, '');
const SHOTS = process.argv[2] || '';
let failed = 0, total = 0;
const check = (name, ok, detail) => { total++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ' (' + detail + ')' : ''}`); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, colorScheme: 'light' });
  const p = await ctx.newPage();
  const problems = [];
  p.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(m.type() + ': ' + m.text()); });
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const wait = (ms) => p.waitForTimeout(ms);
  const bpmNow = () => p.evaluate(() => FluteApp.bpm());
  // The sheets (Scale, Taal and beat, More) are dialogs: open one by its button, close it with Escape.
  const openSheet = async (btn) => { await p.click(btn); await wait(450); };
  const closeSheet = async () => { await p.keyboard.press('Escape'); await wait(450); };
  const playerStopped = () => p.evaluate(() => document.querySelector('#al-play').getAttribute('aria-pressed') === 'false');
  const reset = () => p.evaluate(() => { __hits.length = 0; __notes.length = 0; });
  const grab = () => p.evaluate(() => ({ hits: __hits.slice().sort((a, b) => a.when - b.when), notes: __notes.map((n) => ({ t: n.t, f: n.f, dur: n.dur })).sort((a, b) => a.t - b.t) }));
  const expectedFreqs = () => p.evaluate(() => {
    const c = FluteApp.settings.alankar, A = ALANKAR;
    const b = A.build(A.patterns.find((x) => x.id === c.pattern), A.scales.find((x) => x.id === c.scale));
    return b.tokens.map((t) => FluteAudio.Engine.saHz * 2 * Math.pow(2, FluteDemo.parseSwar(t).a / 12));
  });

  await p.goto(BASE + '/#alankar'); await wait(700);
  check('Alankar tab opens from #alankar', await p.evaluate(() => FluteNav.current() === 'alankar'));
  check('18 pattern cards and a notation for the first one', (await p.locator('.al-card').count()) === 18 && (await p.locator('.al-n').count()) === 16);
  check('no sideways scroll at 360 px', !(await overflow()));
  await shot('01-top-light-360');

  // Count every scheduled tabla hit and melody note (the transport calls these on the engine at schedule time).
  await p.evaluate(() => {
    const E = FluteAudio.Engine; window.__hits = []; window.__notes = [];
    const hit = E.hit.bind(E); E.hit = (bol, when, spb, bus) => { __hits.push({ bol, when, spb, at: E.ctx.currentTime, hidden: document.hidden }); return hit(bol, when, spb, bus); };
    const line = E.line.bind(E); E.line = (events, bus, t0) => { events.forEach((e) => __notes.push({ t: t0 + e.start, f: e.f, dur: e.dur, bus })); return line(events, bus, t0); };
    // note when each audio bus is cut, to tell whether notes already handed to the clock are silenced by Stop
    const mk = E.bus.bind(E); E.bus = (kind) => { const b = mk(kind), stop = b.stop.bind(b); b.stop = () => { if (b.stoppedAt === undefined) b.stoppedAt = E.ctx.currentTime; return stop(); }; return b; };
  });

  // ----- tanpura on, then 60+ s of a straight run over Teentaal -----
  await p.click('#al-drone'); await wait(300);
  check('tanpura toggle switches the real tanpura', (await p.evaluate(() => FluteApp.drone.on())) === true && (await p.getAttribute('#al-drone', 'aria-pressed')) === 'true');
  await reset();
  await p.click('#al-play'); await wait(500);
  check('Play starts the tabla (Home and the now-playing bar show it)', (await p.evaluate(() => FluteApp.tabla.on())) === true);
  check('the player shows Stop while playing, and the sticky player is not a modal', (await p.getAttribute('#al-play', 'aria-label')) === 'Stop' && !(await p.evaluate(() => !!document.querySelector('dialog[open]'))));
  check('the selected row says Playing', (await p.textContent('.al-card.sel .al-beats')) === 'Playing');
  check('the now-playing bar steps aside on this tab (the player has the same controls)', !(await p.evaluate(() => !document.querySelector('#mini').hidden)));
  check('the player sits right on top of the tab bar, no overlap', await p.evaluate(() => { const d = document.querySelector('#al-dock').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect(); return Math.abs(d.bottom - t.top) <= 1; }));
  check('the notation lights the note being played', (await p.locator('.al-n.now').count()) === 1);
  // the finger chart (in the More sheet) follows the notes while they play
  await openSheet('#al-more');
  check('the finger chart is lit while playing (More sheet)', (await p.locator('#al-chart .key.on, #al-chart .key.halfring').count()) >= 1);
  await closeSheet();
  await wait(60800);
  let g = await grab(), spb = 60 / 90, f0 = await expectedFreqs();
  const span = g.hits[g.hits.length - 1].when - g.hits[0].when;
  check('60+ s of audio scheduled', span >= 60, span.toFixed(1) + ' s, ' + g.hits.length + ' beats');
  check('first note lands on sam (the first tabla beat)', near(g.notes[0].t, g.hits[0].when, 0.001), ((g.notes[0].t - g.hits[0].when) * 1000).toFixed(3) + ' ms');
  const beatDt = g.hits.slice(1).map((h, i) => h.when - g.hits[i].when);
  check('beats are evenly spaced (no gap, no double beat)', beatDt.every((d) => near(d, spb, 0.0005)), 'worst ' + Math.max(...beatDt.map((d) => Math.abs(d - spb) * 1000)).toFixed(3) + ' ms');
  const hitTimes = g.hits.map((h) => h.when);
  check('every note is exactly on a beat', g.notes.every((n) => hitTimes.some((t) => near(t, n.t, 0.001))));
  const noteDt = g.notes.slice(1).map((n, i) => n.t - g.notes[i].t);
  check('notes are evenly spaced across round boundaries (gapless loop)', noteDt.every((d) => near(d, spb, 0.0005)), g.notes.length + ' notes, ' + (g.notes.length / f0.length).toFixed(1) + ' rounds');
  check('the notes are the pattern, round after round', g.notes.every((n, i) => near(n.f / f0[i % f0.length], 1, 1e-6)) && g.notes.length >= 4 * f0.length);
  check('notes keep sounding through the tabla beats', g.notes.length >= g.hits.length - 2, g.notes.length + ' notes / ' + g.hits.length + ' beats');
  await shot('02-playing-light-360');

  // ----- switching tabs does not stop it -----
  await reset();
  await p.click('.tabbar a[data-view="ragas"]'); await wait(2500);
  check('still playing on another tab', (await p.evaluate(() => FluteAlankar.playing && FluteTransport.running)) && (await p.evaluate(() => FluteNav.current())) === 'ragas');
  check('the now-playing bar shows on another tab', await p.evaluate(() => !document.querySelector('#mini').hidden));
  g = await grab(); check('notes and beats keep coming on another tab', g.hits.length >= 3 && g.notes.length >= 3, g.hits.length + ' beats');
  await p.click('.tabbar a[data-view="alankar"]'); await wait(400);
  check('the player still shows Stop when back', (await p.getAttribute('#al-play', 'aria-label')) === 'Stop' && !(await p.evaluate(() => !document.querySelector('#mini').hidden)));

  // ----- change tempo while playing -----
  await reset();
  for (let i = 0; i < 10; i++) { await p.click('#al-faster'); await wait(150); }
  await wait(3000);
  check('tempo changed to 100', (await bpmNow()) === 100);
  g = await grab(); const dts = g.hits.slice(1).map((h, i) => h.when - g.hits[i].when);
  check('tempo change: no gap and no double beat', dts.every((d) => d >= 0.6 - 0.001 && d <= 60 / 90 + 0.001), 'min ' + Math.min(...dts).toFixed(4) + ' max ' + Math.max(...dts).toFixed(4));
  check('tempo change: beat spacing only ever gets shorter', dts.every((d, i) => i === 0 || d <= dts[i - 1] + 0.0005));
  check('tempo change: the melody follows the beats', g.notes.every((n) => g.hits.some((h) => near(h.when, n.t, 0.001))));
  check('tempo change: the notes carry on in order', g.notes.every((n, i) => i === 0 || n.t > g.notes[i - 1].t));

  // ----- change notes per beat while playing -----
  await reset();
  await p.click('#al-laya [data-v="2"]'); await wait(4500); // ~13 notes at 90 BPM: leaves room for a busy machine
  g = await grab(); spb = 60 / (await bpmNow());
  const tail = g.notes.slice(2), tdt = tail.slice(1).map((n, i) => n.t - tail[i].t);
  check('2 notes per beat: spacing is half a beat', tdt.length > 8 && tdt.every((d) => near(d, spb / 2, 0.0006)), 'worst ' + Math.max(...tdt.map((d) => Math.abs(d - spb / 2) * 1000)).toFixed(3) + ' ms');
  check('2 notes per beat: every note is on a beat or half a beat after one', tail.every((n) => g.hits.some((h) => near(h.when, n.t, 0.001)) || g.hits.some((h) => near(h.when + spb / 2, n.t, 0.001))));
  check('a tempo set by hand during play is kept when you stop (trainer off)', await (async () => { await p.click('#al-play'); await wait(300); return (await bpmNow()) === 100; })());

  // ----- speed trainer: 4 notes per beat, +5 BPM every round up to 110 -----
  await p.click('#al-laya [data-v="4"]');
  await p.evaluate(() => { FluteApp.setBpm(90); });
  await openSheet('#al-more');                                   // the speed trainer's settings are in the More sheet
  await p.check('#al-tr-on'); await p.fill('#al-tr-step', '5'); await p.fill('#al-tr-every', '1'); await p.fill('#al-tr-target', '110');
  await p.dispatchEvent('#al-tr-target', 'change');
  check('the Trainer chip follows the checkbox', (await p.getAttribute('#al-trainer-chip', 'aria-pressed')) === 'true');
  await closeSheet();
  check('stopped before the trainer run', !(await p.evaluate(() => FluteAlankar.playing)));
  await p.evaluate(() => FluteApp.setBpm(90));
  await p.click('#al-play');
  const seen = [];
  for (let i = 0; i < 80; i++) { await wait(250); const b = await bpmNow(); if (!seen.length || seen[seen.length - 1] !== b) seen.push(b); if (b >= 110 && i > 20) break; }
  check('trainer raised the tempo 90 -> 110 in steps of 5', JSON.stringify(seen) === JSON.stringify([90, 95, 100, 105, 110]), seen.join(' > '));
  await wait(3500);
  check('trainer stays at the target', (await bpmNow()) === 110);
  check('status mentions the target', /target of 110/.test(await p.textContent('#al-status')), await p.textContent('#al-status'));
  await p.click('#al-play'); await wait(300);
  check('stopping puts the tempo back to where it started', (await bpmNow()) === 90);
  check('status says how far you got', /reached 110/.test(await p.textContent('#al-status')), await p.textContent('#al-status'));
  check('tanpura goes on after Stop', (await p.evaluate(() => FluteApp.drone.on())) === true);
  check('the tabla this tab started is off after Stop', (await p.evaluate(() => FluteApp.tabla.on())) === false);
  await p.click('#al-trainer-chip');                              // the chip turns the trainer off again
  check('the Trainer chip switches the trainer off', (await p.getAttribute('#al-trainer-chip', 'aria-pressed')) === 'false' && !(await p.evaluate(() => FluteApp.settings.alankar.trainer.on)));

  // ----- each round on sam: 4 notes per beat at 240 BPM, a 37-note pattern (9.25 beats) -> 16 beats between rounds -----
  await p.evaluate(() => FluteApp.setBpm(240));
  await openSheet('#al-more'); await p.click('#al-align [data-v="sam"]'); await closeSheet();
  await reset();
  await p.click('.al-card[data-id="threes"]');                    // tapping a card plays it
  await wait(9000);
  g = await grab();
  const starts = g.notes.filter((n, i) => i === 0 || n.t - g.notes[i - 1].t > 0.5).map((n) => n.t);
  spb = 60 / 240;
  check('tapping a card played it', g.notes.length > 20, g.notes.length + ' notes');
  check('rounds start on sam: 16 beats apart', starts.length >= 2 && starts.slice(1).every((t, i) => near(t - starts[i], 16 * spb, 0.001)), starts.length + ' rounds, ' + starts.slice(1).map((t, i) => (t - starts[i]).toFixed(3)).join(' '));
  check('round start is a tabla beat', starts.every((t) => g.hits.some((h) => near(h.when, t, 0.001))));
  await p.click('#al-play'); await wait(300);

  // ----- click only: no tabla, a click on every beat -----
  await p.evaluate(() => FluteApp.setBpm(90));
  await p.click('.al-card[data-id="sapaat"]'); await wait(200); await p.click('#al-play');   // stop what the card started
  await openSheet('#al-taal-btn'); await p.click('#al-beat [data-v="click"]'); await closeSheet();   // beat sound lives in the Taal and beat sheet
  check('the Tabla chip is off in click mode', (await p.getAttribute('#al-tabla', 'aria-pressed')) === 'false');
  await reset();
  await p.click('#al-play'); await wait(3500);
  g = await grab(); spb = 60 / (await bpmNow());
  check('click mode: the tabla stays off', (await p.evaluate(() => FluteApp.tabla.on())) === false);
  check('click mode: a click on every beat', g.hits.length >= 4 && g.hits.every((h) => h.bol === 'Ta' || h.bol === 'Ti'), g.hits.map((h) => h.bol).slice(0, 6).join(' '));
  check('click mode: notes on the beats or quarter beats (4 notes a beat)', g.notes.length >= 8 && g.notes.every((n) => g.hits.some((h) => { const k = (n.t - h.when) / (spb / 4); return k > -0.01 && k < 3.01 && near(k, Math.round(k), 0.006); })), g.notes.length + ' notes');
  // Read the audio clock inside the page at the moment of the click: the click can be delayed by the page's smooth scroll back up to Play.
  await p.evaluate(() => document.addEventListener('click', () => { window.__clickAt = FluteAudio.Engine.ctx.currentTime; }, { capture: true, once: true }));
  await p.click('#al-play'); const stopAt = await p.evaluate(() => window.__clickAt); await wait(2500);
  g = await grab();
  const lateBeats = g.hits.filter((h) => h.when >= stopAt + 0.3);
  check('stopping is silent: no new beats are scheduled', lateBeats.length === 0, 'last beat ' + (g.hits[g.hits.length - 1].when - stopAt).toFixed(3) + ' s after Stop' + (lateBeats.length ? '; late: ' + lateBeats.map((h) => `${(h.when - stopAt).toFixed(2)}s (scheduled ${(h.at - stopAt).toFixed(2)}s, hidden=${h.hidden})`).join(', ') : ''));
  const late = await p.evaluate((at) => __notes.filter((n) => n.t > at + 0.1 && !(n.bus && n.bus.stoppedAt !== undefined && n.bus.stoppedAt <= n.t)).length, stopAt);
  check('stopping is silent: notes already handed to the audio clock are cut', late === 0, late + ' notes would still sound');
  check('click mode: the beat grid stops with it', !(await p.evaluate(() => FluteTransport.running)));

  // ----- settings are remembered; today's block can be ticked -----
  await p.click('#al-tabla');                                     // the Tabla chip turns the tabla back on (beat sound: tabla)
  check('the Tabla chip is on again', (await p.getAttribute('#al-tabla', 'aria-pressed')) === 'true' && (await p.evaluate(() => FluteApp.settings.alankar.beat)) === 'tabla');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('flute-journey')).settings.alankar);
  check('settings saved (pattern, laya, beat, align)', saved.pattern === 'sapaat' && saved.laya === 4 && saved.beat === 'tabla' && saved.align === 'sam', JSON.stringify({ p: saved.pattern, l: saved.laya, b: saved.beat, a: saved.align }));
  await p.reload(); await wait(800);
  check('settings come back after a reload', (await p.getAttribute('#al-laya [data-v="4"]', 'aria-pressed')) === 'true' && (await p.getAttribute('#al-align [data-v="sam"]', 'aria-pressed')) === 'true' && (await p.textContent('#al-title')) === 'Straight run');
  check('the "count towards today" button shows', await p.isVisible('#al-mark'));
  await p.click('#al-mark');
  check('ticking the block works', (await p.isVisible('#al-marked')) && (await p.evaluate(() => FluteApp.blockState('alankar') === 'done' && FluteApp.state().checks.alankar === true)));

  // ----- the Scale and Taal sheets (nothing is playing now) -----
  await openSheet('#al-scale-btn');
  check('the scale sheet lists every scale and marks the current one', (await p.locator('#al-scale-list .row').count()) === (await p.evaluate(() => ALANKAR.scales.length)) && (await p.getAttribute('#al-scale-list .row.sel', 'data-id')) === 'shuddha');
  await p.click('#al-scale-list .row[data-id="kalyan"]'); await wait(500);
  check('choosing a scale closes the sheet and changes the notes', !(await p.evaluate(() => !!document.querySelector('dialog[open]'))) && (await p.textContent('#al-scale-name')) === 'Kalyan' && /\bMa♯/.test(await p.textContent('.al-card[data-id="sapaat"] .al-prev')), await p.textContent('.al-card[data-id="sapaat"] .al-prev'));
  await openSheet('#al-scale-btn'); await p.click('#al-scale-list .row[data-id="shuddha"]'); await wait(500);
  await openSheet('#al-taal-btn');
  await p.click('#al-taal-list .row[data-name^="Dadra"]'); await wait(500);
  check('choosing a taal closes the sheet; Home has the same taal', (await p.textContent('#al-taal-name')) === 'Dadra · 6' && (await p.evaluate(() => FluteApp.taalName())).startsWith('Dadra') && !(await p.evaluate(() => !!document.querySelector('dialog[open]'))));
  await openSheet('#al-taal-btn'); await p.click('#al-taal-list .row[data-name^="Teentaal"]'); await wait(500);
  check('the player names scale, tanpura and taal', /^Shuddha · tanpura (on|off) · Teentaal$/.test(await p.textContent('#al-sub')), await p.textContent('#al-sub'));

  // ----- layout and themes -----
  await p.evaluate(() => window.scrollTo(0, 800)); await wait(300);
  await shot('03-patterns-light-360');
  check('no sideways scroll (light, scrolled)', !(await overflow()));
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.emulateMedia({ colorScheme: 'dark' }); await wait(200);
  await p.click('.al-card[data-id="cross"]'); await wait(1500);
  await shot('04-playing-dark-360');
  await p.evaluate(() => window.scrollTo(0, 900)); await wait(300);
  await shot('05-controls-dark-360');
  check('no sideways scroll (dark, playing)', !(await overflow()));
  await p.click('#al-play'); await wait(300);                     // the player's own Stop
  check('Stop in the player stops the pattern at once', await playerStopped() && !(await p.evaluate(() => FluteAlankar.playing)));
  check('the selected row stops saying Playing', (await p.textContent('.al-card.sel .al-beats')) !== 'Playing');
  const big = await ctx.newPage(); await big.setViewportSize({ width: 1280, height: 900 }); await big.emulateMedia({ colorScheme: 'dark' });
  await big.goto(BASE + '/#alankar'); await big.waitForTimeout(700);
  check('no sideways scroll at 1280 px', !(await big.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const box = await big.evaluate(() => { const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; }; return { fields: r('.al-fields'), list: r('.al-list'), dock: r('.al-dock') }; });
  check('fields and list are the same width at 1280 px, and the player spans them', box.fields.w === box.list.w && box.dock.l <= box.list.l && box.dock.r >= box.list.r && box.dock.r <= 1280, JSON.stringify(box));
  if (SHOTS) await big.screenshot({ path: path.join(SHOTS, '06-desktop-dark-1280.png') });
  await big.close();

  check('no console errors or warnings', problems.length === 0, problems.slice(0, 3).join(' | '));
  console.log(`\n${total - failed}/${total} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
