/* The screen stays on while a timer, the tanpura or the tabla runs; sound stays steady when the page is
   hidden; the end-of-block bell is scheduled on the audio clock. (Issue #16.) */
const { BASE, launch, SEL, act, suite, seed } = require('./lib');
(async () => {
  const b = await launch(); const t = suite();
  const p = await b.newPage(); t.watch(p);
  await p.addInitScript(() => {
    window.__log = []; let lockN = 0;
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { const id = ++lockN; __log.push('lock+' + id); const l = new EventTarget(); l.release = async () => { __log.push('lock-' + id); l.dispatchEvent(new Event('release')); }; window.__lock = l; return l; } } });
    window.__hidden = false;
    Object.defineProperty(Document.prototype, 'hidden', { get: () => window.__hidden });
    Object.defineProperty(Document.prototype, 'visibilityState', { get: () => window.__hidden ? 'hidden' : 'visible' });
    window.__setHidden = (h) => { window.__hidden = h; if (h && window.__lock) window.__lock.release(); document.dispatchEvent(new Event('visibilitychange')); };
  });
  await p.goto(BASE + '/#practice');
  await seed(p, { settings: { onboarded: true, routine: [{ id: 'breath', min: 1, on: true }, { id: 'sa', min: 1, on: true }] } });
  await p.reload();
  await p.evaluate(() => {
    const E = FluteAudio.Engine;
    window.__hits = []; const hit = E.hit.bind(E); E.hit = (bol, when, spb, bus) => { __hits.push({ when, bus: !!bus }); hit(bol, when, spb, bus); };
    window.__rings = []; const ring = E.ring.bind(E); E.ring = (at) => { const r = ring(at); const rec = { at: r.at, now: E.ctx.currentTime, cancelled: false }; __rings.push(rec); const c = r.cancel; r.cancel = () => { rec.cancelled = true; c(); }; return r; };
  });
  const take = () => p.evaluate(() => __log.splice(0));
  const ahead = (what) => p.evaluate((w) => { const E = FluteAudio.Engine, t = E.ctx.currentTime; return w === 'tabla' ? Math.max(...__hits.map((h) => h.when)) - t : E.droneNext - t; }, what);

  await p.click(SEL.runAll); await p.waitForTimeout(1300); // Reset is only enabled once some time has passed
  let log = await take();
  t.ok(log.includes('lock+1'), 'starting a timer takes the screen wake lock', log);
  const bell = await p.evaluate(() => __rings[0].at - __rings[0].now);
  t.ok(bell > 55 && bell < 61, 'the bell is scheduled on the audio clock for the end of the block', +bell.toFixed(1));
  await p.click(SEL.cardToggle); await p.waitForTimeout(200);
  log = await take();
  t.ok(log.includes('lock-1'), 'pausing releases the lock', log);
  t.ok(await p.evaluate(() => __rings[0].cancelled), 'pausing cancels the scheduled bell');
  await p.click(SEL.cardReset); await p.click(SEL.cardToggle); await p.waitForTimeout(200);
  log = await take();
  t.ok(log.some((x) => x.startsWith('lock+')), 'resuming takes the lock again', log);

  await act.taalToggle(p); await p.waitForTimeout(600);
  t.ok(await p.evaluate(() => __hits.length > 0 && __hits.every((h) => h.bus)), 'tabla hits go through their own bus, so queued beats can be cut');
  await act.droneToggle(p); await p.waitForTimeout(300);
  await p.evaluate(() => __setHidden(true));
  log = await take();
  t.ok(log.some((x) => x.startsWith('lock-')), 'hiding the page drops the lock (as a browser does)', log);
  const tablaAhead = await ahead('tabla'), droneAhead = await ahead('drone');
  t.ok(tablaAhead > 1.5, 'hidden: the tabla is queued seconds ahead', +tablaAhead.toFixed(2));
  t.ok(droneAhead > 1.5, 'hidden: the tanpura is queued seconds ahead', +droneAhead.toFixed(2));
  await p.waitForTimeout(1000);
  await p.evaluate(() => __setHidden(false)); await p.waitForTimeout(100);
  log = await take();
  t.ok(log.some((x) => x.startsWith('lock+')), 'showing the page again takes the lock again', log);

  const before = await p.evaluate(() => __hits.length);
  await act.bpmUp(p); await p.waitForTimeout(2400);
  const gaps = await p.evaluate((n) => { const h = __hits.slice(n).map((x) => x.when); return [...new Set(h.slice(1).map((w, i) => +(w - h[i]).toFixed(3)))]; }, before);
  t.ok(gaps.length === 1 && Math.abs(gaps[0] - 60 / 95) < 0.003, 'a tempo change with beats queued ahead: even beats at the new tempo, no doubles', gaps);

  await act.taalToggle(p); await act.droneToggle(p); await p.waitForTimeout(200);
  log = await take();
  t.ok(!log.some((x) => x.startsWith('lock-')), 'stopping tabla and tanpura keeps the lock while the timer runs', log);
  await p.click(SEL.cardToggle); await p.waitForTimeout(200);
  log = await take();
  t.ok(log.some((x) => x.startsWith('lock-')), 'pausing the timer then releases it', log);
  await t.finish(b);
})();
