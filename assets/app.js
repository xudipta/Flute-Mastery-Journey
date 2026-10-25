(() => {
  const ROUTINE = [
    { id: 'breath', title: 'Breathing & posture', min: 3, text: 'Stand tall, relax shoulders. Inhale 4 counts, exhale 8 counts, repeat.' },
    { id: 'tone', title: 'Long tones', min: 7, text: 'Hold each note from low D up to C for 8 slow beats. Aim for a steady, centred sound.' },
    { id: 'scales', title: 'Scales & arpeggios', min: 8, text: 'One major scale a day, slow with a metronome, then up one notch.' },
    { id: 'tech', title: 'Technique focus', min: 7, text: 'Pick a technique below (articulation, slurs, vibrato) and work it deliberately.' },
    { id: 'rep', title: 'Repertoire', min: 10, text: 'Play through a piece. Isolate the hardest bar and loop it slowly.' },
    { id: 'cool', title: 'Cool-down', min: 2, text: 'Play a quiet, easy melody. End on a note you enjoy.' }
  ];

  // Closed keys per note. Th=thumb, L1-L3 left hand, R1-R3 right hand, RP right pinky.
  const NOTES = [
    ['D4', ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'RP']],
    ['E4', ['L1', 'L2', 'L3', 'R1', 'R2', 'R3']],
    ['F4', ['Th', 'L1', 'L2', 'L3', 'R1', 'R3']],
    ['G4', ['Th', 'L1', 'L2', 'L3']],
    ['A4', ['Th', 'L1', 'L2']],
    ['B4', ['Th', 'L1']],
    ['C5', ['L2']]
  ];
  const KEYS = [['Th', 60], ['L1', 150], ['L2', 205], ['L3', 260], ['R1', 380], ['R2', 435], ['R3', 490], ['RP', 560]];

  const STAGES = [
    ['Stage 1 · Foundations', 'Weeks 1–8', ['Assemble, hold and care for the flute', 'Produce a clear tone on the headjoint, then full flute', 'Notes D4–C5, quarter and half notes']],
    ['Stage 2 · Building control', 'Months 3–6', ['Full range incl. low C and second octave', 'Major scales to 3 sharps/flats', 'Tonguing, slurs and basic dynamics']],
    ['Stage 3 · Musicianship', 'Months 6–12', ['All major and minor scales', 'Vibrato, phrasing and intonation', 'Simple sonatas and etudes']],
    ['Stage 4 · Advanced technique', 'Years 2–4', ['Third octave and harmonics', 'Double and triple tonguing', 'Orchestral excerpts, exams or auditions']],
    ['Stage 5 · Professional', 'Years 4+', ['Concert repertoire and stage presence', 'Extended techniques: flutter tongue, multiphonics', 'Teaching, ensemble and solo performance']]
  ];

  const TECHNIQUES = [
    ['🌬️', 'Breath support', 'Breathe low into the belly; keep air speed steady with a relaxed throat.'],
    ['👄', 'Embouchure', 'Small, flexible aperture. Angle the air to aim at the far edge of the embouchure hole.'],
    ['🗣️', 'Articulation', 'Say "too" or "doo" lightly; the tongue starts the note, air keeps it alive.'],
    ['🔗', 'Slurs & legato', 'Connect notes with continuous air and quiet fingers.'],
    ['〰️', 'Vibrato', 'Pulse the air from the diaphragm in even waves, starting slow.'],
    ['🎚️', 'Dynamics', 'Control volume with air speed and lip aperture, not by biting down.']
  ];

  const $ = (s) => document.querySelector(s);
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('flute-journey')) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem('flute-journey', JSON.stringify(v)); } catch {} }
  };
  let state = Object.assign({ days: {}, checks: {}, checkDate: todayKey() }, store.get());
  if (state.checkDate !== todayKey()) { state.checks = {}; state.checkDate = todayKey(); }

  function streak() {
    let n = 0; const d = new Date();
    if (!state.days[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1);
    while (state.days[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStats() {
    const checked = ROUTINE.filter((r) => state.checks[r.id]).reduce((a, r) => a + r.min, 0);
    $('#streak').textContent = streak();
    $('#total').textContent = Object.keys(state.days).length;
    $('#minutes').textContent = checked;
    $('#done-msg').hidden = !state.days[todayKey()];
  }

  // Routine
  const list = $('#routine');
  ROUTINE.forEach((r) => {
    const li = document.createElement('li');
    li.dataset.id = r.id;
    li.innerHTML = `<input type="checkbox" aria-label="Done: ${r.title}"><div><h3>${r.title} · ${r.min} min</h3><p>${r.text}</p><button type="button">Start timer</button></div>`;
    const box = li.querySelector('input');
    box.checked = !!state.checks[r.id];
    li.classList.toggle('done', box.checked);
    box.addEventListener('change', () => {
      state.checks[r.id] = box.checked;
      li.classList.toggle('done', box.checked);
      if (ROUTINE.every((x) => state.checks[x.id])) state.days[todayKey()] = true;
      else delete state.days[todayKey()];
      store.set(state); renderStats();
    });
    li.querySelector('button').addEventListener('click', () => selectBlock(r, li, true));
    list.appendChild(li);
  });

  // Timer
  let block = null, remaining = 0, handle = null;
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function selectBlock(r, li, autostart) {
    stop();
    block = r; remaining = r.min * 60;
    document.querySelectorAll('.routine li').forEach((x) => x.classList.toggle('active', x === li));
    $('#timer-label').textContent = r.title;
    $('#timer').textContent = fmt(remaining);
    if (autostart) start();
  }
  function start() {
    if (!block || handle) return;
    $('#timer-toggle').textContent = 'Pause';
    handle = setInterval(() => {
      remaining--; $('#timer').textContent = fmt(Math.max(remaining, 0));
      if (remaining <= 0) { stop(); $('#timer-label').textContent = block.title + ' — done!'; }
    }, 1000);
  }
  function stop() { clearInterval(handle); handle = null; $('#timer-toggle').textContent = 'Start'; }
  $('#timer-toggle').addEventListener('click', () => (handle ? stop() : start()));
  $('#timer-reset').addEventListener('click', () => { if (block) { stop(); remaining = block.min * 60; $('#timer').textContent = fmt(remaining); } });

  // Fingering chart
  const svg = $('#flute');
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  add('rect', { class: 'body', x: 20, y: 52, width: 600, height: 16, rx: 8 });
  add('rect', { class: 'body', x: 20, y: 46, width: 40, height: 28, rx: 6 });
  const keyEls = {};
  KEYS.forEach(([id, x]) => {
    keyEls[id] = add('circle', { class: 'key', cx: x, cy: id === 'Th' ? 92 : 60, r: 14 });
    const t = add('text', { x, y: id === 'Th' ? 125 : 100 });
    t.textContent = id === 'Th' ? 'Thumb' : id;
  });
  add('text', { x: 205, y: 28 }).textContent = 'LEFT HAND';
  add('text', { x: 490, y: 28 }).textContent = 'RIGHT HAND';
  const picker = $('#note-picker');
  function showNote(name) {
    const entry = NOTES.find((n) => n[0] === name);
    Object.entries(keyEls).forEach(([id, el]) => el.classList.toggle('on', entry[1].includes(id)));
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.textContent === name));
    $('#note-info').textContent = `${name}: ${entry[1].join(', ')} pressed. Simplified beginner fingering — check a full chart for alternates.`;
  }
  NOTES.forEach(([n]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = n;
    b.addEventListener('click', () => showNote(n));
    picker.appendChild(b);
  });
  showNote('G4');

  // Roadmap & techniques
  $('#roadmap-list').innerHTML = STAGES.map(([t, when, items]) =>
    `<article class="stage"><h3>${t}</h3><small>${when}</small><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></article>`).join('');
  $('#technique-cards').innerHTML = TECHNIQUES.map(([i, t, d]) =>
    `<article class="card"><div class="icon">${i}</div><h3>${t}</h3><p>${d}</p></article>`).join('');

  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Clear all saved practice progress?')) { state = { days: {}, checks: {}, checkDate: todayKey() }; store.set(state); location.reload(); }
  });
  renderStats();
})();
