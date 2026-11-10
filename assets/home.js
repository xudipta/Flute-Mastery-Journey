/* Home view (#view-home): the scale, the tanpura and the taal in one panel, and the sheets they open (scale, taal and
   tempo, tuning and sound). The page keeps no audio state of its own: it reads and drives window.FluteApp (app.js) and
   redraws when FluteApp says something changed, so Home stays in step with the keyboard shortcuts, the Alankar tab and
   the now-playing bar. */
(function (root) {
  'use strict';
  const doc = root.document;
  const $ = (s, p = doc) => p.querySelector(s);
  const A = () => root.FluteApp, UI = () => root.FluteUI;
  const SPEEDS = { slow: 'Slow', medium: 'Medium', fast: 'Fast' };
  const signed = (n) => (n > 0 ? '+' : '') + n;

  // ----- the scale -----
  function scale() {
    const app = A();
    const choices = app.saChoices().map((v) => ({ v, full: app.saName(v), note: app.saName(v).replace(/ \(low\)$/, ''), low: v < 0 }));
    const grid = $('#home-sa-grid'), sheet = $('#sheet-scale'), prev = $('#home-sa-prev'), next = $('#home-sa-next');
    [['Low', choices.filter((c) => c.low)], ['Standard', choices.filter((c) => !c.low)]].forEach(([label, list]) => {
      const g = doc.createElement('div'); g.className = 'sa-group';
      g.innerHTML = `<p class="sa-grp">${label}</p>`;
      list.forEach((c) => {
        const b = doc.createElement('button');
        b.type = 'button'; b.className = 'sa-opt'; b.dataset.v = c.v; b.textContent = c.note; b.setAttribute('aria-label', c.full);
        g.appendChild(b);
      });
      grid.appendChild(g);
    });
    function show() {
      const i = choices.findIndex((c) => c.v === app.sa()), c = choices[i] || choices[0];
      $('#home-sa-name').textContent = c.note;
      $('#home-sa-low').hidden = !c.low;
      $('#home-sa-btn').setAttribute('aria-label', `Sa ${c.full}. Change scale`);
      $('#home-sa-freq').textContent = app.saFreq(c.v).toFixed(1) + ' Hz';
      grid.querySelectorAll('.sa-opt').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.v) === c.v));
      prev.disabled = i <= 0; next.disabled = i >= choices.length - 1;
    }
    app.onSa(show); show();
    const step = (d) => { const t = choices[choices.findIndex((c) => c.v === app.sa()) + d]; if (t) app.setSa(t.v); };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    [$('#home-sa-btn'), $('#home-sa-hz')].forEach((b) => b.addEventListener('click', () => UI().openSheet(sheet)));
    sheet.addEventListener('sheetopen', () => { const sel = $('.sa-opt[aria-pressed="true"]', grid); if (sel) sel.focus({ preventScroll: true }); });
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.sa-opt'); if (!b) return;
      app.setSa(Number(b.dataset.v)); UI().closeSheet(sheet);
    });

    // Hear Sa: a clean reference note, to compare with the tanpura.
    const hear = $('#home-hear-sa');
    const showHear = (on) => { UI().setLabel(hear, on ? 'Stop' : 'Hear Sa'); UI().setIcon(hear, on ? 'stop' : 'bell'); hear.classList.toggle('on', on); };
    if (root.FluteDemo) root.FluteDemo.player.hooks.push(() => showHear(false));
    hear.addEventListener('click', () => {
      const P = root.FluteDemo && root.FluteDemo.player; if (!P) return;
      if (hear.classList.contains('on')) { P.stop(); return; }
      P.play([{ tok: 'S', beats: 4 }], 60, { onStep() {}, onEnd() {} });
      showHear(true);
    });
  }

  // ----- the tanpura row -----
  function tanpura() {
    const app = A(), play = $('#home-drone'), sec = $('#home-tanpura');
    function show() {
      const on = app.drone.on(), tuning = app.drone.tuning(), t = app.tanpura.get();
      play.setAttribute('aria-pressed', on); play.setAttribute('aria-busy', tuning);
      play.setAttribute('aria-label', on ? 'Stop tanpura' : 'Play tanpura');
      UI().setIcon(play, on ? 'stop' : 'play');
      sec.classList.toggle('playing', on && !tuning);
      $('#home-tp-meta').textContent = `${t.first} · ${SPEEDS[t.speed] || t.speed}${tuning ? ' · tuning…' : on ? ' · playing' : ''}`;
      $('#home-tp-status').textContent = tuning ? 'Tuning the tanpura…' : '';
    }
    play.addEventListener('click', () => app.drone.toggle());
    app.on('audio', show); app.on('tanpura', show); show();
  }

  // ----- the taal row: play, taal, tempo, beat grid -----
  const TWO_LINE = { DhaGe: 'Dha<br>Ge', TiraKita: 'Tira<br>Kita' }; // long bols break over two lines
  function taal() {
    const app = A(), grid = $('#taal-grid'), play = $('#taal-toggle'), sheet = $('#sheet-taal'), list = $('#taal-list'), bpm = $('#bpm');
    const TAALS = root.TAALS, short = (name) => name.split(' · ')[0];

    // the beat grid: rows of up to 8, a bar line where each section (vibhag) starts, sam ✕ / tali number / khali ○ marks
    function build() {
      const name = app.taalName(), t = TAALS[name], n = t.bols.length, cols = n <= 8 ? n : Math.ceil(n / 2);
      grid.style.setProperty('--cols', cols); grid.innerHTML = '';
      grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', `${short(name)}: ${n} beats`);
      let i = 0;
      t.vib.forEach((count, v) => {
        for (let k = 0; k < count; k++, i++) {
          const el = doc.createElement('div'), bol = t.bols[i];
          el.className = 'beat' + (k === 0 && i % cols !== 0 ? ' vs' : '') + (TWO_LINE[bol] ? ' two' : '');
          const mark = k === 0 ? (t.marks[v] === 'X' ? '✕' : t.marks[v] === 'O' ? '○' : t.marks[v]) : '';
          el.innerHTML = `<u>${mark}</u>${TWO_LINE[bol] || bol}`;
          grid.appendChild(el);
        }
      });
      $('#home-taal-title').textContent = short(name);
      $('#home-taal-beats').textContent = `${n} beats`;
      list.querySelectorAll('.row').forEach((r) => { const on = r.dataset.name === name; r.classList.toggle('sel', on); r.setAttribute('aria-checked', on); });
    }
    app.onBeat((n, idx) => { [...grid.children].forEach((e, j) => e.classList.toggle('on', j === idx)); });

    // the taal list in its sheet
    app.taals().forEach((name) => {
      const t = TAALS[name], b = doc.createElement('button');
      b.type = 'button'; b.className = 'row'; b.dataset.name = name; b.setAttribute('role', 'radio');
      b.innerHTML = `<span class="grow"><b>${short(name)}</b><small>${t.bols.length} beats · ${t.vib.join(' + ')}</small></span>${UI().icon('check')}`;
      list.appendChild(b);
    });
    list.addEventListener('click', (e) => { const r = e.target.closest('.row'); if (r) app.setTaal(r.dataset.name); });
    $('#home-taal-btn').addEventListener('click', () => UI().openSheet(sheet));
    app.on('taal', build); build();

    // play / stop
    function showPlay() {
      const on = app.tabla.on();
      play.setAttribute('aria-pressed', on); play.setAttribute('aria-label', on ? 'Stop taal' : 'Play taal');
      play.classList.toggle('quiet', !on);
      UI().setIcon(play, on ? 'stop' : 'play');
      if (!on) [...grid.children].forEach((e) => e.classList.remove('on'));
    }
    play.addEventListener('click', () => app.tabla.toggle());
    app.on('audio', showPlay); showPlay();

    // tempo: − and + change it by 1 BPM (hold to keep going, faster after a second and a half); the sheet has a slider and tap tempo
    function showBpm() {
      const v = app.bpm();
      $('#bpm-out').textContent = v; $('#sheet-bpm-out').textContent = v; bpm.value = v; UI().syncRange(bpm);
    }
    app.onBpm(showBpm); showBpm();
    bpm.addEventListener('input', () => app.setBpm(Number(bpm.value)));
    [['#home-bpm-down', -1], ['#home-bpm-up', 1]].forEach(([sel, d]) => {
      const b = $(sel); let wait = 0, rep = 0, t0 = 0;
      const stop = () => { clearTimeout(wait); clearInterval(rep); };
      b.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        app.setBpm(app.bpm() + d); t0 = performance.now();
        wait = setTimeout(() => { rep = setInterval(() => app.setBpm(app.bpm() + d * (performance.now() - t0 > 1500 ? 5 : 1)), 80); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, stop));
      b.addEventListener('click', (e) => { if (e.detail === 0) app.setBpm(app.bpm() + d); }); // keyboard clicks have detail 0
    });
    // tap tempo: the average gap between the last few taps; a pause of two seconds starts again
    let taps = [];
    $('#home-tap').addEventListener('click', () => {
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps.push(now); taps = taps.slice(-6);
      if (taps.length >= 2) app.setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    });
  }

  // ----- tuning and sound: first string, pluck speed, fine tune, volumes -----
  function tuning() {
    const app = A(), sheet = $('#sheet-tuning');
    $('#home-tuning-btn').addEventListener('click', () => UI().openSheet(sheet));

    // radio-style segmented controls, with arrow keys
    const seg = (id, key) => {
      const el = $(id), btns = [...el.querySelectorAll('[role="radio"]')];
      const choose = (b) => app.tanpura.set({ [key]: b.dataset.v });
      btns.forEach((b) => b.addEventListener('click', () => choose(b)));
      el.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault();
        const t = btns[(btns.findIndex((b) => b.getAttribute('aria-checked') === 'true') + d + btns.length) % btns.length];
        choose(t); t.focus();
      });
      return () => btns.forEach((b) => { const on = b.dataset.v === app.tanpura.get()[key]; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    };
    const showFirst = seg('#home-first', 'first'), showSpeed = seg('#home-speed', 'speed');

    const fine = $('#home-fine'), dvolRow = $('#home-dvol'), dvolSheet = $('#sheet-dvol'), tvol = $('#tabla-vol');
    function show() {
      const t = app.tanpura.get();
      showFirst(); showSpeed();
      fine.value = t.fine; $('#home-fine-out').textContent = signed(t.fine) + '¢'; UI().syncRange(fine);
      $('#home-fine-reset').disabled = t.fine === 0;
      $('#home-tuning-sum').textContent = `${t.first} · ${signed(t.fine)}¢`;
      [[dvolRow, 'drone'], [dvolSheet, 'drone'], [tvol, 'tabla']].forEach(([el, which]) => { el.value = app.volume(which); UI().syncRange(el); });
      dvolRow.setAttribute('aria-valuetext', app.volume('drone') + '%');
      $('#sheet-dvol-out').textContent = app.volume('drone') + '%'; $('#tabla-vol-out').textContent = app.volume('tabla') + '%';
      $('#sheet-dvol-reset').disabled = app.volume('drone') === 100; $('#tabla-vol-reset').disabled = app.volume('tabla') === 100;
    }
    app.on('tanpura', show); app.on('volume', show); show();

    fine.addEventListener('input', () => app.tanpura.set({ fine: Number(fine.value) }));
    fine.addEventListener('dblclick', () => app.tanpura.set({ fine: 0 }));
    $('#home-fine-reset').addEventListener('click', () => app.tanpura.set({ fine: 0 }));
    [[dvolRow, 'drone'], [dvolSheet, 'drone'], [tvol, 'tabla']].forEach(([el, which]) => {
      el.addEventListener('input', () => app.setVolume(which, Number(el.value)));
      el.addEventListener('dblclick', () => app.setVolume(which, 100));
    });
    $('#sheet-dvol-reset').addEventListener('click', () => app.setVolume('drone', 100));
    $('#tabla-vol-reset').addEventListener('click', () => app.setVolume('tabla', 100));
  }

  function init() {
    if (!$('#home-drone') || !A() || !root.FluteUI) return;
    scale(); tanpura(); taal(); tuning();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(window);
