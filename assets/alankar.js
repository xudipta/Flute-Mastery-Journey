/* Alankar view (#view-alankar): practise alankar patterns (assets/alankar-data.js) with the tanpura and a tabla taal.

   Layout: two field buttons (Scale, Taal) that open bottom sheets, one grouped list of patterns, and a player docked above
   the tab bar (sticky, not a modal): title, the notation with the note being played lit, Play, tempo, notes per beat and
   chips for the tanpura, the tabla and the speed trainer. "More" opens a sheet with the finger chart, the speed trainer
   settings, when each round starts, repeat and the flute volume.

   The notes and the tabla beats are played by the shared transport (transport.js), so the melody stays on the taal's beats
   and loops without gaps. The tempo, tabla, tanpura and volumes are the same ones as on Home: this tab drives
   them through the hooks at the end of app.js (FluteApp.bpm/setBpm/onBpm, tabla, drone, setVolume, saveSettings,
   blockState/markBlock). It renders into #alankar-root the first time the tab is shown. The now-playing bar (mini.js)
   stays out of the way on this tab, because the player shows the same things. */
(function (root) {
  'use strict';
  const D = root.ALANKAR, T = root.FluteTransport, F = root.FluteDemo, Sound = root.FluteAudio.Engine;
  const App = () => root.FluteApp, UI = () => root.FluteUI;
  const $ = (s, p = document) => p.querySelector(s);
  const icon = (n, c) => UI().icon(n, c);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));
  const label = (tok) => F.parseSwar(tok).label;
  const short = (name) => name.split(' · ')[0];
  const shortScale = (name) => name.replace(/ \(.*\)$/, '');
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const LAYAS = [[1, '1×'], [2, '2×'], [4, '4×']];
  const BEATS = [['tabla', 'Tabla'], ['click', 'Click'], ['off', 'None']];
  const ALIGN = [['beat', 'Right away'], ['sam', 'On sam']];
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
  const segBtns = (items) => items.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`).join('');
  const sheet = (id, title, body) => `<dialog class="sheet al-sheet" id="${id}" aria-labelledby="${id}-t"><div class="sheet-in"><div class="grab" aria-hidden="true"></div>
      <div class="sheet-head"><h2 id="${id}-t">${title}</h2><button class="iconbtn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="sheet-body">${body}</div></div></dialog>`;
  function markup() {
    return `<div class="al">
      <div class="al-fields">
        <button type="button" class="field" id="al-scale-btn" aria-haspopup="dialog"><small>Scale</small><b id="al-scale-name"></b>${icon('down')}</button>
        <button type="button" class="field" id="al-taal-btn" aria-haspopup="dialog"><small>Taal</small><b id="al-taal-name"></b>${icon('down')}</button>
      </div>
      <p class="al-count" id="al-count"></p>
      <div class="list al-list" id="al-cards" role="group" aria-label="Patterns"></div>
      <div class="al-log" id="al-log">
        <p>Played this visit <b id="al-played">0:00</b></p>
        <button type="button" class="btn sm ghost" id="al-mark" hidden>Count towards today's Alankars block</button>
        <p class="al-marked" id="al-marked" hidden>${icon('check')}Today's Alankars block is ticked off</p>
      </div>

      <section class="al-dock" id="al-dock" aria-labelledby="al-title">
        <div class="grab" aria-hidden="true"></div>
        <div class="al-dock-head">
          <div class="grow"><b class="al-title" id="al-title"></b><small id="al-sub"></small></div>
          <span class="eyebrow" id="al-round"></span>
        </div>
        <div class="al-notation" id="al-notation" role="group" aria-label="Notation: the note being played is highlighted"></div>
        <div class="al-ctl">
          <button type="button" class="round" id="al-play" aria-label="Play" aria-pressed="false">${icon('play')}</button>
          <div class="al-bpm" role="group" aria-label="Tempo">
            <button type="button" class="step" id="al-slower" aria-label="Slower">${icon('minus')}</button>
            <div class="n"><b><output id="al-bpm-out"></output></b><small>BPM</small></div>
            <button type="button" class="step" id="al-faster" aria-label="Faster">${icon('plus')}</button>
          </div>
          <div class="seg" id="al-laya" role="group" aria-label="Notes per beat">${segBtns(LAYAS)}</div>
        </div>
        <div class="al-chips">
          <button type="button" class="chip" id="al-drone" aria-pressed="false">${icon('check')}<span>Tanpura</span></button>
          <button type="button" class="chip" id="al-tabla" aria-pressed="false">${icon('check')}<span>Tabla</span></button>
          <button type="button" class="chip" id="al-trainer-chip" aria-pressed="false">${icon('check')}<span>Trainer</span></button>
          <button type="button" class="chip" id="al-more" aria-haspopup="dialog"><span>More</span>${icon('up')}</button>
        </div>
        <p class="al-status" id="al-status" role="status"></p>
      </section>
    </div>
    ${sheet('sheet-al-scale', 'Scale to play in', `<p class="hint sheet-note">The tonic is the Sa chosen on Home.</p><div class="list" id="al-scale-list" role="radiogroup" aria-label="Scale"></div>`)}
    ${sheet('sheet-al-taal', 'Taal and beat', `
      <div class="sheet-group"><p class="eyebrow" id="al-beat-l">Beat sound</p><div class="seg" id="al-beat" role="group" aria-labelledby="al-beat-l">${segBtns(BEATS)}</div></div>
      <div class="sheet-group"><p class="eyebrow">Taal</p><div class="list" id="al-taal-list" role="radiogroup" aria-label="Taal"></div></div>`)}
    ${sheet('sheet-al-more', 'More', `
      <div class="sheet-group"><p class="eyebrow">Fingering</p>
        <svg class="demo-chart al-chart" id="al-chart" viewBox="0 0 640 150" role="img" aria-label="Bansuri finger-hole chart for the note being played"></svg>
        <p class="al-cap" id="al-cap"></p></div>
      <div class="sheet-group"><p class="eyebrow">Speed trainer</p>
        <label class="al-check"><input type="checkbox" id="al-tr-on"> Raise the tempo as I play</label>
        <div class="al-tr">
          <label>By<span><input type="number" id="al-tr-step" min="1" max="20" inputmode="numeric"> BPM</span></label>
          <label>Every<span><input type="number" id="al-tr-every" min="1" max="10" inputmode="numeric"> rounds</span></label>
          <label>Up to<span><input type="number" id="al-tr-target" min="40" max="240" inputmode="numeric"> BPM</span></label>
        </div>
        <p class="hint">Start slowly. When the tempo reaches the target it stays there. Stopping puts the tempo back where you started.</p></div>
      <div class="sheet-group"><p class="eyebrow" id="al-align-l">Each round starts</p><div class="seg" id="al-align" role="group" aria-labelledby="al-align-l">${segBtns(ALIGN)}</div>
        <label class="al-check"><input type="checkbox" id="al-loop"> Repeat the round</label></div>
      <div class="sheet-group"><div class="line"><span class="eyebrow">Tempo</span><span class="val"><output id="al-bpm-out2"></output> BPM</span></div>
        <div class="slider"><input type="range" id="al-bpm" min="40" max="240" step="1" aria-label="Tempo in beats per minute"></div>
        <div class="line"><span class="eyebrow">Flute volume</span><output class="vol" id="al-vol-flute-out"></output></div>
        <div class="slider">${icon('vol-lo')}<input type="range" id="al-vol-flute" min="0" max="200" step="5" aria-label="Flute volume" title="Double-click to reset to 100%">${icon('vol-hi')}</div>
        <p class="hint">The tanpura and tabla volumes are in Tuning and sound on Home.</p></div>`)}`;
  }

  // ---------- drawing the current pattern ----------
  function subLine() {
    const A = App();
    ui.sub.textContent = `${shortScale(cur.s.name)} · tanpura ${A.drone.on() ? 'on' : 'off'} · ${short(A.taalName())}`;
  }
  function renderNow() {
    const { p, s, toks, b } = cur;
    ui.title.textContent = p.name;
    subLine();
    let idx = 0;
    const groups = (gs) => gs.map((g) => `<span class="al-g">${g.map((d) => `<span class="al-n" data-i="${idx++}">${label(toks[d])}</span>`).join('')}</span>`).join('');
    ui.notation.innerHTML = `<span class="al-dir">Aroha</span>${groups(b.ascGroups)}<span class="al-dir">Avaroha</span>${groups(b.descGroups)}`;
    ui.chips = [...ui.notation.querySelectorAll('.al-n')]; lit = null;
    ui.notation.scrollTop = 0;
    ui.cap.textContent = playing ? '' : p.about;
    ui.scaleName.textContent = shortScale(s.name);
    $('#al-scale-btn').setAttribute('aria-label', `Scale: ${s.name}. Change`);
    chart.clear();
    markRows();
  }
  function renderCards() {
    const g = (x) => x.map((d) => label(cur.toks[d])).join(' ');
    ui.cards.innerHTML = D.patterns.map((p, i) => {
      const b = D.build(p, cur.s), single = p.kernel.length === 1, shown = single ? 8 : 4;
      const prev = b.ascGroups.slice(0, shown).map(g).join(single ? ' ' : ' · ') + (b.ascGroups.length > shown ? ' …' : '');
      const beats = Math.ceil(b.tokens.length / cfg.laya);
      return `<button type="button" class="row al-card" data-id="${p.id}" aria-pressed="false"><span class="al-num">${String(i + 1).padStart(2, '0')}</span><span class="grow"><b>${p.name}</b><small class="al-prev">${prev}</small></span><small class="al-beats" data-beats="${beats} beats">${beats} beats</small></button>`;
    }).join('');
    ui.count.textContent = `${D.patterns.length} patterns`;
    markRows();
  }
  // The chosen pattern's row is highlighted; while it plays its trailing text says so.
  function markRows() {
    [...ui.cards.children].forEach((c) => {
      const on = c.dataset.id === cur.p.id, tail = $('.al-beats', c);
      c.setAttribute('aria-pressed', String(on)); c.classList.toggle('sel', on);
      tail.classList.toggle('al-state', on && playing);
      tail.textContent = on && playing ? 'Playing' : tail.dataset.beats;
    });
  }
  function light(i) {
    if (lit) lit.classList.remove('now');
    lit = ui.chips[i] || null;
    if (!lit) return;
    lit.classList.add('now');
    // keep the lit note inside the (small, scrolling) notation window
    const box = ui.notation, top = lit.offsetTop, bottom = top + lit.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTo({ top: Math.max(0, top - 4), behavior: reduced() ? 'auto' : 'smooth' });
  }
  function status() {
    const t = cfg.trainer, bpm = App().bpm();
    let msg = '';
    if (playing) {
      if (t.on) { const n = t.every - (round % t.every); msg = bpm >= t.target ? `Trainer: target of ${t.target} BPM reached` : `Trainer: +${t.step} BPM in ${n} round${n === 1 ? '' : 's'}`; }
    } else if (reached) msg = `Last time you reached ${reached} BPM.`;
    ui.status.textContent = msg;
    ui.round.textContent = playing ? `Round ${round + 1}` : '';
  }

  // ---------- the controls ----------
  const setSeg = (id, v) => $('#' + id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v) === String(v)));
  const setChip = (el, on) => { el.setAttribute('aria-pressed', String(on)); };
  function syncTempo(v) {
    const n = v || App().bpm();
    if (Number(ui.bpm.value) !== n) { ui.bpm.value = n; UI().syncRange(ui.bpm); }
    ui.bpmOut.textContent = n; ui.bpmOut2.textContent = n;
    status();
  }
  function syncDrone() { setChip(ui.drone, App().drone.on()); subLine(); }
  function syncTabla() { setChip(ui.tabla, playing ? App().tabla.on() : cfg.beat === 'tabla'); }
  function syncTrainer() { setChip(ui.trainerChip, cfg.trainer.on); ui.trOn.checked = cfg.trainer.on; }
  function syncVolumes() { ui.volFlute.value = cfg.vol; UI().syncRange(ui.volFlute); ui.volFluteOut.textContent = cfg.vol + '%'; }
  function syncTaal() {
    const name = App().taalName();
    ui.taalName.textContent = name;
    ui.taalList.querySelectorAll('.row').forEach((r) => { const on = r.dataset.name === name; r.classList.toggle('sel', on); r.setAttribute('aria-checked', String(on)); });
    subLine();
  }
  function syncScale() { ui.scaleList.querySelectorAll('.row').forEach((r) => { const on = r.dataset.id === cfg.scale; r.classList.toggle('sel', on); r.setAttribute('aria-checked', String(on)); }); }
  function syncLog() {
    const st = App().blockState('alankar');
    ui.played.textContent = fmt(playedMs + (playing ? Date.now() - startedAt : 0));
    ui.mark.hidden = st !== 'todo'; ui.marked.hidden = st !== 'done';
  }
  function syncPlay() {
    UI().setIcon(ui.play, playing ? 'stop' : 'play');
    ui.play.setAttribute('aria-label', playing ? 'Stop' : 'Play'); ui.play.setAttribute('aria-pressed', String(playing));
    ui.dock.classList.toggle('playing', playing);
    markRows(); syncTabla(); status();
  }
  function syncAll() {
    setSeg('al-laya', cfg.laya); setSeg('al-beat', cfg.beat); setSeg('al-align', cfg.align);
    ui.loop.checked = cfg.loop;
    ui.trStep.value = cfg.trainer.step; ui.trEvery.value = cfg.trainer.every; ui.trTarget.value = cfg.trainer.target;
    syncTempo(); syncDrone(); syncVolumes(); syncTaal(); syncScale(); syncTrainer(); syncLog(); syncPlay();
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
    light(-1); chart.clear(); ui.cap.textContent = cur.p.about; ui.notation.scrollTop = 0;
    syncPlay(); syncLog();
  }
  // Something about the pattern changed while playing: carry on with the new one.
  function replay() { if (playing) { applyBeat(); startPattern(); } }
  function choose(id) {
    cfg.pattern = id; save(); pick(); renderNow();
    if (playing) replay(); else start();          // tapping a pattern plays it
  }

  // ---------- wiring ----------
  const open = (id) => UI().openSheet(document.getElementById(id));
  function wire() {
    const A = App();
    ui.play.addEventListener('click', () => (playing ? stop() : start()));
    ui.cards.addEventListener('click', (e) => { const c = e.target.closest('[data-id]'); if (c) choose(c.dataset.id); });
    // sheets: scale, taal and beat sound, more
    $('#al-scale-btn').addEventListener('click', () => open('sheet-al-scale'));
    $('#al-taal-btn').addEventListener('click', () => open('sheet-al-taal'));
    ui.more.addEventListener('click', () => open('sheet-al-more'));
    ui.scaleList.addEventListener('click', (e) => {
      const r = e.target.closest('.row'); if (!r) return;
      cfg.scale = r.dataset.id; save(); pick(); renderCards(); renderNow(); syncScale(); replay();
      UI().closeSheet($('#sheet-al-scale'));
    });
    ui.taalList.addEventListener('click', (e) => {
      const r = e.target.closest('.row'); if (!r) return;
      A.setTaal(r.dataset.name); if (playing) { applyBeat(); startPattern(); }
      UI().closeSheet($('#sheet-al-taal'));
    });
    $('#al-laya').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; cfg.laya = Number(b.dataset.v); save(); setSeg('al-laya', cfg.laya); renderCards(); renderNow(); replay(); });
    $('#al-beat').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; cfg.beat = b.dataset.v; save(); setSeg('al-beat', cfg.beat); syncTabla(); if (playing) { applyBeat(); startPattern(); } });
    $('#al-align').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; cfg.align = b.dataset.v; save(); setSeg('al-align', cfg.align); replay(); });
    ui.loop.addEventListener('change', () => { cfg.loop = ui.loop.checked; save(); replay(); });
    // tempo
    const bpmBy = (d) => A.setBpm(A.bpm() + d);
    ui.bpm.addEventListener('input', () => A.setBpm(Number(ui.bpm.value)));
    ui.slower.addEventListener('click', () => bpmBy(-1)); ui.faster.addEventListener('click', () => bpmBy(1));
    A.onBpm((v) => { if (playing && !fromTrainer) tempoAtStart = v; syncTempo(v); });   // your own tempo changes become the new starting point
    // chips: tanpura (also switched from Home and the T key), tabla (the beat sound) and the speed trainer
    ui.drone.addEventListener('click', () => { A.drone.set(!A.drone.on()); syncDrone(); });
    A.on('audio', () => { syncDrone(); syncTabla(); });
    ui.tabla.addEventListener('click', () => {
      const on = playing ? A.tabla.on() : cfg.beat === 'tabla';
      cfg.beat = on ? 'off' : 'tabla'; save(); setSeg('al-beat', cfg.beat); syncTabla();
      if (playing) { applyBeat(); startPattern(); }
    });
    ui.trainerChip.addEventListener('click', () => { cfg.trainer.on = !cfg.trainer.on; save(); syncTrainer(); status(); });
    // flute volume (double-click goes back to 100%)
    ui.volFlute.addEventListener('input', () => { cfg.vol = Number(ui.volFlute.value); ui.volFluteOut.textContent = cfg.vol + '%'; save(); if (playing) applyFluteVolume(); });
    ui.volFlute.addEventListener('dblclick', () => { ui.volFlute.value = 100; ui.volFlute.dispatchEvent(new Event('input')); });
    // speed trainer
    const trainerField = (el, key, lo, hi) => el.addEventListener('change', () => { cfg.trainer[key] = clamp(el.value, lo, hi); el.value = cfg.trainer[key]; save(); status(); });
    ui.trOn.addEventListener('change', () => { cfg.trainer.on = ui.trOn.checked; save(); syncTrainer(); status(); });
    trainerField(ui.trStep, 'step', 1, 20); trainerField(ui.trEvery, 'every', 1, 10); trainerField(ui.trTarget, 'target', 40, 240);
    // today's practice block
    ui.mark.addEventListener('click', () => { A.markBlock('alankar'); syncLog(); });
    // the taal can be changed on the Home tab
    A.on('taal', syncTaal);
  }

  function build() {
    const A = App();
    if (!A || !A.tabla || !F || !T || !D || !UI()) { $('#alankar-root').textContent = 'The Alankar tab could not start.'; return; }
    cfg = loadCfg(); pick();
    ui.root = $('#alankar-root'); ui.root.innerHTML = markup();
    Object.assign(ui, {
      dock: $('#al-dock'), title: $('#al-title'), sub: $('#al-sub'), round: $('#al-round'), notation: $('#al-notation'), cap: $('#al-cap'), play: $('#al-play'), status: $('#al-status'),
      bpm: $('#al-bpm'), bpmOut: $('#al-bpm-out'), bpmOut2: $('#al-bpm-out2'), slower: $('#al-slower'), faster: $('#al-faster'),
      drone: $('#al-drone'), tabla: $('#al-tabla'), trainerChip: $('#al-trainer-chip'), more: $('#al-more'),
      cards: $('#al-cards'), count: $('#al-count'), scaleName: $('#al-scale-name'), taalName: $('#al-taal-name'), scaleList: $('#al-scale-list'), taalList: $('#al-taal-list'),
      loop: $('#al-loop'), volFlute: $('#al-vol-flute'), volFluteOut: $('#al-vol-flute-out'),
      trOn: $('#al-tr-on'), trStep: $('#al-tr-step'), trEvery: $('#al-tr-every'), trTarget: $('#al-tr-target'),
      played: $('#al-played'), mark: $('#al-mark'), marked: $('#al-marked')
    });
    // the sheets' lists
    ui.scaleList.innerHTML = D.scales.map((x) => `<button type="button" class="row" role="radio" data-id="${x.id}"><span class="grow"><b>${x.name}</b><small>${x.tokens.split(/\s+/).map(label).join(' ')}</small></span>${icon('check')}</button>`).join('');
    ui.taalList.innerHTML = Object.keys(root.TAALS).map((k) => { const t = root.TAALS[k]; return `<button type="button" class="row" role="radio" data-name="${k}"><span class="grow"><b>${short(k)}</b><small>${t.bols.length} beats · ${t.vib.join(' + ')}</small></span>${icon('check')}</button>`; }).join('');
    chart = F.createChart($('#al-chart'));
    renderCards(); renderNow(); wire(); built = true;
  }

  root.FluteAlankar = { stop, get playing() { return playing; } };
  if (root.FluteNav) {
    root.FluteNav.onShow('alankar', () => { if (!built) build(); if (built) syncAll(); });
  }
})(window);
