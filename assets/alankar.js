/* Alankar view (#view-alankar): practise alankar patterns (assets/alankar-data.js) with the tanpura and a tabla taal.

   The notes and the tabla beats are played by the shared transport (transport.js), so the melody stays on the taal's beats
   and loops without gaps. The tempo, tabla, tanpura and volumes are the same ones as in the tools bar: this tab drives
   them through the hooks at the end of app.js (FluteApp.bpm/setBpm/onBpm, tabla, drone, setVolume, saveSettings,
   blockState/markBlock). It renders into #alankar-root the first time the tab is shown. */
(function (root) {
  'use strict';
  const D = root.ALANKAR, T = root.FluteTransport, F = root.FluteDemo, Sound = root.FluteAudio.Engine;
  const App = () => root.FluteApp;
  const $ = (s, p = document) => p.querySelector(s);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));
  const label = (tok) => F.parseSwar(tok).label;
  const LAYAS = [[1, '1×'], [2, '2×'], [4, '4×']];
  const BEATS = [['tabla', 'Tabla'], ['click', 'Click'], ['off', 'None']];
  const ALIGN = [['beat', 'right after the last note'], ['sam', 'on sam (first beat of the taal)']];
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  let cfg = null, cur = null, chart = null, built = false;
  const ui = {};
  let playing = false, startedTabla = false, startedAt = 0, playedMs = 0, timeTimer = null, gridTaal = null;
  let session = 0, round = 0, lit = null, tempoAtStart = 0, reached = 0, trained = false, lastTrained = 0, fromTrainer = false;

  // ---------- settings ----------
  function loadCfg() {
    const s = App().settings;
    const a = s.alankar = Object.assign({ pattern: D.patterns[0].id, scale: D.scales[0].id, laya: 1, beat: 'tabla', align: 'beat', loop: true, vol: 100 }, s.alankar);
    a.trainer = Object.assign({ on: false, step: 5, every: 2, target: 120 }, a.trainer);
    if (!D.patterns.some((p) => p.id === a.pattern)) a.pattern = D.patterns[0].id;
    if (!D.scales.some((x) => x.id === a.scale)) a.scale = D.scales[0].id;
    if (!LAYAS.some((l) => l[0] === a.laya)) a.laya = 1;
    if (!BEATS.some((b) => b[0] === a.beat)) a.beat = 'tabla';
    if (!ALIGN.some((x) => x[0] === a.align)) a.align = 'beat';
    a.loop = a.loop !== false; a.vol = clamp(a.vol, 0, 200);
    Object.assign(a.trainer, { on: !!a.trainer.on, step: clamp(a.trainer.step, 1, 20), every: clamp(a.trainer.every, 1, 10), target: clamp(a.trainer.target, 40, 240) });
    return a;
  }
  const save = () => App().saveSettings();
  const pick = () => {
    const p = D.patterns.find((x) => x.id === cfg.pattern), s = D.scales.find((x) => x.id === cfg.scale);
    cur = { p, s, toks: s.tokens.split(/\s+/), b: D.build(p, s) };
  };

  // ---------- markup ----------
  const seg = (id, items, aria) => `<div class="al-seg" id="${id}" role="group" aria-label="${aria}">${items.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`).join('')}</div>`;
  const slider = (id, text) => `<label class="al-slider"><span>${text} <output id="${id}-out"></output></span><input type="range" id="${id}" min="0" max="200" step="5" title="Double-click to reset to 100%"></label>`;
  function markup() {
    return `<div class="al">
      <div class="al-bar" id="al-bar" hidden>
        <button type="button" class="btn small" id="al-bar-stop">■ Stop</button>
        <span class="al-bar-name" id="al-bar-name"></span>
        <span class="al-bar-tempo"><button type="button" class="dock-btn" id="al-bar-slower" aria-label="Slower">−</button><output id="al-bar-bpm"></output><button type="button" class="dock-btn" id="al-bar-faster" aria-label="Faster">+</button></span>
      </div>
      <section class="panel al-now" aria-labelledby="al-title">
        <h3 id="al-title"></h3>
        <p class="al-sub" id="al-sub"></p>
        <div class="al-notation" id="al-notation"></div>
        <svg class="demo-chart al-chart" id="al-chart" viewBox="0 0 640 150" role="img" aria-label="Bansuri finger-hole chart for the note being played"></svg>
        <p class="al-cap" id="al-cap"></p>
        <div class="al-play-row">
          <button type="button" class="btn al-play" id="al-play">▶ Play</button>
          <div class="al-tempo" role="group" aria-label="Tempo">
            <button type="button" class="dock-btn" id="al-slower" aria-label="Slower">−</button>
            <input type="range" id="al-bpm" min="40" max="240" step="1" aria-label="Tempo in beats per minute">
            <button type="button" class="dock-btn" id="al-faster" aria-label="Faster">+</button>
            <span class="al-bpm"><output id="al-bpm-out"></output> BPM</span>
          </div>
        </div>
        <div class="al-field"><span class="al-flabel" id="al-laya-l">Notes per beat</span>${seg('al-laya', LAYAS.map(([n, t]) => [n, t]), 'Notes per beat')}</div>
        <p class="al-status" id="al-status"></p>
      </section>

      <section class="panel al-with" aria-labelledby="al-with-h">
        <h3 id="al-with-h">Play with</h3>
        <div class="al-row2">
          <button type="button" class="btn small ghost al-toggle" id="al-drone" aria-pressed="false"></button>
          ${slider('al-vol-drone', 'Tanpura volume')}
        </div>
        <div class="al-field"><label class="al-flabel" for="al-taal">Taal</label><select id="al-taal"></select></div>
        <div class="al-field"><span class="al-flabel" id="al-beat-l">Beat sound</span>${seg('al-beat', BEATS, 'Beat sound')}</div>
        ${slider('al-vol-tabla', 'Tabla volume')}
        ${slider('al-vol-flute', 'Flute volume')}
        <label class="al-check"><input type="checkbox" id="al-loop"> Repeat the round</label>
        <div class="al-field"><label class="al-flabel" for="al-align">Each round starts</label><select id="al-align">${ALIGN.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      </section>

      <details class="panel al-trainer" id="al-trainer">
        <summary>Speed trainer</summary>
        <label class="al-check"><input type="checkbox" id="al-tr-on"> Raise the tempo as I play</label>
        <div class="al-tr">
          <label>by <input type="number" id="al-tr-step" min="1" max="20" inputmode="numeric"> BPM</label>
          <label>every <input type="number" id="al-tr-every" min="1" max="10" inputmode="numeric"> rounds</label>
          <label>up to <input type="number" id="al-tr-target" min="40" max="240" inputmode="numeric"> BPM</label>
        </div>
        <p class="hint">Start slowly. When the tempo reaches the target it stays there. Stopping puts the tempo back where you started.</p>
      </details>

      <section class="panel al-pick" aria-labelledby="al-pick-h">
        <h3 id="al-pick-h">Patterns</h3>
        <div class="al-field"><label class="al-flabel" for="al-scale">Scale</label><select id="al-scale">${D.scales.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <p class="hint">Tap a pattern to hear it. The tonic is the Sa chosen in the tools bar.</p>
        <div class="al-cards" id="al-cards"></div>
      </section>

      <section class="panel al-log" id="al-log">
        <p>Played this visit: <b id="al-played">0:00</b></p>
        <button type="button" class="btn small ghost" id="al-mark" hidden>✓ Count towards today's Alankars block</button>
        <p class="hint" id="al-marked" hidden>Today's Alankars block is ticked off ✓</p>
      </section>
    </div>`;
  }

  // ---------- drawing the current pattern ----------
  function renderNow() {
    const { p, s, toks, b } = cur, beats = Math.ceil(b.tokens.length / cfg.laya);
    ui.title.textContent = p.name;
    ui.sub.textContent = `${s.name} · ${b.tokens.length} notes · ${beats} beats a round`;
    let idx = 0;
    const row = (lab, groups) => `<div class="al-row"><span class="al-label">${lab}</span>${groups.map((g) => `<span class="al-g">${g.map((d) => `<span class="al-n" data-i="${idx++}">${label(toks[d])}</span>`).join('')}</span>`).join('')}</div>`;
    ui.notation.innerHTML = row('Aroha (going up)', b.ascGroups) + row('Avaroha (coming down)', b.descGroups);
    ui.chips = [...ui.notation.querySelectorAll('.al-n')]; lit = null;
    ui.cap.textContent = playing ? '' : p.about;
    ui.barName.textContent = `${p.name} · ${s.name}`;
    chart.clear();
    [...ui.cards.children].forEach((c) => c.setAttribute('aria-pressed', c.dataset.id === p.id));
  }
  function renderCards() {
    ui.cards.innerHTML = D.patterns.map((p) => {
      const b = D.build(p, cur.s), g = (x) => x.map((d) => label(cur.toks[d])).join(' ');
      return `<button type="button" class="al-card" data-id="${p.id}" aria-pressed="${p.id === cur.p.id}"><b>${p.name}</b><span class="al-prev">${g(b.ascGroups[0])} · ${g(b.ascGroups[1])} …</span><small>${b.tokens.length} notes</small></button>`;
    }).join('');
  }
  function light(i) {
    if (lit) lit.classList.remove('now');
    lit = ui.chips[i] || null;
    if (lit) lit.classList.add('now');
  }
  function status() {
    const t = cfg.trainer, bpm = App().bpm();
    let msg;
    if (!playing) msg = reached ? `Last time you reached ${reached} BPM.` : 'Stopped.';
    else {
      msg = `Round ${round + 1}`;
      if (t.on) msg += bpm >= t.target ? ` · trainer: target of ${t.target} BPM reached` : ` · trainer: +${t.step} BPM in ${t.every - (round % t.every)} round${t.every - (round % t.every) === 1 ? '' : 's'}`;
    }
    ui.status.textContent = msg;
  }

  // ---------- the controls ----------
  const setSeg = (id, v) => $('#' + id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v) === String(v)));
  function syncTempo(v) {
    const n = v || App().bpm();
    if (Number(ui.bpm.value) !== n) ui.bpm.value = n;
    ui.bpmOut.textContent = n; ui.barBpm.textContent = n;
    status();
  }
  function syncDrone() {
    const on = App().drone.on();
    ui.drone.setAttribute('aria-pressed', String(on));
    ui.drone.textContent = on ? '🎵 Tanpura: on' : '🎵 Tanpura: off';
  }
  function syncVolumes() {
    ui.volDrone.value = App().volume('drone'); ui.volTabla.value = App().volume('tabla'); ui.volFlute.value = cfg.vol;
    [ui.volDrone, ui.volTabla, ui.volFlute].forEach((el) => { $('#' + el.id + '-out').textContent = el.value + '%'; });
  }
  function syncTaal() { ui.taal.value = App().taalName(); }
  function syncLog() {
    const st = App().blockState('alankar');
    ui.played.textContent = fmt(playedMs + (playing ? Date.now() - startedAt : 0));
    ui.mark.hidden = st !== 'todo'; ui.marked.hidden = st !== 'done';
  }
  function syncPlay() {
    ui.play.textContent = playing ? '■ Stop' : '▶ Play';
    ui.play.classList.toggle('on', playing);
    ui.bar.hidden = !playing;
    status();
  }
  function syncAll() {
    const t = cfg.trainer;
    setSeg('al-laya', cfg.laya); setSeg('al-beat', cfg.beat);
    ui.loop.checked = cfg.loop; ui.align.value = cfg.align; ui.scale.value = cfg.scale;
    ui.trOn.checked = t.on; ui.trStep.value = t.step; ui.trEvery.value = t.every; ui.trTarget.value = t.target;
    syncTempo(); syncDrone(); syncVolumes(); syncTaal(); syncLog(); syncPlay();
    const hdr = $('.site-header'); if (hdr) ui.root.style.setProperty('--al-top', hdr.offsetHeight + 'px');
  }

  // ---------- playback ----------
  // Make the shared transport match the Beat settings (tabla, click or none) and the chosen taal.
  function applyBeat() {
    const A = App(), mode = cfg.beat, name = A.taalName(), taal = root.TAALS[name];
    if (mode === 'tabla') {
      if (!A.tabla.on()) { A.tabla.set(true); startedTabla = true; }
      T.setClick(false); gridTaal = name;
      return;
    }
    if (A.tabla.on()) A.tabla.set(false);        // with a pattern playing this only mutes the tabla and keeps the beat grid
    startedTabla = false;
    if (!T.running) { T.start({ bpm: A.bpm(), taal, tabla: false, click: mode === 'click' }); gridTaal = name; }
    else {
      if (gridTaal !== name) { T.setTaal(taal); gridTaal = name; }
      T.setTabla(false); T.setClick(mode === 'click');
    }
  }
  function applyFluteVolume() { if (Sound.ctx) Sound.setVolume('flute', cfg.vol / 100); }
  function startPattern() {
    const sid = ++session, items = cur.b.tokens.map((tok) => ({ tok, beats: 1 }));
    round = 0;
    T.playPattern(items, {
      loop: cfg.loop, notesPerBeat: cfg.laya, align: cfg.align, startAt: cfg.align,
      onStep(item, info) {
        if (sid !== session || !playing) return;
        light(info.index);
        const sw = F.parseSwar(item.tok); chart.show(sw.closed, sw.half, sw.over);
        ui.cap.textContent = F.describe(sw);
        if (info.repeat !== round) { round = info.repeat; status(); }
      },
      onLoop(repeat) { if (sid === session && playing) trainer(repeat); },
      onEnd() { if (sid === session && playing) stop(); }
    });
  }
  // Raise the tempo every `every` rounds until the target is reached.
  function trainer(repeat) {
    const t = cfg.trainer, bpm = App().bpm();
    if (!t.on || repeat === 0 || repeat % t.every !== 0 || bpm >= t.target) return;
    fromTrainer = true;
    App().setBpm(Math.min(t.target, bpm + t.step));
    fromTrainer = false; trained = true; lastTrained = App().bpm();
  }
  function start() {
    Sound.ensure();                               // inside the tap, so a phone lets the audio start
    const A = App();
    tempoAtStart = A.bpm(); reached = 0; trained = false;
    playing = true; startedAt = Date.now();
    applyBeat(); applyFluteVolume(); startPattern();
    timeTimer = setInterval(syncLog, 1000);
    syncPlay(); syncLog();
  }
  function stop() {
    if (!playing) return;
    const A = App();
    session++;                                    // late notes from the old pattern must not light anything up
    playedMs += Date.now() - startedAt; clearInterval(timeTimer); timeTimer = null; playing = false;
    T.stopPattern();
    // Stop what this tab started: the tabla it switched on, or the click grid. A tabla already playing elsewhere goes on.
    if (startedTabla && A.tabla.on()) A.tabla.set(false);
    else if (!A.tabla.on() && T.running && !T.patternActive) T.stop();
    startedTabla = false; gridTaal = null;
    if (Sound.ctx) Sound.setVolume('flute', 1);
    // The trainer raised the tempo: put it back where you started, unless you changed it yourself since.
    if (trained) { reached = lastTrained; if (A.bpm() === lastTrained) A.setBpm(tempoAtStart); }
    light(-1); chart.clear(); ui.cap.textContent = cur.p.about;
    syncPlay(); syncLog();
  }
  // Something about the pattern changed while playing: carry on with the new one.
  function replay() { if (playing) { applyBeat(); startPattern(); } }
  function choose(id) {
    cfg.pattern = id; save(); pick(); renderNow();
    if (playing) replay(); else start();          // tapping a pattern plays it
  }

  // ---------- wiring ----------
  function wire() {
    const A = App();
    ui.play.addEventListener('click', () => (playing ? stop() : start()));
    ui.barStop.addEventListener('click', stop);
    ui.cards.addEventListener('click', (e) => { const c = e.target.closest('[data-id]'); if (c) choose(c.dataset.id); });
    ui.scale.addEventListener('change', () => { cfg.scale = ui.scale.value; save(); pick(); renderCards(); renderNow(); replay(); });
    $('#al-laya').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; cfg.laya = Number(b.dataset.v); save(); setSeg('al-laya', cfg.laya); renderNow(); replay(); });
    $('#al-beat').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; cfg.beat = b.dataset.v; save(); setSeg('al-beat', cfg.beat); if (playing) { applyBeat(); startPattern(); } });
    ui.taal.addEventListener('change', () => { A.setTaal(ui.taal.value); if (playing) { applyBeat(); startPattern(); } });
    ui.loop.addEventListener('change', () => { cfg.loop = ui.loop.checked; save(); replay(); });
    ui.align.addEventListener('change', () => { cfg.align = ui.align.value; save(); replay(); });
    // tempo
    const bpmBy = (d) => A.setBpm(A.bpm() + d);
    ui.bpm.addEventListener('input', () => A.setBpm(Number(ui.bpm.value)));
    ui.slower.addEventListener('click', () => bpmBy(-1)); ui.faster.addEventListener('click', () => bpmBy(1));
    ui.barSlower.addEventListener('click', () => bpmBy(-1)); ui.barFaster.addEventListener('click', () => bpmBy(1));
    A.onBpm((v) => { if (playing && !fromTrainer) tempoAtStart = v; syncTempo(v); });   // your own tempo changes become the new starting point
    // tanpura, which is also switched from the tools bar and the T key
    ui.drone.addEventListener('click', () => { A.drone.set(!A.drone.on()); syncDrone(); });
    const dt = document.getElementById('drone-toggle');
    if (dt) new MutationObserver(syncDrone).observe(dt, { attributes: true, attributeFilter: ['aria-pressed'] });
    // volumes (double-click goes back to 100%)
    const volume = (el, apply) => {
      el.addEventListener('input', () => { apply(Number(el.value)); $('#' + el.id + '-out').textContent = el.value + '%'; });
      el.addEventListener('dblclick', () => { el.value = 100; el.dispatchEvent(new Event('input')); });
    };
    volume(ui.volDrone, (v) => A.setVolume('drone', v));
    volume(ui.volTabla, (v) => A.setVolume('tabla', v));
    volume(ui.volFlute, (v) => { cfg.vol = v; save(); if (playing) applyFluteVolume(); });
    // speed trainer
    const trainerField = (el, key, lo, hi) => el.addEventListener('change', () => { cfg.trainer[key] = clamp(el.value, lo, hi); el.value = cfg.trainer[key]; save(); status(); });
    ui.trOn.addEventListener('change', () => { cfg.trainer.on = ui.trOn.checked; save(); status(); });
    trainerField(ui.trStep, 'step', 1, 20); trainerField(ui.trEvery, 'every', 1, 10); trainerField(ui.trTarget, 'target', 40, 240);
    // today's practice block
    ui.mark.addEventListener('click', () => { A.markBlock('alankar'); syncLog(); });
    // the taal can be changed on the Home tab or in the tools bar
    const ts = document.getElementById('taal-select');
    if (ts) ts.addEventListener('change', syncTaal);
    addEventListener('resize', () => { const hdr = $('.site-header'); if (hdr) ui.root.style.setProperty('--al-top', hdr.offsetHeight + 'px'); });
  }

  function build() {
    const A = App();
    if (!A || !A.tabla || !F || !T || !D) { $('#alankar-root').textContent = 'The Alankar tab could not start.'; return; }
    cfg = loadCfg(); pick();
    ui.root = $('#alankar-root'); ui.root.innerHTML = markup();
    Object.assign(ui, {
      bar: $('#al-bar'), barName: $('#al-bar-name'), barStop: $('#al-bar-stop'), barSlower: $('#al-bar-slower'), barFaster: $('#al-bar-faster'), barBpm: $('#al-bar-bpm'),
      title: $('#al-title'), sub: $('#al-sub'), notation: $('#al-notation'), cap: $('#al-cap'), play: $('#al-play'), status: $('#al-status'),
      bpm: $('#al-bpm'), bpmOut: $('#al-bpm-out'), slower: $('#al-slower'), faster: $('#al-faster'),
      drone: $('#al-drone'), taal: $('#al-taal'), loop: $('#al-loop'), align: $('#al-align'), scale: $('#al-scale'), cards: $('#al-cards'),
      volDrone: $('#al-vol-drone'), volTabla: $('#al-vol-tabla'), volFlute: $('#al-vol-flute'),
      trOn: $('#al-tr-on'), trStep: $('#al-tr-step'), trEvery: $('#al-tr-every'), trTarget: $('#al-tr-target'),
      played: $('#al-played'), mark: $('#al-mark'), marked: $('#al-marked')
    });
    Object.keys(root.TAALS).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = k; ui.taal.appendChild(o); });
    ui.trainerBox = $('#al-trainer'); ui.trainerBox.open = cfg.trainer.on;
    chart = F.createChart($('#al-chart'));
    renderCards(); renderNow(); wire(); built = true;
  }

  root.FluteAlankar = { stop, get playing() { return playing; } };
  if (root.FluteNav) {
    root.FluteNav.onShow('alankar', () => { if (!built) build(); if (built) syncAll(); });
  }
})(window);
