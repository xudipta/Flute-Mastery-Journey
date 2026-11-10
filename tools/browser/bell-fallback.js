/* When the audio clock stalls (a suspended page) while the timer runs out, the scheduled bell is cancelled and the
   bell rings as soon as the timer notices the block is over. (Issue #16.) */
const { BASE, launch, SEL, suite, seed } = require('./lib');
(async () => {
  const b = await launch(); const t = suite();
  const p = await b.newPage(); t.watch(p);
  await p.goto(BASE + '/#practice');
  await seed(p, { settings: { onboarded: true, routine: [{ id: 'breath', min: 1, on: true }] } });
  await p.reload();
  await p.evaluate(() => { const E = FluteAudio.Engine; window.__rings = []; const ring = E.ring.bind(E); E.ring = (at) => { const r = ring(at); const rec = { asked: at === undefined ? 'now' : 'scheduled', cancelled: false }; __rings.push(rec); const c = r.cancel; r.cancel = () => { rec.cancelled = true; c(); }; return r; }; });
  await p.click(SEL.runAll); await p.waitForTimeout(300);
  // the audio clock stops while wall-clock time moves on 61 s
  await p.evaluate(async () => { await FluteAudio.Engine.ctx.suspend(); const real = Date.now; Date.now = () => real() + 61000; });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ rings: __rings, ticked: document.querySelector('.routine li input').checked, label: document.querySelector('#timer-label').textContent }));
  t.ok(r.rings.length === 2 && r.rings[0].asked === 'scheduled' && r.rings[0].cancelled, 'the early scheduled bell is cancelled', r.rings);
  t.ok(r.rings[1] && r.rings[1].asked === 'now' && !r.rings[1].cancelled, 'a bell rings straight away instead');
  t.ok(r.ticked && /done/.test(r.label), 'the block is ticked off', r.label);
  await t.finish(b);
})();
