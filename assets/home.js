/* Home view (#view-home): the landing page. A Tanpura card (play, scale, check the sound, options) and a Taal card
   (play, taal, tempo). The page owns no audio of its own: every control drives the same element the tools bar uses
   (#drone-toggle, #sa-select, #tp-first ... and #taal-select, #bpm, #tabla-vol, which are in this view), so the two
   stay in step in both directions. app.js does the work; this file only reflects and forwards. */
(function (root) {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const App = () => root.FluteApp;
  const fire = (el) => el.dispatchEvent(new Event('input', { bubbles: true }));
  const watch = (el, fn, opts) => { if (el) new MutationObserver(fn).observe(el, opts); };

  // ----- Tanpura card -----
  function tanpura() {
    const dock = { btn: $('#drone-toggle'), saSel: $('#sa-select'), pill: $('#pill-sa-name'), status: $('#tp-status') };
    const play = $('#home-drone'), ico = $('.play-ico', play), txt = $('.play-txt', play);

    // Play / stop, with the "tuning" state while the strings are being built.
    function showPlay() {
      const on = dock.btn.getAttribute('aria-pressed') === 'true', tuning = dock.btn.classList.contains('tuning');
      play.setAttribute('aria-pressed', on); play.setAttribute('aria-busy', tuning);
      play.classList.toggle('on', on); play.classList.toggle('tuning', tuning);
      ico.textContent = tuning ? '…' : on ? '■' : '▶';
      txt.textContent = tuning ? 'Tuning' : on ? 'Stop' : 'Play';
      play.setAttribute('aria-label', on ? 'Stop tanpura' : 'Play tanpura');
    }
    play.addEventListener('click', () => dock.btn.click());
    watch(dock.btn, showPlay, { attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-busy'] });
    showPlay();
    watch(dock.status, () => { $('#home-tp-status').textContent = dock.status.textContent; }, { childList: true, characterData: true, subtree: true });

    // Scale: the choices come from the tools bar's select (-5 .. 11 semitones above C), so there is one list.
    const choices = [...dock.saSel.options].map((o) => ({ v: Number(o.value), full: o.textContent, short: o.textContent.replace(/ \(low\)$/, '↓') }));
    const grid = $('#home-sa-grid'), btn = $('#home-sa-btn'), prev = $('#home-sa-prev'), next = $('#home-sa-next');
    [['Low', choices.filter((c) => c.v < 0)], ['Standard', choices.filter((c) => c.v >= 0)]].forEach(([label, list]) => {
      const g = document.createElement('div'); g.className = 'sa-group';
      g.innerHTML = `<span class="sa-grp">${label}</span>`;
      list.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'sa-opt'; b.dataset.v = c.v; b.textContent = c.short; b.setAttribute('aria-label', c.full);
        g.appendChild(b);
      });
      grid.appendChild(g);
    });
    const current = () => Number(dock.saSel.value);
    function showSa() {
      const i = choices.findIndex((c) => c.v === current()), c = choices[i] || choices[0];
      $('#home-sa-name').textContent = c.full;
      grid.querySelectorAll('.sa-opt').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.v) === c.v));
      prev.disabled = i <= 0; next.disabled = i >= choices.length - 1;
    }
    watch(dock.pill, showSa, { childList: true, characterData: true, subtree: true });
    showSa();
    const step = (d) => { const i = choices.findIndex((c) => c.v === current()), t = choices[i + d]; if (t) App().setSa(t.v); };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    function openGrid(open) {
      grid.hidden = !open; btn.setAttribute('aria-expanded', open);
      if (open) { const sel = $('.sa-opt[aria-pressed="true"]', grid); if (sel) sel.focus({ preventScroll: true }); }
    }
    btn.addEventListener('click', () => openGrid(grid.hidden));
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.sa-opt'); if (!b) return;
      App().setSa(Number(b.dataset.v)); openGrid(false); btn.focus({ preventScroll: true });
    });
    grid.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); openGrid(false); btn.focus({ preventScroll: true }); } });
    document.addEventListener('click', (e) => { if (!grid.hidden && !e.target.closest('#home-sa-grid, .tp-scale')) openGrid(false); });

    // Hear Sa: a clean reference note, to compare with the tanpura.
    const hear = $('#home-hear-sa');
    const showHear = (on) => { hear.textContent = on ? 'Stop' : 'Hear Sa'; hear.classList.toggle('on', on); };
    if (root.FluteDemo) root.FluteDemo.player.hooks.push(() => showHear(false));
    hear.addEventListener('click', () => {
      const P = root.FluteDemo && root.FluteDemo.player; if (!P) return;
      if (hear.classList.contains('on')) { P.stop(); return; }
      P.play([{ tok: 'S', beats: 4 }], 60, { onStep() {}, onEnd() {} });
      showHear(true);
    });

    // Options (first string, pluck speed, fine tune, volume): mirror the tools bar's controls both ways.
    const pairs = [['#home-first', '#tp-first'], ['#home-speed', '#tp-speed'], ['#home-fine', '#tp-fine'], ['#home-dvol', '#drone-vol']].map(([h, d]) => [$(h), $(d)]);
    const readouts = () => {
      const f = Number($('#home-fine').value);
      $('#home-fine-out').textContent = (f > 0 ? '+' : '') + f + '¢';
      $('#home-dvol-out').textContent = $('#home-dvol').value + '%';
    };
    pairs.forEach(([h, d]) => {
      h.value = d.value;
      h.addEventListener('input', () => { d.value = h.value; fire(d); readouts(); });
      d.addEventListener('input', () => { h.value = d.value; readouts(); });
    });
    $('#home-fine').addEventListener('dblclick', () => { $('#home-fine').value = 0; fire($('#home-fine')); });
    $('#home-dvol').addEventListener('dblclick', () => { $('#home-dvol').value = 100; fire($('#home-dvol')); });
    readouts();
  }

  // ----- Taal card -----
  function taal() {
    const bpm = $('#bpm');
    const setBpm = (v) => { bpm.value = Math.min(240, Math.max(40, Math.round(v))); fire(bpm); };
    // -/+ change the tempo by 1 BPM; hold to keep going. (Keyboard clicks have detail 0 and step once.)
    [['#home-bpm-down', -1], ['#home-bpm-up', 1]].forEach(([sel, d]) => {
      const b = $(sel); let wait = 0, rep = 0;
      const stop = () => { clearTimeout(wait); clearInterval(rep); };
      b.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        setBpm(Number(bpm.value) + d);
        wait = setTimeout(() => { rep = setInterval(() => setBpm(Number(bpm.value) + d), 80); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, stop));
      b.addEventListener('click', (e) => { if (e.detail === 0) setBpm(Number(bpm.value) + d); });
    });
    // Tap tempo: the average gap between the last few taps; a pause of two seconds starts again.
    const tap = $('#home-tap'); let taps = [];
    tap.addEventListener('click', () => {
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps.push(now); taps = taps.slice(-6);
      if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    });
  }

  function init() {
    if (!$('#home-drone') || !App()) return;
    tanpura(); taal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
