(() => {
  const ROUTINE = [
    { id: 'breath', title: 'Pranayama & posture', min: 5, text: 'Sit tall, shoulders soft. Slow diaphragmatic breaths: inhale 4 counts, exhale 8, then blow a steady airstream without the flute.' },
    { id: 'sa', title: 'Sur sadhana (long tones)', min: 10, text: 'With the tanpura on, hold Sa, then Pa, then each swar for a full breath. Listen for a steady, round tone.' },
    { id: 'alankar', title: 'Alankars / paltas', min: 10, text: 'Practise patterns like Sa Re Ga, Re Ga Ma… in ascending and descending order, slowly and evenly.' },
    { id: 'raga', title: 'Raga alaap', min: 15, text: 'Choose a raga. Unfold it slowly: establish Sa, touch each swar with meend, rest on the vadi and samvadi.' },
    { id: 'taal', title: 'Taan & taal practice', min: 10, text: 'Clap or keep Teentaal (16 beats). Play simple taans and tihais that land exactly on sam.' },
    { id: 'cool', title: 'Bandish / cool-down', min: 5, text: 'Play a composition or a gentle bhajan-style melody. End softly on Sa.' }
  ];

  // Six finger holes: H1-H3 left hand, H4-H6 right hand. Progressive-lift beginner chart: [label, short, covered, half-covered].
  const NOTES = [
    ['Pa (low)', 'Pa', ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'], []],
    ['Dha', 'Dha', ['H1', 'H2', 'H3', 'H4', 'H5'], []],
    ['Ni', 'Ni', ['H1', 'H2', 'H3', 'H4'], []],
    ['Sa', 'Sa', ['H1', 'H2', 'H3'], []],
    ['Re', 'Re', ['H1', 'H2'], []],
    ['Ga', 'Ga', ['H1'], []],
    ['Ma', 'Ma', [], ['H1']]
  ];
  const HOLES = [['H1', 180], ['H2', 235], ['H3', 290], ['H4', 400], ['H5', 455], ['H6', 510]];

  const STAGES = [
    ['Stage 1 · Foundations', 'Months 1–3', ['Hold the bansuri, learn posture and breath control', 'Produce a clear tone across the blowing edge', 'Shuddha swaras Sa Re Ga Ma Pa Dha Ni and simple alankars']],
    ['Stage 2 · First ragas', 'Months 3–8', ['Raga Bhoopali and Raga Yaman, with their aroha and avaroha', 'Meend (glide) and kan (grace note)', 'Keeping Teentaal and Dadra, and playing simple bandishes']],
    ['Stage 3 · Alaap & control', 'Year 1–2', ['Raga Bhairav, Kafi, Bhimpalasi and Desh', 'Slow alaap with a steady breath', 'Madhya saptak and the start of taar saptak']],
    ['Stage 4 · Laykari & taan', 'Years 2–4', ['Fast taans, murki and gamak', 'Jod, jhala and tihai; gat in Madhya and Drut laya', 'Playing with a tabla accompanist']],
    ['Stage 5 · Concert level', 'Years 4+', ['Full raga exposition: alaap, jod, jhala and gat', 'Playing different-sized bansuris', 'Learning under a guru, performing and teaching']]
  ];

  // [icon, name, time group, description]
  const RAGAS = [
    ['🌅', 'Bhairav', 'Morning', 'Dawn raga with komal Re and Dha. Serious, devotional mood.'],
    ['🌄', 'Ahir Bhairav', 'Morning', 'Komal Re and komal Ni, blending Bhairav and Kafi flavours. Calm and expansive.'],
    ['🌤️', 'Lalit', 'Morning', 'Pre-dawn raga with both Ma and no Pa. Restless, searching mood.'],
    ['☀️', 'Todi', 'Morning', 'Komal Re, Ga and Dha with tivra Ma. Deep, intense and rich in meend.'],
    ['🌞', 'Asavari', 'Morning', 'Komal Ga, Dha and Ni. Pensive and tender.'],
    ['🏞️', 'Jaunpuri', 'Morning', 'Close to Asavari, with natural Dha. Pathos and gravity.'],
    ['🌻', 'Bhimpalasi', 'Afternoon', 'Komal Ga and Ni. Tender, longing character.'],
    ['🌾', 'Shuddha Sarang', 'Afternoon', 'Both Ma with Ni komal. Bright and spacious.'],
    ['🌇', 'Madhuvanti', 'Afternoon', 'Komal Ga with tivra Ma. Sweet and romantic.'],
    ['🌆', 'Marwa', 'Evening', 'Sunset raga with komal Re, tivra Ma and a weak Pa. Restless, yearning tension.'],
    ['🌅', 'Puriya', 'Evening', 'Komal Re and tivra Ma with a strong Ga. Stately and sober.'],
    ['🌙', 'Yaman', 'Evening', 'Uses tivra Ma. Graceful and serene — a good first full raga.'],
    ['🪔', 'Bhoopali', 'Evening', 'Pentatonic (Sa Re Ga Pa Dha). Sweet and easy to shape; ideal for beginners.'],
    ['🦢', 'Hamsadhwani', 'Evening', 'Pentatonic (Sa Re Ga Pa Ni). Bright and joyful; popular for openings.'],
    ['🎶', 'Khamaj', 'Evening', 'Both Ni. Light, playful, ideal for thumri-style phrases.'],
    ['🌃', 'Bihag', 'Night', 'Both Ma and mostly shuddha swars. Romantic and flowing.'],
    ['🌧️', 'Desh', 'Night', 'Both Ni. Associated with the monsoon; yearning mood.'],
    ['🌌', 'Durga', 'Night', 'Pentatonic (Sa Re Ma Pa Dha). Calm and devotional; very beginner-friendly.'],
    ['🌠', 'Kafi', 'Night', 'Komal Ga and Ni. Light-classical feel; great for expressive meend.'],
    ['🌑', 'Bageshree', 'Night', 'Komal Ga and Ni. Tender and romantic.'],
    ['🌒', 'Darbari Kanada', 'Night', 'Late-night raga with komal Ga, Dha, Ni and slow, deep andolan on Ga. Majestic.'],
    ['🕯️', 'Malkauns', 'Night', 'Pentatonic (Sa komal-Ga Ma komal-Dha komal-Ni). Midnight raga; deep and meditative.'],
    ['⛈️', 'Miyan Malhar', 'Monsoon', 'Rainy-season raga with both Ni. Grand and joyful.']
  ];
  const RAGA_GROUPS = ['All', 'Morning', 'Afternoon', 'Evening', 'Night', 'Monsoon'];

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
  let tablaOut = null;
  const getCtx = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
  // Tabla goes through a gain stage (user volume) and a compressor so it stays loud without clipping.
  function tablaBus() {
    if (!tablaOut) {
      const c = getCtx(), comp = c.createDynamicsCompressor(), vol = c.createGain();
      vol.gain.value = Number($('#tabla-vol').value) / 100;
      comp.connect(vol); vol.connect(c.destination);
      tablaOut = { input: comp, vol };
    }
    return tablaOut;
  }
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
      getCtx().resume(); cycle(); droneTimer = setInterval(cycle, 4000);
    } else { clearInterval(droneTimer); }
  }
  $('#drone-toggle').addEventListener('click', toggleDrone);
  saSelect.addEventListener('change', () => { if (droneOn) { clearInterval(droneTimer); cycle(); droneTimer = setInterval(cycle, 4000); } });


  // Tabla taal player. Bols are synthesised: dayan (tuned to Sa) and bayan (bass).
  // beats: [bol, dayan?, bayan?]; vib = beats per vibhag; marks: 'X' sam, number tali, 'O' khali.
  const TAALS = {
    'Teentaal · 16': { vib: [4, 4, 4, 4], marks: ['X', '2', 'O', '3'], bols: ['Dha','Dhin','Dhin','Dha','Dha','Dhin','Dhin','Dha','Dha','Tin','Tin','Ta','Ta','Dhin','Dhin','Dha'] },
    'Dadra · 6': { vib: [3, 3], marks: ['X', 'O'], bols: ['Dha','Dhi','Na','Dha','Tu','Na'] },
    'Keherwa · 8': { vib: [4, 4], marks: ['X', 'O'], bols: ['Dha','Ge','Na','Ti','Na','Ka','Dhi','Na'] },
    'Jhaptaal · 10': { vib: [2, 3, 2, 3], marks: ['X', '2', 'O', '3'], bols: ['Dhi','Na','Dhi','Dhi','Na','Ti','Na','Dhi','Dhi','Na'] },
    'Ektaal · 12': { vib: [2, 2, 2, 2, 2, 2], marks: ['X', '2', 'O', 'O', '3', '4'], bols: ['Dhin','Dhin','DhaGe','TiraKita','Tu','Na','Kat','Ta','DhaGe','TiraKita','Dhin','Na'] },
    'Rupak · 7': { vib: [3, 2, 2], marks: ['O', '2', '3'], bols: ['Tin','Tin','Na','Dhi','Na','Dhi','Na'] }
  };
  const BOL_SOUND = { Ra: [1, 0], Ki: [1, 0], Dha: [1, 1], Dhin: [1, 1], Dhi: [1, 1], Tin: [1, 0], Ta: [1, 0], Na: [1, 0], Ti: [1, 0], Tu: [1, 0], Ge: [0, 1], Ka: [0, 1], Kat: [0, 1] };
  // Compound bols are two or four quick strokes within one beat.
  const COMPOUND = { DhaGe: ['Dha', 'Ge'], TiraKita: ['Ti', 'Ra', 'Ki', 'Ta'] };
  function tablaHit(bol, when, spb) {
    if (COMPOUND[bol]) {
      const parts = COMPOUND[bol], step = spb / parts.length;
      parts.forEach((p, k) => tablaHit(p, when + k * step, spb));
      return;
    }
    const [dayan, bayan] = BOL_SOUND[bol] || [1, 0];
    if (dayan) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(saFreq() * 2.5, when);
      o.frequency.exponentialRampToValueAtTime(saFreq() * 2, when + 0.25);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(1, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
      o.connect(g); g.connect(tablaBus().input); o.start(when); o.stop(when + 0.4);
    }
    if (bayan) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, when);
      o.frequency.exponentialRampToValueAtTime(70, when + 0.3);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(1.6, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.45);
      o.connect(g); g.connect(tablaBus().input); o.start(when); o.stop(when + 0.5);
    }
  }
  const taalSelect = $('#taal-select'), grid = $('#taal-grid'), bpm = $('#bpm');
  Object.keys(TAALS).forEach((k) => { const o = document.createElement('option'); o.textContent = k; taalSelect.appendChild(o); });
  let beatEls = [], taalRun = false, taalTimer = null, nextBeat = 0, nextTime = 0;
  function buildGrid() {
    const t = TAALS[taalSelect.value]; grid.innerHTML = ''; beatEls = []; let i = 0;
    t.vib.forEach((n, v) => {
      const box = document.createElement('div'); box.className = 'vibhag';
      for (let k = 0; k < n; k++, i++) {
        const el = document.createElement('div'); el.className = 'beat';
        el.innerHTML = `<small>${k === 0 ? (t.marks[v] === 'X' ? '✕' : t.marks[v] === 'O' ? '○' : t.marks[v]) : '&nbsp;'}</small><b>${t.bols[i]}</b>`;
        box.appendChild(el); beatEls.push(el);
      }
      grid.appendChild(box);
    });
  }
  function schedule() {
    const t = TAALS[taalSelect.value], spb = 60 / Number(bpm.value);
    while (nextTime < ctx.currentTime + 0.15) {
      const idx = nextBeat % t.bols.length, when = nextTime;
      tablaHit(t.bols[idx], when, spb);
      setTimeout(() => { beatEls.forEach((e, j) => e.classList.toggle('on', j === idx)); }, Math.max(0, (when - ctx.currentTime) * 1000));
      nextBeat++; nextTime += spb;
    }
  }
  function toggleTaal() {
    taalRun = !taalRun;
    $('#taal-toggle').textContent = taalRun ? '■ Stop' : '▶ Play';
    if (taalRun) {
      getCtx().resume(); nextBeat = 0; nextTime = ctx.currentTime + 0.1;
      taalTimer = setInterval(schedule, 25);
    } else { clearInterval(taalTimer); beatEls.forEach((e) => e.classList.remove('on')); }
  }
  $('#taal-toggle').addEventListener('click', toggleTaal);
  $('#tabla-vol').addEventListener('input', () => { if (tablaOut) tablaOut.vol.gain.value = Number($('#tabla-vol').value) / 100; });
  bpm.addEventListener('input', () => { $('#bpm-out').textContent = bpm.value; });
  taalSelect.addEventListener('change', () => { buildGrid(); nextBeat = 0; });
  buildGrid();

  // Finger-hole chart
  const svg = $('#flute');
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  add('rect', { class: 'body', x: 20, y: 60, width: 600, height: 24, rx: 12 });
  add('ellipse', { class: 'hole', cx: 85, cy: 72, rx: 14, ry: 8 });
  add('text', { x: 85, y: 108 }).textContent = 'Blowing hole';
  add('text', { x: 235, y: 36 }).textContent = 'LEFT HAND';
  add('text', { x: 455, y: 36 }).textContent = 'RIGHT HAND';
  const holeEls = {}, halfEls = {};
  HOLES.forEach(([id, x], i) => {
    holeEls[id] = add('circle', { class: 'key', cx: x, cy: 72, r: 13 });
    halfEls[id] = add('path', { class: 'half', d: `M${x} 59 A13 13 0 0 0 ${x} 85 Z` });
    add('text', { x, y: 108 }).textContent = String(i + 1);
  });
  add('text', { x: 560, y: 140 }).textContent = 'Open end';
  const picker = $('#note-picker');
  function showNote(label) {
    const entry = NOTES.find((n) => n[0] === label);
    Object.entries(holeEls).forEach(([id, el]) => {
      el.classList.toggle('on', entry[2].includes(id));
      el.classList.toggle('halfring', entry[3].includes(id));
      halfEls[id].classList.toggle('on', entry[3].includes(id));
    });
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.label === label));
    const num = (arr) => arr.map((h) => h.slice(1)).join(', ') || 'none';
    const half = entry[3].length ? ` Hole ${num(entry[3])} is half-covered.` : '';
    $('#note-info').textContent = `${entry[1]}: holes fully covered — ${num(entry[2])}.${half} A simplified beginner chart; exact fingering varies with the bansuri's pitch and your guru's school.`;
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
  function showRagas(group) {
    $('#raga-cards').innerHTML = RAGAS.filter((r) => group === 'All' || r[2] === group)
      .map(([i, t, g, d]) => `<article class="card"><div class="icon">${i}</div><h3>Raga ${t}</h3><p><strong>${g}.</strong> ${d}</p></article>`).join('');
    $('#raga-filter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.textContent === group));
  }
  RAGA_GROUPS.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = g; b.style.width = 'auto'; b.style.padding = '.45rem .9rem';
    b.addEventListener('click', () => showRagas(g));
    $('#raga-filter').appendChild(b);
  });
  showRagas('All');
  $('#technique-cards').innerHTML = cards(TECHNIQUES);

  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Clear all saved practice progress?')) { state = { days: {}, checks: {}, checkDate: todayKey() }; store.set(state); location.reload(); }
  });
  renderStats();
})();
