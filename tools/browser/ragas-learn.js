/* The Ragas and Learn tabs: the raga list (filters, search, favourites, aroha preview, empty state), the demo sheet, and
   the tuner controls, finger chart, roadmap and techniques. */
const { BASE, OUT, launch, suite, seed } = require('./lib');
(async () => {
  const b = await launch(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']); const t = suite();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  const p = await ctx.newPage(); t.watch(p);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto(BASE + '/');
  await seed(p, { settings: { onboarded: true, sa: 2 } });
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await p.reload();
  const go = async (v) => { await p.evaluate((v) => FluteNav.go(v, { focus: false }), v); await p.waitForTimeout(250); };
  const rows = () => p.locator('#raga-cards .raga-row').count();
  const count = () => p.textContent('#raga-count');
  const names = () => p.evaluate(() => [...document.querySelectorAll('#raga-cards .raga-row b')].map((b) => b.firstChild.textContent.trim()));
  const pictographic = (sel) => p.evaluate((s) => /\p{Extended_Pictographic}/u.test(document.querySelector(s).innerText), sel);
  const hourGroup = () => { const h = new Date().getHours(); return h >= 4 && h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; };

  // ---------- Ragas ----------
  await go('ragas');
  t.ok((await rows()) === 23 && (await count()) === '23 of 23 ragas', 'the list shows all 23 ragas');
  t.ok(!(await pictographic('#view-ragas')), 'no emoji in the Ragas tab');
  t.ok((await p.locator('.raga-row .tile svg use[href="#i-sunrise"]').count()) === 6 && (await p.locator('.raga-row .tile svg use[href="#i-moon"]').count()) === 7, 'rows carry a time-of-day icon', await p.locator('.raga-row .tile svg use').count());
  t.ok((await p.getAttribute('#raga-now', 'aria-label')) === `Ragas for ${hourGroup()}`, 'the header button is named for the time of day', await p.getAttribute('#raga-now', 'aria-label'));
  await p.screenshot({ path: OUT + '/ragas-default.png' });

  await p.click('#raga-filter button[data-v="Evening"]');
  t.ok((await count()) === '6 of 23 ragas' && (await p.getAttribute('#raga-filter button[data-v="Evening"]', 'aria-pressed')) === 'true' && (await names()).includes('Yaman'), 'Evening filters to six ragas');
  await p.click('#raga-flags button[data-kind="starter"]');
  t.ok(JSON.stringify((await names()).sort()) === JSON.stringify(['Bhoopali', 'Hamsadhwani', 'Khamaj', 'Yaman']), 'Starter narrows Evening to four');
  await p.click('#raga-filter button[data-v="All"]'); await p.click('#raga-flags button[data-kind="starter"]');
  await p.fill('#raga-search', 'pentatonic');
  t.ok((await rows()) === 4 && (await names()).includes('Malkauns'), 'search matches the description as well as the name', await names());
  await p.fill('#raga-search', 'zzz');
  t.ok((await rows()) === 0 && (await p.isVisible('.raga-empty')) && (await count()) === '0 of 23 ragas', 'no match shows the empty state');
  await p.screenshot({ path: OUT + '/ragas-empty.png' });
  await p.click('[data-clear]');
  t.ok((await rows()) === 23 && (await p.inputValue('#raga-search')) === '' && (await p.evaluate(() => document.activeElement.id)) === 'raga-search', 'Clear filters resets everything and returns to the search field');

  // favourites
  const star = (n) => `#raga-cards [data-fav="${n}"]`;
  await p.click(star('Bhairav'));
  t.ok((await p.getAttribute(star('Bhairav'), 'aria-pressed')) === 'true' && /Remove Bhairav/.test(await p.getAttribute(star('Bhairav'), 'aria-label')), 'a tap on the star favourites a raga');
  t.ok((await rows()) === 23, 'and does not rebuild the list');
  await p.click('#raga-flags button[data-kind="fav"]');
  t.ok((await rows()) === 1 && (await names())[0] === 'Bhairav', 'Favourites shows only the starred ragas');
  await p.reload(); await go('ragas');
  t.ok((await p.evaluate(() => FluteApp.settings.favs.includes('Bhairav'))), 'favourites survive a reload');
  await p.click(star('Bhairav')); // un-star again (a reload starts with every filter off)

  // aroha preview: the round button turns into stop, and one preview at a time
  const play = (n) => `#raga-cards [data-hear="${n}"]`;
  await p.click(play('Bhoopali')); await p.waitForTimeout(300);
  t.ok((await p.getAttribute(play('Bhoopali'), 'aria-label')) === 'Stop Bhoopali' && (await p.getAttribute(`${play('Bhoopali')} use`, 'href')) === '#i-stop', 'the play button becomes stop while the aroha plays');
  await p.click(play('Yaman')); await p.waitForTimeout(200);
  t.ok((await p.getAttribute(play('Bhoopali'), 'aria-label')) === 'Hear aroha of Bhoopali' && (await p.getAttribute(play('Yaman'), 'aria-label')) === 'Stop Yaman', 'starting another preview resets the first');
  await p.click('#raga-filter button[data-v="Morning"]'); await p.waitForTimeout(150);
  t.ok(await p.evaluate(() => FluteDemo.player.line === null), 'changing the filter stops a running preview');
  t.ok((await p.locator('.raga-row:has(.tag.soon) .play').count()) === 0 && (await p.locator('.raga-row .tag.soon').count()) === 2, 'ragas without notation show "Demo soon" and no play button', await p.locator('.raga-row .tag.soon').count());
  await p.click('#raga-filter button[data-v="All"]');

  // the demo sheet
  await p.click('.raga-open[data-raga="Bhoopali"]'); await p.waitForTimeout(450);
  t.ok(await p.evaluate(() => document.getElementById('demo').open) && (await p.textContent('#demo-title')) === 'Bhoopali' && /Evening raga · thaat Kalyan/.test(await p.textContent('#demo-sub')), 'a row opens the raga sheet');
  t.ok((await p.locator('#demo .facts dt').count()) === 3 && (await p.locator('#demo .nline[data-k="aroha"] .tok').count()) === 6 && /Pentatonic/.test(await p.textContent('#demo .raga-mood')), 'the sheet shows the mood, the facts and the aroha chips');
  await p.screenshot({ path: OUT + '/ragas-sheet.png' });
  await p.click('#demo [data-play="aroha"]'); await p.waitForTimeout(1300);
  t.ok((await p.getAttribute('#demo [data-play="aroha"]', 'aria-pressed')) === 'true' && (await p.locator('#demo .tok.now').count()) === 1, 'aroha plays, lights its button and the current note');
  await p.click('#demo .demo-speed button:has-text("Fast")');
  t.ok((await p.getAttribute('#demo .demo-speed button:has-text("Fast")', 'aria-checked')) === 'true' && (await p.getAttribute('#demo .demo-speed button:has-text("Normal")', 'aria-checked')) === 'false', 'speed is a single choice');
  await p.click('#demo [data-loop]');
  t.ok((await p.getAttribute('#demo [data-loop]', 'aria-pressed')) === 'true', 'loop toggles');
  await p.click('#demo [data-stop]'); await p.waitForTimeout(150);
  t.ok((await p.locator('#demo [data-play][aria-pressed="true"]').count()) === 0 && (await p.locator('#demo .tok.now').count()) === 0, 'stop clears the playing state');
  await p.click('#demo [data-play="both"]'); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  t.ok(!(await p.evaluate(() => document.getElementById('demo').open)) && (await p.evaluate(() => FluteDemo.player.line === null)), 'Escape closes the sheet and the sound stops with it');
  await p.click('.raga-open[data-raga="Lalit"]'); await p.waitForTimeout(450);
  t.ok(/coming soon/.test(await p.textContent('#demo-body')) && /Pre-dawn raga/.test(await p.textContent('#demo .raga-mood')), 'a raga without notation still opens its description');
  await p.click('#demo-close'); await p.waitForTimeout(450);
  t.ok(!(await p.evaluate(() => document.getElementById('demo').open)), 'the close button closes the sheet');

  // ragas for now
  await p.click('#raga-now'); await p.waitForTimeout(250);
  const nowCount = await count();
  t.ok(nowCount !== '23 of 23 ragas' && (await p.getAttribute(`#raga-filter button[data-v="${hourGroup()}"]`, 'aria-pressed')) === 'true', 'the header button filters to this time of day', nowCount);

  // ---------- Learn ----------
  await go('learn');
  t.ok((await p.textContent('#view-learn h1')) === 'Learn' && (await p.locator('.jump a').count()) === 4, 'Learn has a title and four jump links');
  t.ok(!(await pictographic('#view-learn')), 'no emoji in the Learn tab');
  await p.click('.jump a[href="#roadmap"]'); await p.waitForTimeout(350);
  t.ok((await p.evaluate(() => FluteNav.current())) === 'learn' && (await p.evaluate(() => document.getElementById('roadmap').getBoundingClientRect().top)) < 200, 'a jump link scrolls to its section');
  await p.click('.jump a[href="#tuner"]'); await p.waitForTimeout(350);

  // tuner controls
  t.ok((await p.textContent('#tuner-toggle')).trim() === 'Start listening' && (await p.getAttribute('#tuner-toggle use', 'href')) === '#i-mic' && (await p.evaluate(() => document.getElementById('tuner-swar').classList.contains('idle'))), 'the tuner starts idle with a mic button and a placeholder dash');
  await p.click('#tuner-toggle'); await p.waitForTimeout(600);
  t.ok((await p.textContent('#tuner-toggle')).trim() === 'Stop listening' && (await p.getAttribute('#tuner-toggle use', 'href')) === '#i-stop' && (await p.evaluate(() => document.getElementById('tuner-toggle').classList.contains('on'))), 'listening turns it into a stop button');
  await p.hover('#tuner-toggle');
  const hov = await p.evaluate(() => {
    const c = getComputedStyle(document.getElementById('tuner-toggle')), rgb = (v) => v.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const lum = (v) => { const a = rgb(v).map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const x = lum(c.backgroundColor), y = lum(c.color);
    return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
  });
  t.ok(hov >= 4.5, 'and stays readable while hovered (contrast of its label)', hov);
  await p.click('#tuner-toggle'); await p.waitForTimeout(300);
  await p.selectOption('#tuner-target', { label: 'Pa' });
  t.ok((await p.textContent('#tuner-target-val')) === 'Pa', 'the "Aim for" field shows the chosen swar');
  await p.selectOption('#tuner-target', 'auto');

  // finger chart
  await p.evaluate(() => document.getElementById('fingering').scrollIntoView());
  const perRow = () => p.evaluate(() => [...document.querySelectorAll('#note-picker .note-group')].map((g) => [g.querySelectorAll('button').length, g.querySelector('.notes').style.getPropertyValue('--cols')]));
  t.ok(JSON.stringify(await perRow()) === JSON.stringify([[3, '7'], [7, '7'], [4, '7']]), 'the finger chart shows the natural swars by default', await perRow());
  await p.check('#chart-komal');
  t.ok(JSON.stringify(await perRow()) === JSON.stringify([[5, '7'], [12, '6'], [7, '7']]), 'komal and tivra add the other swars, twelve in two rows of six', await perRow());
  await p.check('#chart-names');
  t.ok((await p.locator('#note-picker button small').count()) > 0, 'note names appear under the swars');
  await p.click('#note-picker button[data-tok="G"]'); await p.waitForTimeout(250);
  t.ok((await p.getAttribute('#note-picker button[aria-pressed="true"]', 'data-tok')) === 'G' && /hole 1 covered/.test(await p.textContent('#note-info')), 'tapping a swar shows its fingering');
  await p.click('#chart-scale'); await p.waitForTimeout(250);
  t.ok((await p.textContent('#chart-scale')).trim() === 'Stop' && (await p.getAttribute('#chart-scale use', 'href')) === '#i-stop', 'Play the scale becomes Stop');
  await p.click('#chart-scale'); await p.waitForTimeout(200);
  t.ok((await p.textContent('#chart-scale')).trim() === 'Play the scale' && (await p.getAttribute('#chart-scale use', 'href')) === '#i-play', 'and back');

  // roadmap and techniques
  t.ok((await p.locator('#roadmap-list > li').count()) === 5 && (await p.textContent('#roadmap-list > li:first-child h3')) === 'Foundations' && (await p.textContent('#roadmap-list > li:first-child .node')) === '1', 'the roadmap is five numbered stages');
  t.ok((await p.locator('#technique-cards .row').count()) === 8 && (await p.textContent('#technique-cards .row:first-child .tnum')) === '01', 'the techniques are eight numbered rows');
  await p.screenshot({ path: OUT + '/learn-chart.png' });

  // ---------- no sideways overflow, no clipped text ----------
  for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1280, 800]]) {
    const q = await ctx.newPage(); t.watch(q);
    await q.setViewportSize({ width: w, height: h }); await q.goto(BASE + '/#ragas'); await q.waitForTimeout(600);
    const r = await q.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, times: (() => { const e = document.getElementById('raga-filter'); return { scroll: e.scrollWidth > e.clientWidth, more: e.classList.contains('more') }; })() }));
    await q.evaluate(() => FluteNav.go('learn', { focus: false })); await q.waitForTimeout(300);
    const l = await q.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth }));
    t.ok(!r.over && !l.over, `no sideways overflow at ${w} px (Ragas, Learn)`, { r, l });
    if (w === 360) t.ok(r.times.scroll === r.times.more, 'the filter row fades its edge exactly while it can scroll', r.times);
    await q.close();
  }
  await t.finish(b);
})();
