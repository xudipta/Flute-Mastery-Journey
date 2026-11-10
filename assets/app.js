(() => {
  const BLOCKS = [
    { id: 'breath', title: 'Pranayama & posture', min: 5, text: 'Sit tall, shoulders soft. Slow diaphragmatic breaths: inhale 4 counts, exhale 8, then blow a steady airstream without the flute.' },
    { id: 'sa', title: 'Sur sadhana (long tones)', min: 10, text: 'With the tanpura on, hold Sa, then Pa, then each swar for a full breath. Listen for a steady, round tone.' },
    { id: 'alankar', title: 'Alankars / paltas', min: 10, text: 'Practise patterns like Sa Re Ga, Re Ga Ma… in ascending and descending order, slowly and evenly.' },
    { id: 'raga', title: 'Raga alaap', min: 15, text: 'Choose a raga. Unfold it slowly: establish Sa, touch each swar with meend, rest on the vadi and samvadi.' },
    { id: 'taal', title: 'Taan & taal practice', min: 10, text: 'Clap or keep Teentaal (16 beats). Play simple taans and tihais that land exactly on sam.' },
    { id: 'cool', title: 'Bandish / cool-down', min: 5, text: 'Play a composition or a gentle bhajan-style melody. End softly on Sa.' }
  ];
  // The routine is the user's plan (order, minutes, on/off) applied to the block definitions above.
  const defaultPlan = () => BLOCKS.map((b) => ({ id: b.id, min: b.min, on: true }));
  function planToRoutine(plan) {
    const out = [];
    (plan || defaultPlan()).forEach((p) => {
      const b = BLOCKS.find((x) => x.id === p.id);
      if (b && p.on) out.push(Object.assign({}, b, { min: p.min }));
    });
    return out;
  }
  let ROUTINE = [];


  const STAGES = [
    ['Stage 1 · Foundations', 'Months 1–3', ['Hold the bansuri, learn posture and breath control', 'Produce a clear tone across the blowing edge', 'Shuddha swaras Sa Re Ga Ma Pa Dha Ni and simple alankars']],
    ['Stage 2 · First ragas', 'Months 3–8', ['Raga Bhoopali and Raga Yaman, with their aroha and avaroha', 'Meend (glide) and kan (grace note)', 'Keeping Teentaal and Dadra, and playing simple bandishes']],
    ['Stage 3 · Alaap & control', 'Year 1–2', ['Raga Bhairav, Kafi, Bhimpalasi and Desh', 'Slow alaap with a steady breath', 'Madhya saptak and the start of taar saptak']],
    ['Stage 4 · Laykari & taan', 'Years 2–4', ['Fast taans, murki and gamak', 'Jod, jhala and tihai; gat in Madhya and Drut laya', 'Playing with a tabla accompanist']],
    ['Stage 5 · Concert level', 'Years 4+', ['Full raga exposition: alaap, jod, jhala and gat', 'Playing different-sized bansuris', 'Learning under a guru, performing and teaching']]
  ];

  // [name, time group, description]
  const RAGAS = [
    ['Bhairav', 'Morning', 'Dawn raga with komal Re and Dha. Serious, devotional mood.'],
    ['Ahir Bhairav', 'Morning', 'Komal Re and komal Ni, blending Bhairav and Kafi flavours. Calm and expansive.'],
    ['Lalit', 'Morning', 'Pre-dawn raga with both Ma and no Pa. Restless, searching mood.'],
    ['Todi', 'Morning', 'Komal Re, Ga and Dha with tivra Ma. Deep, intense and rich in meend.'],
    ['Asavari', 'Morning', 'Komal Ga, Dha and Ni. Pensive and tender.'],
    ['Jaunpuri', 'Morning', 'Close to Asavari, with natural Dha. Pathos and gravity.'],
    ['Bhimpalasi', 'Afternoon', 'Komal Ga and Ni. Tender, longing character.'],
    ['Shuddha Sarang', 'Afternoon', 'Both Ma with Ni komal. Bright and spacious.'],
    ['Madhuvanti', 'Afternoon', 'Komal Ga with tivra Ma. Sweet and romantic.'],
    ['Marwa', 'Evening', 'Sunset raga with komal Re, tivra Ma and a weak Pa. Restless, yearning tension.'],
    ['Puriya', 'Evening', 'Komal Re and tivra Ma with a strong Ga. Stately and sober.'],
    ['Yaman', 'Evening', 'Uses tivra Ma. Graceful and serene — a good first full raga.'],
    ['Bhoopali', 'Evening', 'Pentatonic (Sa Re Ga Pa Dha). Sweet and easy to shape; ideal for beginners.'],
    ['Hamsadhwani', 'Evening', 'Pentatonic (Sa Re Ga Pa Ni). Bright and joyful; popular for openings.'],
    ['Khamaj', 'Evening', 'Both Ni. Light, playful, ideal for thumri-style phrases.'],
    ['Bihag', 'Night', 'Both Ma and mostly shuddha swars. Romantic and flowing.'],
    ['Desh', 'Night', 'Both Ni. Associated with the monsoon; yearning mood.'],
    ['Durga', 'Night', 'Pentatonic (Sa Re Ma Pa Dha). Calm and devotional; very beginner-friendly.'],
    ['Kafi', 'Night', 'Komal Ga and Ni. Light-classical feel; great for expressive meend.'],
    ['Bageshree', 'Night', 'Komal Ga and Ni. Tender and romantic.'],
    ['Darbari Kanada', 'Night', 'Late-night raga with komal Ga, Dha, Ni and slow, deep andolan on Ga. Majestic.'],
    ['Malkauns', 'Night', 'Pentatonic (Sa komal-Ga Ma komal-Dha komal-Ni). Midnight raga; deep and meditative.'],
    ['Miyan Malhar', 'Monsoon', 'Rainy-season raga with both Ni. Grand and joyful.']
  ];
  const RAGA_GROUPS = ['All', 'Morning', 'Afternoon', 'Evening', 'Night', 'Monsoon'];

  const TECHNIQUES = [
    ['Breath control', 'Breathe from the diaphragm and keep air speed steady so long phrases stay unbroken.'],
    ['Embouchure', 'Rest the blowing hole against your lower lip, aim the air across the edge, and keep your lips soft and flexible.'],
    ['Meend', 'Glide smoothly between swaras by sliding fingers off or half-covering holes while the air stays steady.'],
    ['Kan', 'A quick grace note touched just before the main swar, ornamenting the line.'],
    ['Taan & murki', 'Rapid note runs (taan) and short twisting ornaments (murki): practise slowly, then raise speed.'],
    ['Tonguing (tu-ku)', 'Double-tongue articulation used in jhala and fast passages.'],
    ['Taal & laya', 'Count beats with the hands (tali/khali) to hold Teentaal, Dadra and Keherwa.'],
    ['Dynamics', 'Shape phrases with air pressure; breathe lightly in the lower octave and increase for taar saptak.']
  ];

  const SA_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  // Sa is counted in semitones above C (C3 = 0): 0 to 11 as before, plus -5 to -1 for a low G, G♯, A, A♯ and B
  // (for the bigger bass bansuris). The note name only needs the position within the octave.
  const SA_CHOICES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const saClass = (i) => ((i % 12) + 12) % 12;
  const saName = (i) => SA_NAMES[saClass(i)] + (i < 0 ? ' (low)' : '');
  const saShort = (i) => SA_NAMES[saClass(i)] + (i < 0 ? '↓' : '');

  const $ = (s) => document.querySelector(s);
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => dateKey();
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('flute-journey')) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem('flute-journey', JSON.stringify(v)); } catch {} }
  };
  let state = Object.assign({ log: {}, checks: {}, checkDate: todayKey() }, store.get());
  if (state.checkDate !== todayKey()) { state.checks = {}; state.checkMins = {}; state.checkDate = todayKey(); }
  // Older versions stored only completed days as state.days; keep them as completed log entries.
  if (state.days) {
    Object.keys(state.days).forEach((k) => { if (!state.log[k]) state.log[k] = { minutes: 0, blocks: [], complete: true, legacy: true, note: '' }; });
    delete state.days; store.set(state);
  }
  // A day counts as practised when at least one block was done (or it is a legacy completed day).
  const practised = (k) => { const e = state.log[k]; return !!e && (e.minutes > 0 || !!e.legacy); };
  const practisedDays = () => Object.keys(state.log).filter(practised);
  function streak() {
    let n = 0; const d = new Date();
    if (!practised(dateKey(d))) d.setDate(d.getDate() - 1);
    while (practised(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function recordToday() {
    const k = todayKey(), ids = Object.keys(state.checks).filter((id) => state.checks[id]), e = state.log[k];
    state.checkMins = state.checkMins || {};
    if (!ids.length) {
      if (e && !e.legacy) { if (e.note) Object.assign(e, { minutes: 0, blocks: [], complete: false }); else delete state.log[k]; }
      return;
    }
    const entry = state.log[k] = Object.assign({ note: '' }, e);
    delete entry.legacy;
    // Minutes are stored when a block is ticked, so changing the routine later does not rewrite today.
    entry.blocks = ids;
    entry.minutes = ids.reduce((s, id) => s + (state.checkMins[id] || (BLOCKS.find((b) => b.id === id) || {}).min || 0), 0);
    entry.complete = ROUTINE.length > 0 && ROUTINE.every((r) => state.checks[r.id]);
  }
  function renderStats() {
    const checked = ROUTINE.filter((r) => state.checks[r.id]).reduce((a, r) => a + r.min, 0);
    $('#streak').textContent = streak();
    $('#total').textContent = practisedDays().length;
    $('#minutes').textContent = checked;
    $('#done-msg').hidden = !(state.log[todayKey()] && state.log[todayKey()].complete);
    if (typeof renderToday === 'function') renderToday();
    if (window.FluteProgress) window.FluteProgress.refresh();
  }

  const settings = Object.assign({ sa: 2, bpm: 90, taal: 'Teentaal · 16', tablaVol: 100, droneVol: 100, tanpuraFirst: 'Pa', tanpuraSpeed: 'medium', tanpuraFine: 0, onboarded: false, favs: [], routine: null }, state.settings);
  if (!Number.isInteger(settings.sa) || settings.sa < -5 || settings.sa > 11) settings.sa = 2;
  const saveSettings = () => { state.settings = settings; store.set(state); };
  ROUTINE = planToRoutine(settings.routine);
  const Sound = FluteAudio.Engine;
  const saFreq = (i) => 130.81 * Math.pow(2, i / 12);
  Sound.setTanpura({ first: settings.tanpuraFirst, speed: settings.tanpuraSpeed, fine: settings.tanpuraFine });
  Sound.setSa(saFreq(settings.sa));
  // Create the audio context on first use (needs a user gesture) and apply saved volumes.
  Sound.onCreate = () => { Sound.setVolume('tabla', settings.tablaVol / 100); Sound.setVolume('drone', 0.8 * settings.droneVol / 100); };
  function audio() { Sound.ensure(); return Sound; }
  // Home and the now-playing bar follow the audio and timer state through these events:
  // 'audio' (tanpura or taal on/off, tuning), 'timer' (every tick), 'volume', 'tanpura', 'taal', 'sa'.
  const listeners = {};
  const emit = (k) => (listeners[k] || []).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  const on = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };

  // The Today card sits at the top of the Practice view.
  function markOnboarded() { if (!settings.onboarded) { settings.onboarded = true; saveSettings(); } }
  function renderToday() {
    if (!$('#today')) return;
    const total = ROUTINE.reduce((s, r) => s + r.min, 0);
    const done = ROUTINE.filter((r) => state.checks[r.id]).reduce((s, r) => s + r.min, 0);
    const next = ROUTINE.find((r) => !state.checks[r.id]);
    const sn = streak();
    $('#t-fill').style.width = Math.round(100 * done / total) + '%';
    $('.t-bar').setAttribute('aria-valuenow', Math.round(100 * done / total));
    $('#t-line').textContent = next
      ? `${done} of ${total} minutes done${sn ? ` · ${sn}-day streak` : ''}. Next up: ${next.title} (${next.min} min).`
      : `All ${total} minutes done. Today's riyaaz is complete${sn ? ` · ${sn}-day streak` : ''}.`;
    $('#t-go').textContent = next ? (done ? `Continue: ${next.title}` : 'Start today\'s riyaaz') : 'Practise a block again';
    $('#t-go').dataset.state = next ? 'go' : 'again';
    FluteUI.setLabel($('#t-ragas'), `${nowGroup()} ragas`);
    $('#t-ragas').setAttribute('aria-label', `${nowGroup()} ragas`);
  }
  const nowGroup = () => { const h = new Date().getHours(); return h >= 4 && h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; };

  // Routine
  const rows = {};
  const fmt0 = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function setChecked(id, val) {
    if (val) markOnboarded();
    state.checks[id] = val;
    state.checkMins = state.checkMins || {};
    if (val) state.checkMins[id] = ROUTINE.find((r) => r.id === id).min; else delete state.checkMins[id];
    rows[id].box.checked = val;
    rows[id].li.classList.toggle('done', val);
    recordToday();
    store.set(state); renderStats();
    if (window.PracticeCards) PracticeCards.sync();
  }
  const list = $('#routine');
  const BLOCK_ICON = { breath: '🌬️', sa: '🎵', alankar: '🔁', raga: '🎼', taal: '🥁', cool: '🌙' };
  // Each block is one slide of the swipeable practice cards (carousel behaviour is in practice-cards.js). The
  // card shows live time only for the block the shared timer is on; the others show their full length.
  function renderRoutine() {
    list.innerHTML = ''; Object.keys(rows).forEach((k) => delete rows[k]);
    ROUTINE.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'pc-card'; li.dataset.id = r.id;
      li.setAttribute('role', 'group'); li.setAttribute('aria-roledescription', 'slide');
      li.setAttribute('aria-label', `${r.title}, ${i + 1} of ${ROUTINE.length}`);
      li.innerHTML = `<div class="pc-top"><span class="pc-icon" aria-hidden="true">${BLOCK_ICON[r.id] || '🪈'}</span><span class="pc-step">${i + 1} of ${ROUTINE.length}</span><span class="pc-badge" hidden></span></div>
        <h3>${r.title}</h3><p class="pc-min">${r.min} min</p><p class="pc-text">${r.text}</p>
        <div class="pc-timer" role="timer"><span class="pc-time">${fmt0(r.min * 60)}</span></div>
        <div class="pc-actions"><button type="button" class="btn primary pc-toggle" data-timer>Start</button><button type="button" class="btn ghost pc-reset" disabled>Reset</button></div>
        <button type="button" class="btn small ghost pc-how" data-how>Show me how</button>
        <label class="pc-done"><input type="checkbox" aria-label="Done: ${r.title}"> <span>Done</span></label>`;
      const box = li.querySelector('input');
      rows[r.id] = { li, box, time: li.querySelector('.pc-time'), toggle: li.querySelector('.pc-toggle'), reset: li.querySelector('.pc-reset'), badge: li.querySelector('.pc-badge') };
      box.checked = !!state.checks[r.id];
      li.classList.toggle('done', box.checked);
      box.addEventListener('change', () => { setChecked(r.id, box.checked); if (!box.checked) offerUndo(r); });
      rows[r.id].toggle.addEventListener('click', () => {
        if (block && block.id === r.id) { if (handle) { stop(); remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); renderTimer(); } else start(); }
        else { runAll = false; selectBlock(r, true); }
      });
      rows[r.id].reset.addEventListener('click', () => { if (block && block.id === r.id) { stop(); remaining = block.min * 60; renderTimer(); } });
      li.querySelector('[data-how]').addEventListener('click', () => PracticeDemos.open(r.id));
      list.appendChild(li);
    });
    $('#routine-total').textContent = ROUTINE.reduce((a, r) => a + r.min, 0);
    if (window.PracticeCards) PracticeCards.sync();
  }
  renderRoutine();

  // Unticking removes the block's minutes from today, so a mis-tap can be undone for a few seconds.
  let undoTimer = null;
  function offerUndo(r) {
    const toast = $('#toast');
    $('#toast-text').textContent = `Unticked “${r.title}”.`;
    toast.hidden = false; clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { toast.hidden = true; }, 6000);
    $('#toast-undo').onclick = () => {
      toast.hidden = true; clearTimeout(undoTimer);
      if (rows[r.id] && !state.checks[r.id]) { setChecked(r.id, true); rows[r.id].box.focus(); }
    };
  }

  // Timer (uses wall-clock time so it stays correct if the tab is throttled)
  // The end-of-block bell is scheduled on the audio clock when a block starts, so it rings on time even when
  // the browser delays the interval (screen off, app in the background).
  let block = null, remaining = 0, handle = null, endAt = 0, runAll = false, bellAt = null;
  const fmt = fmt0;
  const goCard = (id, o) => { if (window.PracticeCards) PracticeCards.goTo(id, o); };
  // Shows the time in the timer card and the tab title, and tells the now-playing bar (assets/mini.js) about it, so the
  // timer can be seen from any tab.
  const baseTitle = document.title;
  let cardKey = '', timerShow = false;
  function renderTimer() {
    const show = !!block && remaining > 0 && (!!handle || remaining < block.min * 60);
    // Cards: the block the timer is on shows live time, Pause/Start and a badge; the others show their full length.
    ROUTINE.forEach((r) => {
      const row = rows[r.id]; if (!row) return;
      const mine = !!block && block.id === r.id;
      row.time.textContent = fmt(mine ? remaining : r.min * 60);
      row.toggle.textContent = mine && handle ? 'Pause' : 'Start';
      row.reset.disabled = !(mine && (!!handle || remaining < r.min * 60));
      row.li.classList.toggle('active', mine);
      row.li.classList.toggle('running', mine && !!handle);
      row.badge.hidden = !(mine && show);
      if (mine && show) row.badge.textContent = handle ? '● Running' : '⏸ Paused';
    });
    const key = (block ? block.id : '') + (handle ? 'r' : '') + (show ? 's' : '');
    if (key !== cardKey) { cardKey = key; if (window.PracticeCards) PracticeCards.sync(); }
    timerShow = show;
    saveTimer(show);
    const title = show ? `${handle ? '⏱' : '⏸'} ${fmt(remaining)} · ${block.title}` : baseTitle;
    if (document.title !== title) document.title = title;
    emit('timer');
  }
  // A block under way is saved, so a reload (or the phone discarding the tab) does not lose it. While it runs
  // the saved entry (end time) does not change, so this only writes on start, pause, reset and finish.
  function saveTimer(show) {
    const t = show ? { id: block.id, date: todayKey(), runAll, ...(handle ? { endAt } : { remaining }) } : undefined;
    if (JSON.stringify(t) === JSON.stringify(state.timer)) return;
    if (t) state.timer = t; else delete state.timer;
    store.set(state);
  }
  // Back to the running card (the now-playing bar's timer line).
  function openTimer() {
    FluteNav.go('practice', { focus: false });
    if (!block || !rows[block.id]) return;
    goCard(block.id, { vertical: 'center' });
    rows[block.id].toggle.focus({ preventScroll: true });
  }
  function selectBlock(r, autostart, noScroll) {
    markOnboarded(); stop();
    block = r; remaining = r.min * 60;
    if (!noScroll) goCard(r.id, { vertical: 'nearest' });
    $('#timer-label').textContent = r.title;
    renderTimer();
    if (autostart) start();
  }
  // `restored`: started on page load rather than by a tap, so audio may not start yet; the bell then falls
  // back to ringing from blockDone().
  function start(restored) {
    if (!block || handle) return;
    endAt = Date.now() + remaining * 1000;
    if (!restored) audio();
    bellAt = Sound.ctx && Sound.ctx.state === 'running' ? Sound.ring(Sound.ctx.currentTime + remaining) : null;
    handle = setInterval(() => {
      remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      renderTimer();
      if (remaining <= 0) blockDone();
    }, 250);
    renderTimer(); keepAwake();
  }
  function stop() {
    clearInterval(handle); handle = null;
    if (bellAt) { bellAt.cancel(); bellAt = null; }
    renderTimer(); keepAwake();
  }
  function blockDone() {
    // Keep the scheduled bell unless the audio clock fell behind (it pauses while iOS suspends the page).
    const bellDue = bellAt; bellAt = null;
    stop();
    if (!bellDue || bellDue.at > Sound.ctx.currentTime + 0.5) { if (bellDue) bellDue.cancel(); audio().ring(); }
    setChecked(block.id, true);
    $('#timer-label').textContent = block.title + ' — done!';
    const i = ROUTINE.indexOf(block), next = ROUTINE.slice(i + 1).find((x) => !state.checks[x.id]);
    if (runAll && next) selectBlock(next, true); else runAll = false;
  }
  function runRoutine() {
    markOnboarded();
    const first = ROUTINE.find((x) => !state.checks[x.id]);
    if (!first) { $('#timer-label').textContent = 'All blocks done today — nicely played!'; return; }
    runAll = true; audio(); selectBlock(first, true);
  }
  $('#run-all').addEventListener('click', runRoutine);
  // Today card: continue the routine, or (when it is all done) pick the first block to practise again.
  $('#t-go').addEventListener('click', () => {
    FluteNav.go('practice', { focus: false });
    if (ROUTINE.some((x) => !state.checks[x.id])) runRoutine();
    else { runAll = false; selectBlock(ROUTINE[0], false); }
  });

  // Scale (Sa), tanpura, taal and tempo: the state and the sound. Home (assets/home.js) draws the controls.
  const saListeners = [];
  function setSa(i) {
    settings.sa = i; settings.onboarded = true; saveSettings();
    Sound.setSa(saFreq(settings.sa));
    if (Sound.ctx) Sound.restartDrone();
    renderToday();
    if (typeof renderPicker === 'function' && namesBox.checked) { renderPicker(); showNote(chartTok); }
    saListeners.forEach((f) => f(settings.sa));
    emit('sa'); emit('audio');
  }
  let tuning = false;
  function setDrone(on) {
    on = !!on;
    if (on === Sound.droneOn) return;
    if (on) audio().startDrone(); else Sound.stopDrone();
    keepAwake(); emit('audio');
  }
  // The strings are built in the background; until they are ready the tanpura says it is tuning.
  Sound.onTuning = (v) => { tuning = v; emit('audio'); };
  function setVolume(which, v) {
    v = Math.min(200, Math.max(0, Math.round(Number(v))));
    if (which === 'drone') { settings.droneVol = v; if (Sound.ctx) Sound.setVolume('drone', 0.8 * v / 100); }
    else { settings.tablaVol = v; if (Sound.ctx) Sound.setVolume('tabla', v / 100); }
    saveSettings(); emit('volume');
  }
  // First string (Pa, or Ma / Ni for ragas without Pa), pluck speed and a fine tune in cents for the tanpura alone.
  const tanpuraGet = () => ({ first: settings.tanpuraFirst, speed: settings.tanpuraSpeed, fine: settings.tanpuraFine });
  function setTanpura(patch) {
    if (patch.first !== undefined) settings.tanpuraFirst = patch.first;
    if (patch.speed !== undefined) settings.tanpuraSpeed = patch.speed;
    if (patch.fine !== undefined) settings.tanpuraFine = Math.min(50, Math.max(-50, Math.round(Number(patch.fine))));
    saveSettings();
    Sound.setTanpura(tanpuraGet());
    emit('tanpura');
  }

  // Tabla taal player (sounds are synthesised in audio.js).
  // vib = beats per vibhag; marks: 'X' sam, number tali, 'O' khali.
  const TAALS = {
    'Teentaal · 16': { vib: [4, 4, 4, 4], marks: ['X', '2', 'O', '3'], bols: ['Dha','Dhin','Dhin','Dha','Dha','Dhin','Dhin','Dha','Dha','Tin','Tin','Ta','Ta','Dhin','Dhin','Dha'] },
    'Dadra · 6': { vib: [3, 3], marks: ['X', 'O'], bols: ['Dha','Dhi','Na','Dha','Tu','Na'] },
    'Keherwa · 8': { vib: [4, 4], marks: ['X', 'O'], bols: ['Dha','Ge','Na','Ti','Na','Ka','Dhi','Na'] },
    'Jhaptaal · 10': { vib: [2, 3, 2, 3], marks: ['X', '2', 'O', '3'], bols: ['Dhi','Na','Dhi','Dhi','Na','Ti','Na','Dhi','Dhi','Na'] },
    'Ektaal · 12': { vib: [2, 2, 2, 2, 2, 2], marks: ['X', '2', 'O', 'O', '3', '4'], bols: ['Dhin','Dhin','DhaGe','TiraKita','Tu','Na','Kat','Ta','DhaGe','TiraKita','Dhin','Na'] },
    'Rupak · 7': { vib: [3, 2, 2], marks: ['O', '2', '3'], bols: ['Tin','Tin','Na','Dhi','Na','Dhi','Na'] }
  };
  window.TAALS = TAALS;
  if (!TAALS[settings.taal]) settings.taal = 'Teentaal · 16';
  let taalRun = false;
  const beatListeners = [], bpmListeners = [];
  // The beats come from the shared transport (transport.js), which keeps the tabla and any melody pattern
  // on one clock. This page only starts it, stops it and passes on the beat that is sounding.
  const onBeat = (n, idx) => { if (taalRun) beatListeners.forEach((f) => f(n, idx)); };
  function setTaalRunning(on) {
    on = !!on;
    if (on === taalRun) return;
    taalRun = on;
    const T = FluteTransport;
    if (on) {
      audio();
      const taal = TAALS[settings.taal];
      if (T.running) { T.setBpm(settings.bpm); T.setTaal(taal); T.setTabla(true); T.setOnBeat(onBeat); }
      else T.start({ bpm: settings.bpm, taal, tabla: true, onBeat });
    } else if (T.patternActive) { T.setTabla(false); T.setOnBeat(null); } // a melody keeps the beat grid
    else T.stop();
    keepAwake(); emit('audio');
  }
  function setBpm(v) {
    v = Math.min(240, Math.max(40, Math.round(v)));
    settings.bpm = v; saveSettings();
    if (FluteTransport.running) FluteTransport.setBpm(v);
    bpmListeners.forEach((f) => f(v));
    emit('audio');
  }
  function setTaal(name) {
    if (!TAALS[name] || settings.taal === name) return;
    settings.taal = name; saveSettings();
    if (taalRun) FluteTransport.setTaal(TAALS[name]);
    emit('taal'); emit('audio');
  }

  // Keep the screen on while a block timer, the tabla or the tanpura runs, so a phone on a stand does not
  // lock mid-practice. The browser drops the lock when the page is hidden; it is asked for again on return.
  let wakeLock = null, wakeBusy = false;
  FluteTransport.on(() => keepAwake());
  async function keepAwake() {
    if (!('wakeLock' in navigator) || wakeBusy) return;
    const want = !!handle || taalRun || Sound.droneOn || FluteTransport.running;
    wakeBusy = true;
    try {
      if (want && !wakeLock && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* not allowed here (e.g. low battery); practice works without it */ }
    wakeBusy = false;
    if (want !== (!!handle || taalRun || Sound.droneOn || FluteTransport.running)) keepAwake();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Top up the audio queue now, before the browser starts delaying timers.
      if (FluteTransport.running) FluteTransport.pump();
      if (Sound.droneOn) Sound.droneTick();
    } else keepAwake();
  });

  // Pick up a block that was under way when the page was closed or reloaded today.
  (function restoreTimer() {
    const saved = state.timer, r = saved && saved.date === todayKey() && ROUTINE.find((x) => x.id === saved.id);
    if (!r || state.checks[r.id]) { if (saved) { delete state.timer; store.set(state); } return; }
    runAll = !!saved.runAll;
    if (saved.endAt && saved.endAt <= Date.now()) {
      // It finished while the page was closed: tick it off, and line up the next block without starting it.
      setChecked(r.id, true);
      const next = ROUTINE.slice(ROUTINE.indexOf(r) + 1).find((x) => !state.checks[x.id]);
      if (next && runAll) { selectBlock(next, false, true); goCard(next.id, { smooth: false }); } else { runAll = false; delete state.timer; store.set(state); }
      $('#timer-label').textContent = `${r.title} finished while you were away ✓` + (next && runAll ? ` Next: ${next.title}` : '');
      return;
    }
    block = r;
    remaining = saved.endAt ? Math.ceil((saved.endAt - Date.now()) / 1000) : Math.min(r.min * 60, Math.max(1, saved.remaining | 0));
    goCard(r.id, { smooth: false });
    $('#timer-label').textContent = r.title + (saved.endAt ? ' · still running' : ' · paused');
    if (saved.endAt) start(true); else renderTimer();
  })();

  // Finger-hole chart: tap a swar to see the fingering and hear it at your Sa.
  const chart = FluteDemo.createChart($('#flute'));
  const picker = $('#note-picker'), komalBox = $('#chart-komal'), namesBox = $('#chart-names'), scaleBtn = $('#chart-scale');
  const LETTERS = 'SrRgGmMPdDnN', NATURAL = 'SRGmPDN';
  const CHART = [];
  for (let a = -5; a <= 18; a++) {
    const l = LETTERS[((a % 12) + 12) % 12];
    CHART.push({ a, l, semi: ((a % 12) + 12) % 12, tok: (a < 0 ? '.' : '') + l + (a >= 12 ? "'" : ''), reg: a < 0 ? 'Lower octave' : a < 12 ? 'Middle octave' : 'Upper octave' });
  }
  let chartTok = 'S';
  function paintScale(on) {
    FluteUI.setLabel(scaleBtn, on ? 'Stop' : 'Play the scale'); FluteUI.setIcon(scaleBtn, on ? 'stop' : 'play');
    scaleBtn.classList.toggle('on', on);
  }
  function renderPicker() {
    picker.innerHTML = '';
    ['Lower octave', 'Middle octave', 'Upper octave'].forEach((reg) => {
      const notes = CHART.filter((n) => n.reg === reg && (komalBox.checked || NATURAL.includes(n.l)));
      if (!notes.length) return;
      const wrap = document.createElement('div'); wrap.className = 'note-group';
      wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', reg);
      wrap.innerHTML = `<p class="eyebrow group-label">${reg}</p><div class="notes"></div>`;
      const holder = wrap.querySelector('.notes');
      holder.style.setProperty('--cols', notes.length > 7 ? 6 : 7); // 12 swars make two rows of six; 7 or fewer make one row
      notes.forEach((n) => {
        const sw = FluteDemo.parseSwar(n.tok), b = document.createElement('button');
        b.type = 'button'; b.dataset.tok = n.tok; b.setAttribute('aria-pressed', n.tok === chartTok);
        b.innerHTML = sw.label + (namesBox.checked ? `<small>${SA_NAMES[saClass(settings.sa + n.semi)]}</small>` : '');
        b.addEventListener('click', () => { scaleOn = false; paintScale(false); showNote(n.tok); playNote(n.tok); });
        holder.appendChild(b);
      });
      picker.appendChild(wrap);
    });
  }
  function showNote(tok) {
    const sw = FluteDemo.parseSwar(tok); chartTok = tok;
    chart.show(sw.closed, sw.half, sw.over);
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tok === tok));
    const n = CHART.find((c) => c.tok === tok);
    const name = namesBox.checked ? ` (${SA_NAMES[saClass(settings.sa + n.semi)]} at your Sa)` : '';
    $('#note-info').textContent = FluteDemo.describe(sw).replace(/\.$/, '') + name + '. A simplified chart; exact fingering varies with the bansuri and your guru\'s school.';
  }
  function playNote(tok) { FluteDemo.player.play([{ tok, beats: 2 }], 80, { onStep() {}, onEnd() {} }); }
  let scaleOn = false;
  const resetScale = () => { scaleOn = false; paintScale(false); };
  FluteDemo.player.hooks.push(resetScale);
  scaleBtn.addEventListener('click', () => {
    if (scaleOn) { FluteDemo.player.stop(); return; }
    const items = "S R G m P D N S'".split(' ').map((tok) => ({ tok, beats: 1, ref: tok }));
    items[items.length - 1].beats = 2;
    FluteDemo.player.play(items, 80, { onStep(step) { if (step) showNote(step.ref); }, onEnd() { showNote('S'); } });
    scaleOn = true; paintScale(true);
  });
  komalBox.addEventListener('change', () => { renderPicker(); });
  namesBox.addEventListener('change', () => { renderPicker(); showNote(chartTok); });
  picker.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = [...picker.querySelectorAll('button')], i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault(); const nx = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length]; nx.focus();
  });
  renderPicker(); showNote('S');

  // Roadmap, ragas, techniques
  $('#roadmap-list').innerHTML = STAGES.map(([t, when, items], i) =>
    `<li><span class="node" aria-hidden="true">${i + 1}</span><h3>${t.split(' · ')[1] || t}</h3><p class="when">${when}</p><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul></li>`).join('');
  // Ragas: a time-of-day filter row, a search field, and one grouped list. A row opens the raga's demo sheet.
  const STARTER = ['Bhoopali', 'Durga', 'Hamsadhwani', 'Yaman', 'Kafi', 'Khamaj'];
  const GROUP_ICON = { Morning: 'sunrise', Afternoon: 'sun', Evening: 'sunset', Night: 'moon', Monsoon: 'rain' };
  const rf = { group: 'All', q: '', starter: false, fav: false };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const summary = (d) => d.split(/(?<=\.)\s/)[0]; // the first sentence is the one-line summary; the sheet shows all of it
  const ragaList = $('#raga-cards'), timeRow = $('#raga-filter');
  const favLabel = (t, fav) => `${fav ? 'Remove' : 'Add'} ${t} ${fav ? 'from' : 'to'} favourites`;
  function ragaRow([t, g, d]) {
    const fav = settings.favs.includes(t), notated = !!window.RAGA_NOTATION[t];
    return `<article class="row raga-row">
      <button type="button" class="raga-open" data-raga="${t}" data-group="${g}" aria-label="${t}, ${g} raga: ${notated ? 'how to play' : 'details'}">
        <span class="tile" aria-hidden="true">${FluteUI.icon(GROUP_ICON[g] || 'sunrise')}</span>
        <span class="grow"><b>${t}${STARTER.includes(t) ? ' <span class="tag">Starter</span>' : ''}</b><small>${esc(summary(d))}</small></span>
      </button>
      ${notated ? `<button type="button" class="play" data-hear="${t}" aria-label="Hear aroha of ${t}">${FluteUI.icon('play')}</button>` : '<span class="tag soon">Demo soon</span>'}
      <button type="button" class="star" data-fav="${t}" aria-pressed="${fav}" aria-label="${favLabel(t, fav)}">${FluteUI.icon('star')}</button>
    </article>`;
  }
  // Keeps the selected time of day in view in the scrolling filter row, and fades its right edge while more follows.
  function placeFilter() {
    const on = timeRow.querySelector('[aria-pressed="true"]');
    if (on && timeRow.clientWidth) timeRow.scrollLeft = on.offsetLeft - (timeRow.clientWidth - on.offsetWidth) / 2;
    timeRow.classList.toggle('more', timeRow.scrollLeft + timeRow.clientWidth < timeRow.scrollWidth - 4);
  }
  function showRagas() {
    const q = rf.q.trim().toLowerCase();
    const shown = RAGAS.filter(([t, g, d]) => (rf.group === 'All' || g === rf.group)
      && (!rf.starter || STARTER.includes(t)) && (!rf.fav || settings.favs.includes(t))
      && (!q || (t + ' ' + g + ' ' + d).toLowerCase().includes(q)));
    ragaList.classList.toggle('list', shown.length > 0);
    ragaList.innerHTML = shown.length ? shown.map(ragaRow).join('')
      : '<div class="raga-empty"><p>No ragas match.</p><button type="button" class="btn sm" data-clear>Clear filters</button></div>';
    $('#raga-count').textContent = `${shown.length} of ${RAGAS.length} ragas`;
    timeRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', rf.group === b.dataset.v));
    $('#raga-flags').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', rf[b.dataset.kind]));
    placeFilter();
  }
  // a change of filter or search also ends a running aroha preview, whose button is about to be replaced
  const refilter = () => { FluteDemo.player.stop(); showRagas(); };
  RAGA_GROUPS.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = g; b.dataset.v = g;
    b.addEventListener('click', () => { rf.group = g; refilter(); });
    timeRow.appendChild(b);
  });
  [['starter', 'Starter', ''], ['fav', 'Favourites', 'star']].forEach(([kind, label, icon]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.kind = kind; b.innerHTML = (icon ? FluteUI.icon(icon) : '') + label;
    b.addEventListener('click', () => { rf[kind] = !rf[kind]; refilter(); });
    $('#raga-flags').appendChild(b);
  });
  timeRow.addEventListener('scroll', () => timeRow.classList.toggle('more', timeRow.scrollLeft + timeRow.clientWidth < timeRow.scrollWidth - 4), { passive: true });
  // the header button shows the icon of the current time of day (sunrise, sun, sunset, moon)
  const paintNow = () => FluteUI.setIcon($('#raga-now'), GROUP_ICON[nowGroup()]);
  new ResizeObserver(() => { placeFilter(); paintNow(); }).observe(timeRow); // runs when the tab is shown, when the row can first be measured
  $('#raga-search').addEventListener('input', (e) => { rf.q = e.target.value; refilter(); });
  const nowLabel = () => `Ragas for ${nowGroup()}`;
  $('#raga-now').setAttribute('aria-label', nowLabel()); $('#raga-now').title = nowLabel(); paintNow();
  function ragasForNow() {
    Object.assign(rf, { group: nowGroup(), q: '', starter: false, fav: false }); $('#raga-search').value = ''; refilter();
    FluteNav.go('ragas', { top: true });
  }
  $('#raga-now').addEventListener('click', ragasForNow);
  $('#t-ragas').addEventListener('click', (e) => { e.preventDefault(); ragasForNow(); });
  $('#done-ragas').addEventListener('click', (e) => { e.preventDefault(); ragasForNow(); });
  showRagas();
  ragaList.parentNode.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]'), hear = e.target.closest('[data-hear]'), open = e.target.closest('[data-raga]');
    if (e.target.closest('[data-clear]')) {
      Object.assign(rf, { group: 'All', q: '', starter: false, fav: false }); $('#raga-search').value = ''; refilter();
      $('#raga-search').focus();
    } else if (fav) {
      const n = fav.dataset.fav, i = settings.favs.indexOf(n);
      if (i >= 0) settings.favs.splice(i, 1); else settings.favs.push(n);
      saveSettings();
      if (rf.fav) { showRagas(); } // the list itself changes
      else { const on = i < 0; fav.setAttribute('aria-pressed', on); fav.setAttribute('aria-label', favLabel(n, on)); } // only the star changes
    } else if (hear) { audio(); FluteDemo.preview(hear.dataset.hear, hear); }
    else if (open) FluteDemo.ragaDemo(open.dataset.raga, open.dataset.group, (RAGAS.find((r) => r[0] === open.dataset.raga) || [])[2]);
  });
  $('#technique-cards').innerHTML = TECHNIQUES.map(([t, d], i) =>
    `<div class="row tech"><span class="tnum" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="grow"><b>${t}</b><small>${d}</small></div></div>`).join('');

  // Keyboard shortcuts: T tanpura, B tabla, [ ] tempo (5 BPM), / search ragas
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea, [contenteditable]') || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === 't') setDrone(!Sound.droneOn);
    else if (k === 'b') setTaalRunning(!taalRun);
    else if (k === '[') setBpm(settings.bpm - 5);
    else if (k === ']') setBpm(settings.bpm + 5);
    else if (k === '/') { e.preventDefault(); FluteNav.go('ragas', { focus: false }); $('#raga-search').focus(); }
    else return;
  });

  renderStats();

  // Small API for progress.js (calendar, routine editor, backup).
  window.FluteApp = {
    BLOCKS, state: () => state, settings, dateKey, setSa, todayKey, streak, practised, practisedDays, defaultPlan,
    routine: () => ROUTINE,
    timerBlockId: () => (block ? block.id : null), // the block the shared timer is on (for the practice cards)
    saveState: () => store.set(state),
    // Pauses the tanpura and tabla (for the tuner, so the microphone hears only the flute). Returns the names
    // of what was paused and a restore() that switches them back on.
    quiet() {
      const drone = Sound.droneOn, tabla = taalRun, paused = [];
      if (drone) { setDrone(false); paused.push('tanpura'); }
      if (tabla) { setTaalRunning(false); paused.push('tabla'); }
      return { paused, restore() { if (drone && !Sound.droneOn) setDrone(true); if (tabla && !taalRun) setTaalRunning(true); } };
    },
    setPlan(plan) {
      if (handle) stop();
      block = null; remaining = 0; runAll = false; $('#timer-label').textContent = 'Pick a block to start its timer'; renderTimer();
      settings.routine = plan; ROUTINE = planToRoutine(plan); saveSettings();
      recordToday(); store.set(state); renderRoutine(); renderStats();
    }
  };
  if (window.FluteProgress) window.FluteProgress.refresh();

  // Hooks for the Home tab, the now-playing bar and the Alankar tab: the shared scale, tempo, taal, tabla, tanpura,
  // volumes and settings. `on(kind, fn)` follows 'audio', 'timer', 'volume', 'tanpura', 'taal' and 'sa'.
  Object.assign(window.FluteApp, {
    saveSettings, on,
    sa: () => settings.sa, onSa: (fn) => saListeners.push(fn),
    saChoices: () => SA_CHOICES.slice(), saName, saShort, saFreq,
    bpm: () => settings.bpm, setBpm, onBpm: (fn) => bpmListeners.push(fn),
    taalName: () => settings.taal, taals: () => Object.keys(TAALS), setTaal,
    onBeat: (fn) => beatListeners.push(fn),
    tabla: { on: () => taalRun, set: setTaalRunning, toggle: () => setTaalRunning(!taalRun) },
    drone: { on: () => Sound.droneOn, set: setDrone, toggle: () => setDrone(!Sound.droneOn), tuning: () => tuning },
    tanpura: { get: tanpuraGet, set: setTanpura },
    volume: (which) => (which === 'drone' ? settings.droneVol : settings.tablaVol), setVolume,
    // the running block timer, for the now-playing bar; openTimer() goes back to its card
    timerInfo: () => ({ show: timerShow, running: !!handle, remaining, title: block ? block.title : '', id: block ? block.id : null }),
    openTimer,
    // 'off' (not in today's routine), 'todo' or 'done'; markBlock ticks a block off like the checkbox does.
    blockState: (id) => { const r = ROUTINE.find((x) => x.id === id); return !r ? 'off' : state.checks[id] ? 'done' : 'todo'; },
    markBlock(id) { if (!ROUTINE.some((x) => x.id === id) || state.checks[id]) return false; setChecked(id, true); return true; }
  });

  // Install as an app + offline support
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('#install').hidden = false; });
  $('#install').addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt(); await installEvent.userChoice; installEvent = null; $('#install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('#install').hidden = true; });
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (/iphone|ipad/i.test(navigator.userAgent) && !standalone) $('#ios-hint').hidden = false;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { $('#offline-ok').hidden = false; }).catch(() => {});
  }
})();
