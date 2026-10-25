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
    if (typeof renderToday === 'function') renderToday();
  }

  const settings = Object.assign({ sa: 2, bpm: 90, taal: 'Teentaal · 16', tablaVol: 100, droneVol: 100, onboarded: false, favs: [] }, state.settings);
  const saveSettings = () => { state.settings = settings; store.set(state); };
  const Sound = FluteAudio.Engine;
  const saFreq = (i) => 130.81 * Math.pow(2, i / 12);
  Sound.setSa(saFreq(settings.sa));
  // Create the audio context on first use (needs a user gesture) and apply saved volumes.
  Sound.onCreate = () => { Sound.setVolume('tabla', settings.tablaVol / 100); Sound.setVolume('drone', 0.8 * settings.droneVol / 100); };
  function audio() { Sound.ensure(); return Sound; }

  // Returning visitors see "Today" instead of the intro.
  let showIntro = false;
  function markOnboarded() { if (!settings.onboarded) { settings.onboarded = true; saveSettings(); } }
  function renderToday() {
    const returning = settings.onboarded || Object.keys(state.days).length > 0;
    const today = $('#today'), intro = $('#hero-intro');
    if (!today) return;
    today.hidden = !returning || showIntro; intro.hidden = returning && !showIntro;
    $('#page-title').innerHTML = today.hidden ? 'From first <em>sur</em> to concert-stage raga.' : 'Today\'s riyaaz';
    if (today.hidden) return;
    const total = ROUTINE.reduce((s, r) => s + r.min, 0);
    const done = ROUTINE.filter((r) => state.checks[r.id]).reduce((s, r) => s + r.min, 0);
    const next = ROUTINE.find((r) => !state.checks[r.id]);
    const sn = streak();
    $('#t-fill').style.width = Math.round(100 * done / total) + '%';
    $('.t-bar').setAttribute('aria-valuenow', Math.round(100 * done / total));
    $('#t-line').textContent = next
      ? `${done} of ${total} minutes done${sn ? ` · ${sn}-day streak` : ''}. Next up: ${next.title} (${next.min} min).`
      : `All ${total} minutes done. Today's riyaaz is complete${sn ? ` · ${sn}-day streak` : ''}.`;
    $('#t-go').textContent = next ? (done ? `▶ Continue: ${next.title}` : '▶ Start today\'s riyaaz') : '↺ Practise a block again';
    $('#t-ragas').textContent = `🕒 ${nowGroup()} ragas`;
  }
  const nowGroup = () => { const h = new Date().getHours(); return h >= 4 && h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; };

  // Routine
  const rows = {};
  function setChecked(id, val) {
    if (val) markOnboarded();
    state.checks[id] = val;
    rows[id].box.checked = val;
    rows[id].li.classList.toggle('done', val);
    if (ROUTINE.every((x) => state.checks[x.id])) state.days[todayKey()] = true;
    else delete state.days[todayKey()];
    store.set(state); renderStats();
  }
  const list = $('#routine');
  ROUTINE.forEach((r) => {
    const li = document.createElement('li');
    li.dataset.id = r.id;
    li.innerHTML = `<input type="checkbox" aria-label="Done: ${r.title}"><div><h3>${r.title} · ${r.min} min</h3><p>${r.text}</p><button type="button" data-timer>Start timer</button> <button type="button" data-how>▶ Show me how</button></div>`;
    const box = li.querySelector('input');
    rows[r.id] = { li, box };
    box.checked = !!state.checks[r.id];
    li.classList.toggle('done', box.checked);
    box.addEventListener('change', () => setChecked(r.id, box.checked));
    li.querySelector('[data-timer]').addEventListener('click', () => { runAll = false; selectBlock(r, true); });
    li.querySelector('[data-how]').addEventListener('click', () => PracticeDemos.open(r.id));
    list.appendChild(li);
  });
  $('#routine-total').textContent = ROUTINE.reduce((a, r) => a + r.min, 0);

  // Timer (uses wall-clock time so it stays correct if the tab is throttled)
  let block = null, remaining = 0, handle = null, endAt = 0, runAll = false;
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function selectBlock(r, autostart) {
    markOnboarded(); stop();
    block = r; remaining = r.min * 60;
    document.querySelectorAll('.routine li').forEach((x) => x.classList.toggle('active', x === rows[r.id].li));
    rows[r.id].li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('#timer-label').textContent = r.title;
    $('#timer').textContent = fmt(remaining);
    if (autostart) start();
  }
  function start() {
    if (!block || handle) return;
    endAt = Date.now() + remaining * 1000;
    $('#timer-toggle').textContent = 'Pause';
    handle = setInterval(() => {
      remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      $('#timer').textContent = fmt(remaining);
      if (remaining <= 0) blockDone();
    }, 250);
  }
  function stop() { clearInterval(handle); handle = null; $('#timer-toggle').textContent = 'Start'; }
  function blockDone() {
    stop(); audio().ring();
    setChecked(block.id, true);
    $('#timer-label').textContent = block.title + ' — done!';
    const i = ROUTINE.indexOf(block), next = ROUTINE.slice(i + 1).find((x) => !state.checks[x.id]);
    if (runAll && next) selectBlock(next, true); else runAll = false;
  }
  $('#timer-toggle').addEventListener('click', () => { if (!block) { selectBlock(ROUTINE.find((x) => !state.checks[x.id]) || ROUTINE[0], true); } else if (handle) { stop(); remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); } else start(); });
  $('#timer-reset').addEventListener('click', () => { if (block) { stop(); remaining = block.min * 60; $('#timer').textContent = fmt(remaining); } });
  $('#run-all').addEventListener('click', () => {
    markOnboarded();
    const first = ROUTINE.find((x) => !state.checks[x.id]);
    if (!first) { $('#timer-label').textContent = 'All blocks done today — nicely played!'; return; }
    runAll = true; audio(); selectBlock(first, true);
  });

  // Sa selector (several synced selects) + tanpura drone
  const saSelects = [...document.querySelectorAll('.sa-sync')];
  saSelects.forEach((sel) => SA_NAMES.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; sel.appendChild(o); }));
  function showSa() {
    saSelects.forEach((s) => { s.value = settings.sa; });
    $('#pill-sa-name').textContent = SA_NAMES[settings.sa];
  }
  function setSa(i) {
    settings.sa = i; settings.onboarded = true; saveSettings(); showSa();
    Sound.setSa(saFreq(settings.sa));
    if (Sound.ctx) Sound.restartDrone();
    renderToday();
  }
  saSelects.forEach((s) => s.addEventListener('change', () => setSa(Number(s.value))));
  showSa();
  const droneBtn = $('#drone-toggle'), droneVol = $('#drone-vol');
  droneVol.value = settings.droneVol;
  droneBtn.addEventListener('click', () => {
    const on = !Sound.droneOn;
    if (on) audio().startDrone(); else Sound.stopDrone();
    droneBtn.setAttribute('aria-pressed', on); droneBtn.classList.toggle('on', on);
  });
  droneVol.addEventListener('input', () => {
    settings.droneVol = Number(droneVol.value); saveSettings();
    if (Sound.ctx) Sound.setVolume('drone', 0.8 * settings.droneVol / 100);
  });

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
  const taalSelect = $('#taal-select'), grid = $('#taal-grid'), bpm = $('#bpm'), tablaVol = $('#tabla-vol');
  Object.keys(TAALS).forEach((k) => { const o = document.createElement('option'); o.textContent = k; taalSelect.appendChild(o); });
  if (!TAALS[settings.taal]) settings.taal = 'Teentaal · 16';
  taalSelect.value = settings.taal; tablaVol.value = settings.tablaVol;
  let beatEls = [], taalRun = false, taalTimer = null, nextBeat = 0, nextTime = 0;
  function buildGrid() {
    const t = TAALS[taalSelect.value]; grid.innerHTML = ''; beatEls = []; let i = 0;
    $('#dock-taal').textContent = taalSelect.value.split(' · ')[0];
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
    const t = TAALS[taalSelect.value], spb = 60 / Number(bpm.value), c = Sound.ctx;
    while (nextTime < c.currentTime + 0.15) {
      const idx = nextBeat % t.bols.length, when = nextTime;
      Sound.hit(t.bols[idx], when, spb);
      setTimeout(() => { if (taalRun) beatEls.forEach((e, j) => e.classList.toggle('on', j === idx)); }, Math.max(0, (when - c.currentTime) * 1000));
      nextBeat++; nextTime += spb;
    }
  }
  function setTaalRunning(on) {
    taalRun = on;
    $('#taal-toggle').textContent = on ? '■ Stop' : '▶ Play';
    $('#dock-tabla').classList.toggle('on', on); $('#dock-tabla').setAttribute('aria-pressed', on);
    clearInterval(taalTimer);
    if (on) { audio(); nextBeat = 0; nextTime = Sound.ctx.currentTime + 0.1; taalTimer = setInterval(schedule, 25); }
    else beatEls.forEach((e) => e.classList.remove('on'));
  }
  function setBpm(v) {
    v = Math.min(240, Math.max(40, Math.round(v)));
    bpm.value = v; settings.bpm = v; saveSettings();
    $('#bpm-out').textContent = v; $('#dock-bpm').textContent = v;
  }
  bpm.value = settings.bpm; setBpm(settings.bpm);
  $('#taal-toggle').addEventListener('click', () => setTaalRunning(!taalRun));
  $('#dock-tabla').addEventListener('click', () => setTaalRunning(!taalRun));
  bpm.addEventListener('input', () => setBpm(Number(bpm.value)));
  $('#bpm-down').addEventListener('click', () => setBpm(Number(bpm.value) - 5));
  $('#bpm-up').addEventListener('click', () => setBpm(Number(bpm.value) + 5));
  tablaVol.addEventListener('input', () => {
    settings.tablaVol = Number(tablaVol.value); saveSettings();
    if (Sound.ctx) Sound.setVolume('tabla', settings.tablaVol / 100);
  });
  taalSelect.addEventListener('change', () => {
    settings.taal = taalSelect.value; saveSettings(); buildGrid();
    if (taalRun) { nextBeat = 0; nextTime = Sound.ctx.currentTime + 0.1; }
  });
  buildGrid();

  // Highlight the current section in the nav.
  const links = [...document.querySelectorAll('a[data-spy]')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.spy.split(' ').includes(en.target.id)));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    new Set(links.flatMap((a) => a.dataset.spy.split(' '))).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // Finger-hole chart
  const chart = FluteDemo.createChart($('#flute'));
  const picker = $('#note-picker');
  function showNote(label) {
    const entry = NOTES.find((n) => n[0] === label);
    const hole = (h) => Number(h.slice(1));
    chart.show(entry[2].map(hole), entry[3].map(hole), false);
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
  const STARTER = ['Bhoopali', 'Durga', 'Hamsadhwani', 'Yaman', 'Kafi', 'Khamaj'];
  const rf = { group: 'All', q: '', starter: false, fav: false };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const arohaText = (n) => window.RAGA_NOTATION[n].aroha.split(/\s+/).map((t) => FluteDemo.parseSwar(t).label).join(' ');
  function showRagas() {
    const q = rf.q.trim().toLowerCase();
    const shown = RAGAS.filter((r) => (rf.group === 'All' || r[2] === rf.group)
      && (!rf.starter || STARTER.includes(r[1])) && (!rf.fav || settings.favs.includes(r[1]))
      && (!q || (r[1] + ' ' + r[2] + ' ' + r[3]).toLowerCase().includes(q)));
    $('#raga-cards').innerHTML = shown.map(([i, t, g, d]) => {
      const fav = settings.favs.includes(t), n = window.RAGA_NOTATION[t];
      return `<article class="card raga-card"><button type="button" class="star" data-fav="${t}" aria-pressed="${fav}" aria-label="${fav ? 'Remove' : 'Add'} ${t} ${fav ? 'from' : 'to'} favourites">${fav ? '★' : '☆'}</button>
        <div class="icon">${i}</div><h3>Raga ${t}</h3>${STARTER.includes(t) ? '<span class="badge">Starter</span>' : ''}
        <p><strong>${g}.</strong> ${esc(d)}</p>${n ? `<p class="aroha"><b>Aroha:</b> ${arohaText(t)}</p>
        <div class="card-actions"><button type="button" class="btn small" data-hear="${t}">▶ Hear aroha</button><button type="button" class="btn small ghost" data-raga="${t}" data-group="${g}">How to play</button></div>` : '<p class="soon">Demo notation coming soon</p>'}</article>`;
    }).join('') || '<p class="empty">No ragas match. Try clearing a filter.</p>';
    $('#raga-count').textContent = `${shown.length} of ${RAGAS.length} ragas`;
    $('#raga-filter').querySelectorAll('button').forEach((b) => {
      const k = b.dataset.kind;
      b.setAttribute('aria-pressed', k === 'group' ? rf.group === b.dataset.v : rf[k]);
    });
  }
  const chips = [...RAGA_GROUPS.map((g) => ['group', g, g]), ['starter', 'true', '🌱 Starter'], ['fav', 'true', '★ Favourites']];
  chips.forEach(([kind, v, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.kind = kind; b.dataset.v = v; b.style.width = 'auto'; b.style.padding = '.45rem .9rem';
    b.addEventListener('click', () => { if (kind === 'group') rf.group = v; else rf[kind] = !rf[kind]; showRagas(); });
    $('#raga-filter').appendChild(b);
  });
  $('#raga-search').addEventListener('input', (e) => { rf.q = e.target.value; showRagas(); });
  $('#raga-now').textContent = `🕒 Ragas for now (${nowGroup()})`;
  function ragasForNow() {
    Object.assign(rf, { group: nowGroup(), q: '', starter: false, fav: false }); $('#raga-search').value = ''; showRagas();
    document.getElementById('ragas').scrollIntoView({ behavior: 'smooth' });
  }
  $('#raga-now').addEventListener('click', ragasForNow);
  $('#t-ragas').addEventListener('click', (e) => { e.preventDefault(); ragasForNow(); });
  showRagas();
  $('#raga-cards').addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]'), hear = e.target.closest('[data-hear]'), how = e.target.closest('[data-raga]');
    if (fav) {
      const n = fav.dataset.fav, i = settings.favs.indexOf(n);
      if (i >= 0) settings.favs.splice(i, 1); else settings.favs.push(n);
      saveSettings(); showRagas();
    } else if (hear) { audio(); FluteDemo.preview(hear.dataset.hear, hear); }
    else if (how) FluteDemo.ragaDemo(how.dataset.raga, how.dataset.group);
  });
  $('#technique-cards').innerHTML = cards(TECHNIQUES);

  // Tools bar: expandable panel, synced controls, keyboard shortcuts
  const panel = $('#dock-panel'), pill = $('#pill-sa');
  function togglePanel(open) {
    open = open === undefined ? panel.hidden : open;
    panel.hidden = !open; pill.setAttribute('aria-expanded', open);
  }
  pill.addEventListener('click', () => togglePanel());
  document.addEventListener('click', (e) => { if (!panel.hidden && !e.target.closest('#dock')) togglePanel(false); });
  const dockTv = $('#dock-tabla-vol'), dockTaal = $('#dock-taal-select');
  dockTv.value = tablaVol.value;
  dockTv.addEventListener('input', () => { tablaVol.value = dockTv.value; tablaVol.dispatchEvent(new Event('input')); });
  tablaVol.addEventListener('input', () => { dockTv.value = tablaVol.value; });
  Object.keys(TAALS).forEach((k) => { const o = document.createElement('option'); o.textContent = k; dockTaal.appendChild(o); });
  dockTaal.value = taalSelect.value;
  dockTaal.addEventListener('change', () => { taalSelect.value = dockTaal.value; taalSelect.dispatchEvent(new Event('change')); });
  taalSelect.addEventListener('change', () => { dockTaal.value = taalSelect.value; });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea, [contenteditable]') || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === 't') droneBtn.click();
    else if (k === 'b') $('#dock-tabla').click();
    else if (k === '[') $('#bpm-down').click();
    else if (k === ']') $('#bpm-up').click();
    else if (k === '/') { e.preventDefault(); document.getElementById('ragas').scrollIntoView({ behavior: 'smooth' }); $('#raga-search').focus(); }
    else if (k === 'escape') togglePanel(false);
    else return;
  });

  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Clear all saved practice progress?')) { state = { days: {}, checks: {}, checkDate: todayKey() }; store.set(state); location.reload(); }
  });
  renderStats();
})();
