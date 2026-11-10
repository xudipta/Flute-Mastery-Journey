/* A running practice timer is visible from every tab (a chip, plus the tab title), and tapping it returns to the
   running card. (Issue #17.) */
const { BASE, OUT, launch, SEL, act, suite } = require('./lib');
(async () => {
  const b = await launch(); const t = suite();
  for (const vp of [{ width: 360, height: 740 }, { width: 375, height: 740 }, { width: 1280, height: 800 }]) {
    const w = vp.width + ' px: ';
    const p = await b.newPage({ viewport: vp }); t.watch(p);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(BASE + '/#practice'); await p.waitForTimeout(500);
    const title0 = await p.title();
    t.ok(!(await act.chipVisible(p)), w + 'no timer chip before a block starts');
    await p.click(SEL.runAll); await p.waitForTimeout(1300);
    const txt = await act.chipText(p);
    t.ok(await act.chipVisible(p) && /\d\d:\d\d/.test(txt), w + 'chip shows the time left', txt);
    t.ok((await p.title()).startsWith('⏱'), w + 'the tab title shows the timer', await p.title());
    t.ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), w + 'no sideways overflow');
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; FluteNav.go('ragas', { focus: false }); });
    await p.waitForTimeout(300);
    t.ok(await act.chipVisible(p), w + 'chip is still there on another tab');
    if (vp.width === 375) await p.screenshot({ path: OUT + '/chip-ragas.png' });
    await p.click(SEL.timerChip); await p.waitForTimeout(900);
    const back = await p.evaluate(([card, bar]) => { const r = document.querySelector(card).getBoundingClientRect(), top = document.querySelector(bar).getBoundingClientRect().top; return { view: FluteNav.current(), inView: r.top >= 0 && r.bottom <= top }; }, [SEL.cardTime, SEL.bottomBar]);
    t.ok(back.view === 'practice' && back.inView, w + 'tapping it returns to the running card, above the bottom bar', back);
    if (vp.width === 375) await p.screenshot({ path: OUT + '/chip-tapped.png' });
    await p.click(SEL.cardToggle); await p.waitForTimeout(300);
    t.ok((await p.title()).startsWith('⏸'), w + 'paused: the title shows the pause sign', await p.title());
    await p.click(SEL.cardReset); await p.waitForTimeout(300);
    t.ok(!(await act.chipVisible(p)) && (await p.title()) === title0, w + 'reset: chip gone, title back to normal', await p.title());
    await p.close();
  }
  await t.finish(b);
})();
