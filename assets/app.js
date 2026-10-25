(() => {
  const ROUTINE = [
    { id: 'breath', title: 'Pranayama & posture', min: 5, text: 'Sit tall, shoulders soft. Slow diaphragmatic breaths: inhale 4 counts, exhale 8, then blow a steady airstream without the flute.' },
    { id: 'sa', title: 'Sur sadhana (long tones)', min: 10, text: 'With the tanpura on, hold Sa, then Pa, then each swar for a full breath. Listen for a steady, round tone.' },
    { id: 'alankar', title: 'Alankars / paltas', min: 10, text: 'Practise patterns like Sa Re Ga, Re Ga Ma… in ascending and descending order, slowly and evenly.' },
    { id: 'raga', title: 'Raga alaap', min: 15, text: 'Choose a raga. Unfold it slowly: establish Sa, touch each swar with meend, rest on the vadi and samvadi.' },
    { id: 'taal', title: 'Taan & taal practice', min: 10, text: 'Clap or keep Teentaal (16 beats). Play simple taans and tihais that land exactly on sam.' },
    { id: 'cool', title: 'Bandish / cool-down', min: 5, text: 'Play a composition or a gentle bhajan-style melody. End softly on Sa.' }
  ];

  // Six finger holes: H1-H3 left hand, H4-H6 right hand. Progressive-lift beginner chart.
  const NOTES = [
    ['Pa (low)', 'Pa', ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']],
    ['Dha', 'Dha', ['H1', 'H2', 'H3', 'H4', 'H5']],
    ['Ni', 'Ni', ['H1', 'H2', 'H3', 'H4']],
    ['Sa', 'Sa', ['H1', 'H2', 'H3']],
    ['Re', 'Re', ['H1', 'H2']],
    ['Ga', 'Ga', ['H1']],
    ['Ma', 'Ma', []]
  ];
  const HOLES = [['H1', 180], ['H2', 235], ['H3', 290], ['H4', 400], ['H5', 455], ['H6', 510]];

  const STAGES = [
    ['Stage 1 · Foundations', 'Months 1–3', ['Hold the bansuri, learn posture and breath control', 'Produce a clear tone across the blowing edge', 'Shuddha swaras Sa Re Ga Ma Pa Dha Ni and simple alankars']],
    ['Stage 2 · First ragas', 'Months 3–8', ['Raga Bhoopali and Raga Yaman, with their aroha and avaroha', 'Meend (glide) and kan (grace note)', 'Keeping Teentaal and Dadra, and playing simple bandishes']],
    ['Stage 3 · Alaap & control', 'Year 1–2', ['Raga Bhairav, Kafi, Bhimpalasi and Desh', 'Slow alaap with a steady breath', 'Madhya saptak and the start of taar saptak']],
    ['Stage 4 · Laykari & taan', 'Years 2–4', ['Fast taans, murki and gamak', 'Jod, jhala and tihai; gat in Madhya and Drut laya', 'Playing with a tabla accompanist']],
    ['Stage 5 · Concert level', 'Years 4+', ['Full raga exposition: alaap, jod, jhala and gat', 'Playing different-sized bansuris', 'Learning under a guru, performing and teaching']]
  ];

  const RAGAS = [
    ['🌅', 'Raga Bhairav', 'Morning raga. Sa, komal Re, Ga, Ma, Pa, komal Dha, Ni. Serious, devotional mood.'],
    ['🌙', 'Raga Yaman', 'Evening raga. Uses tivra Ma. Graceful and serene — a good first full raga.'],
    ['🌄', 'Raga Bhoopali', 'Pentatonic (Sa Re Ga Pa Dha). Sweet and easy to shape; ideal for beginners.'],
    ['🌧️', 'Raga Kafi', 'Late-night, light-classical feel. Komal Ga and Ni; great for expressive meend.'],
    ['🌞', 'Raga Desh', 'Monsoon and evening raga. Both Ni; yearning mood.'],
    ['🔔', 'Raga Bhimpalasi', 'Afternoon raga. Komal Ga and Ni; tender, longing character.']
  ];

  const TECHNIQUES = [
    ['🌬️', 'Breath control', 'Breathe from the diaphragm and keep air speed steady so long phrases stay unbroken.'],
    ['👄', 'Embouchure', 'Rest the blowing hole against your lower lip, aim the air across the edge, and keep your lips soft and flexible.'],
    ['〰️', 'Meend', 'Glide smoothly between swaras by sliding fingers off or half-covering holes while the air stays steady.'],
    ['✨', 'Kan', 'A quick grace note touched just before the main swar, ornamenting the line.'],
    ['⚡', 'Taan & murki', 'Rapid note runs (taan) and short twisting ornaments (murki) — practise slowly, then raise speed.'],
    ['🗣️', 'Tonguing (tu-ku)', 'Double-tongue articulation used in jhala and fast passages.'],
    ['🥁', 'Taal & laya', 'Count beats with the hands (tali/khali) to hold Teentaal, Dadra and Keherwa.'],
    ['🎚️', 'Dynamics', 'Shape phrases with air pressure; breathe lightly in the lower octave and increase for taar saptak.']
  ];

  const SA_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];

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

  // Tanpura-style drone: Pa below, Sa, Sa, Sa above, cycled with a slow pluck envelope.
  const saSelect = $('#sa-select');
  SA_NAMES.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; saSelect.appendChild(o); });
  saSelect.value = 2;
  let ctx = null, droneTimer = null, droneOn = false;
  const saFreq = () => 130.81 * Math.pow(2, Number(saSelect.value) / 12);
  function pluck(freq, when) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.12, when + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 4);
    o.connect(f); f.connect(g); g.connect(ctx.destination);
    o.start(when); o.stop(when + 4.1);
  }
  function cycle() {
    const sa = saFreq(), t = ctx.currentTime + 0.05;
    [sa * 0.75, sa, sa, sa / 2].forEach((f, i) => pluck(f, t + i * 1));
  }
  function toggleDrone() {
    droneOn = !droneOn;
    $('#drone-toggle').classList.toggle('on', droneOn);
    if (droneOn) {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume(); cycle(); droneTimer = setInterval(cycle, 4000);
    } else { clearInterval(droneTimer); }
  }
  $('#drone-toggle').addEventListener('click', toggleDrone);
  saSelect.addEventListener('change', () => { if (droneOn) { clearInterval(droneTimer); cycle(); droneTimer = setInterval(cycle, 4000); } });

  // Finger-hole chart
  const svg = $('#flute');
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  add('rect', { class: 'body', x: 20, y: 60, width: 600, height: 24, rx: 12 });
  add('ellipse', { class: 'hole', cx: 85, cy: 72, rx: 14, ry: 8 });
  add('text', { x: 85, y: 108 }).textContent = 'Blowing hole';
  add('text', { x: 235, y: 36 }).textContent = 'LEFT HAND';
  add('text', { x: 455, y: 36 }).textContent = 'RIGHT HAND';
  const holeEls = {};
  HOLES.forEach(([id, x], i) => {
    holeEls[id] = add('circle', { class: 'key', cx: x, cy: 72, r: 13 });
    add('text', { x, y: 108 }).textContent = String(i + 1);
  });
  add('text', { x: 560, y: 140 }).textContent = 'Open end';
  const picker = $('#note-picker');
  function showNote(label) {
    const entry = NOTES.find((n) => n[0] === label);
    Object.entries(holeEls).forEach(([id, el]) => el.classList.toggle('on', entry[2].includes(id)));
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.label === label));
    const closed = entry[2].map((h) => h.slice(1)).join(', ') || 'none';
    $('#note-info').textContent = `${entry[1]}: holes covered — ${closed}. A simplified beginner chart; exact fingering varies with the bansuri's pitch and your guru's school.`;
  }
  NOTES.forEach(([label, short]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = short; b.dataset.label = label;
    b.addEventListener('click', () => showNote(label));
    picker.appendChild(b);
  });
  showNote('Sa');

  // Roadmap, ragas, techniques
  $('#roadmap-list').innerHTML = STAGES.map(([t, when, items]) =>
    `<article class="stage"><h3>${t}</h3><small>${when}</small><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></article>`).join('');
  const cards = (arr) => arr.map(([i, t, d]) => `<article class="card"><div class="icon">${i}</div><h3>${t}</h3><p>${d}</p></article>`).join('');
  $('#raga-cards').innerHTML = cards(RAGAS);
  $('#technique-cards').innerHTML = cards(TECHNIQUES);

  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Clear all saved practice progress?')) { state = { days: {}, checks: {}, checkDate: todayKey() }; store.set(state); location.reload(); }
  });
  renderStats();
})();
