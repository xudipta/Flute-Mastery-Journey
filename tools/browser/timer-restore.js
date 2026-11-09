/* A block under way survives a reload: still running, paused, or finished while the page was closed. (Issue #18.) */
const { BASE, launch, SEL, act, suite, seed } = require('./lib');
(async () => {
  const b = await launch(); const t = suite();
  const p = await b.newPage({ viewport: { width: 375, height: 740 } }); t.watch(p, { warnings: true });
  await p.goto(BASE + '/#practice');
  await seed(p, { settings: { onboarded: true, routine: [{ id: 'breath', min: 2, on: true }, { id: 'sa', min: 2, on: true }] } });
  await p.reload();
  const st = async () => ({
    time: await p.evaluate((s) => (document.querySelector(s) || {}).textContent, SEL.cardTime),
    label: await p.evaluate(() => document.querySelector('#timer-label').textContent),
    toggle: await p.evaluate((s) => (document.querySelector(s) || {}).textContent, SEL.cardToggle),
    chip: await act.chipVisible(p),
    ticked: await p.evaluate(() => [...document.querySelectorAll('.routine li input')].map((i) => i.checked)),
    active: await p.evaluate(() => (document.querySelector('.routine li.active') || { dataset: {} }).dataset.id || null),
    saved: await p.evaluate(() => JSON.parse(localStorage.getItem('flute-journey')).timer || null),
  });

  await p.click(SEL.runAll); await p.waitForTimeout(2200);
  await p.reload(); await p.waitForTimeout(600);
  let s = await st();
  t.ok(/still running/.test(s.label) && /Pause/.test(s.toggle) && s.chip && s.saved && s.saved.endAt, 'running, then reload: it carries on', s);
  const t1 = (await st()).time; await p.waitForTimeout(1100);
  t.ok((await st()).time !== t1, 'and it keeps counting down');

  await p.click(SEL.cardToggle); await p.waitForTimeout(200);
  const pausedAt = (await st()).time;
  await p.reload(); await p.waitForTimeout(1500);
  s = await st();
  t.ok(/paused/.test(s.label) && /Start/.test(s.toggle) && s.time === pausedAt && s.saved && s.saved.remaining, 'paused, then reload: it comes back paused with the same time left', { pausedAt, ...s });

  // finished while the page was closed: move the saved end time into the past
  await p.click(SEL.cardToggle); await p.waitForTimeout(200);
  await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('flute-journey')); x.timer.endAt = Date.now() - 5000; localStorage.setItem('flute-journey', JSON.stringify(x)); });
  await p.reload(); await p.waitForTimeout(600);
  s = await st();
  t.ok(s.ticked[0] === true && s.ticked[1] === false && s.active === 'sa' && s.saved === null && /finished while you were away/.test(s.label) && !s.chip, 'finished while away: ticked off, next block lined up (not started)', s);

  await p.click(SEL.cardToggle); await p.waitForTimeout(300); await p.click(SEL.cardReset); await p.waitForTimeout(200);
  t.ok((await st()).saved === null, 'reset clears the saved timer');

  await p.click(SEL.cardToggle); await p.waitForTimeout(300);
  await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('flute-journey')); x.timer.date = '2020-01-01'; localStorage.setItem('flute-journey', JSON.stringify(x)); });
  await p.reload(); await p.waitForTimeout(400);
  s = await st();
  t.ok(!s.chip && s.saved === null && /Pick a block/.test(s.label), 'a timer saved on an earlier day is dropped', { chip: s.chip, saved: s.saved, label: s.label });
  await t.finish(b);
})();
