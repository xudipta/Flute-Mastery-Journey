/* The small usability fixes of issue #19: undo toast, done message, the tuner pausing the accompaniment, and the
   practice calendar. */
const { BASE, OUT, launch, SEL, act, suite, seed } = require('./lib');
(async () => {
  const b = await launch(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']); const t = suite();
  const ctx = await b.newContext({ viewport: { width: 375, height: 740 }, permissions: ['microphone'] });
  const p = await ctx.newPage(); t.watch(p);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto(BASE + '/#practice');
  await seed(p, { settings: { onboarded: true } });
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await p.reload(); await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const box = (id) => `.routine li[data-id="${id}"] input`;

  // undo after unticking a block
  await p.check(box('breath')); await p.uncheck(box('breath'));
  t.ok(await p.isVisible('#toast') && /Unticked/.test(await p.textContent('#toast-text')) && (await p.textContent('#minutes')) === '0', 'unticking shows an Undo message and takes the minutes off');
  await p.screenshot({ path: OUT + '/toast.png' });
  await p.click('#toast-undo');
  t.ok(await p.isChecked(box('breath')) && (await p.textContent('#minutes')) === '5' && !(await p.isVisible('#toast')), 'Undo restores the tick and the minutes');

  // done message offers next steps
  for (const id of ['sa', 'alankar', 'raga', 'taal', 'cool', 'breath']) await p.check(box(id));
  const done = (await p.textContent('#done-msg')).replace(/\s+/g, ' ');
  t.ok(/Ragas for this time of day/.test(done) && /tuner/.test(done), 'a finished routine suggests ragas and the tuner', done.trim());
  await p.click('#done-ragas'); await p.waitForTimeout(900);
  const count = await p.textContent('#raga-count');
  t.ok((await p.evaluate(() => FluteNav.current())) === 'ragas', 'the ragas link opens the Ragas tab');
  t.ok(/^\d+ of 23 ragas$/.test(count) && !/^23 of/.test(count), 'and filters to this time of day', count);

  // (volume readouts and resets are checked by home.js; the bottom tools bar and its tucking are gone with the redesign)

  // the tuner pauses tanpura and tabla while it listens, and restores them
  await act.droneToggle(p); await act.taalToggle(p); // both sounds on
  await p.evaluate(() => FluteNav.go('learn', { focus: false })); await p.waitForTimeout(300);
  await p.click('#tuner-toggle'); await p.waitForTimeout(500);
  const pressed = () => p.evaluate(() => ({ tabla: String(FluteApp.tabla.on()), drone: String(FluteApp.drone.on()) }));
  let pr = await pressed();
  t.ok(pr.tabla === 'false' && pr.drone === 'false' && /come back on/.test(await p.textContent('#tuner-msg')), 'the tuner pauses tanpura and tabla while listening, and says so', pr);
  await p.click('#tuner-ref'); await p.waitForTimeout(400);
  t.ok(/Paused while Sa plays/.test(await p.textContent('#tuner-sub')), 'readings pause while Hear Sa plays');
  await p.click('#tuner-toggle'); await p.waitForTimeout(300);
  pr = await pressed();
  t.ok(pr.tabla === 'true' && pr.drone === 'true', 'stopping the tuner brings them back', pr);
  await act.taalToggle(p); await act.droneToggle(p);

  // calendar: future days disabled, one tab stop, arrow keys, Enter keeps focus
  await p.evaluate(() => FluteNav.go('practice', { focus: false })); await p.waitForTimeout(250);
  const cal = await p.evaluate(() => { const days = [...document.querySelectorAll('#cal-grid [data-k]')], t0 = new Date(), last = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate(); return { future: days.filter((d) => d.disabled).length, expectFuture: last - t0.getDate(), tabbable: days.filter((d) => d.tabIndex === 0).map((d) => d.dataset.k), today: document.querySelector('.cal-day.today').dataset.k }; });
  t.ok(cal.future === cal.expectFuture, 'future days in the calendar are disabled', cal);
  t.ok(cal.tabbable.length === 1 && cal.tabbable[0] === cal.today, 'the calendar has one tab stop, on today', cal);
  await p.focus('#cal-grid [tabindex="0"]');
  await p.keyboard.press('ArrowLeft');
  const left = await p.evaluate(() => document.activeElement.dataset.k);
  t.ok(left < cal.today, 'arrow left moves to the previous day', left);
  await p.keyboard.press('Home'); const home = await p.evaluate(() => document.activeElement.dataset.k);
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const sel = await p.evaluate(() => ({ focus: document.activeElement.dataset.k, selected: (document.querySelector('.cal-day.sel') || { dataset: {} }).dataset.k }));
  t.ok(sel.focus === home && sel.selected === home, 'Home goes to the start of the week; Enter selects it and keeps focus', sel);

  t.ok((await p.evaluate(() => document.querySelectorAll('.term, .term-wrap').length)) === 0, 'no glossary terms are left in the text');
  await t.finish(b);
})();
