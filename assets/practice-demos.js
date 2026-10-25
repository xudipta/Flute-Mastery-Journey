/* "Show me how" demos for each daily riyaaz block. Uses the dialog, finger chart and player from demo.js. */
(function (root) {
  'use strict';
  const D = root.FluteDemo, Sound = root.FluteAudio.Engine;
  const $ = (s, p = document) => p.querySelector(s);
  const reduceMotion = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- generic swar-phrase demo ----------
  // spec.lines: [{label, caption, tokens: "S R G:2", legato}]. A token may carry ":beats".
  function phraseDemo(body, spec) {
    body.innerHTML = `
      ${spec.intro ? `<p class="demo-intro">${spec.intro}</p>` : ''}
      ${spec.picker || ''}
      <div class="notation" data-lines></div>
      <svg class="demo-chart" viewBox="0 0 640 150" role="img" aria-label="Bansuri finger-hole chart for the swar being played"></svg>
      ${spec.meter ? '<div class="hold-meter" aria-hidden="true"><div class="hold-fill"></div></div>' : ''}
      <p class="demo-cap" aria-live="polite">${spec.idle || 'Press play to watch and hear it.'}</p>
      <div class="demo-controls">
        <button class="btn small" data-go>▶ Play</button>
        <button class="btn small ghost" data-stop>■ Stop</button>
        <label>Speed <select data-speed>${Object.keys(D.SPEEDS).map((s) => `<option${s === (spec.speed || 'Normal') ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-loop> Loop</label>
        ${spec.drone ? '<button class="btn small ghost" data-drone>🎵 Tanpura</button>' : ''}
      </div>
      ${spec.tip ? `<p class="demo-note">${spec.tip}</p>` : ''}`;
    const chart = D.createChart($('.demo-chart', body)), cap = $('.demo-cap', body), holder = $('[data-lines]', body);
    const fill = $('.hold-fill', body);
    let lines = [], toks = [];
    function render() {
      lines = spec.lines(body); toks = [];
      holder.innerHTML = '';
      lines.forEach((ln, li) => {
        const row = document.createElement('div'); row.className = 'nline';
        row.innerHTML = `<span class="nlabel">${ln.label}</span><span class="ntoks"></span>`;
        const t = $('.ntoks', row); toks[li] = [];
        ln.tokens.split(/\s+/).forEach((raw) => {
          if (raw === '|') { t.append(Object.assign(document.createElement('span'), { className: 'sep', textContent: '|' })); return; }
          const sw = D.parseSwar(raw.split(':')[0]); if (!sw) return;
          const s = document.createElement('span'); s.className = 'tok'; s.textContent = sw.label; t.appendChild(s); toks[li].push(s);
        });
        holder.appendChild(row);
      });
    }
    function items() {
      const out = [];
      lines.forEach((ln, li) => {
        let ni = 0, first = true;
        ln.tokens.split(/\s+/).forEach((raw) => {
          if (raw === '|') { out.push({ rest: 1 }); first = true; return; }
          const [tok, b] = raw.split(':');
          if (!D.parseSwar(tok)) return;
          out.push({ tok, beats: Number(b) || 1, legato: !!ln.legato && !first, ref: [li, ni++], cap: ln.caption });
          first = false;
        });
        if (li < lines.length - 1) out.push({ rest: 1 });
      });
      return out;
    }
    const clear = () => { body.querySelectorAll('.tok.now').forEach((e) => e.classList.remove('now')); if (fill) fill.style.width = '0'; };
    let playing = false;
    function go() {
      playing = true; $('[data-go]', body).classList.add('on');
      const speed = D.SPEEDS[$('[data-speed]', body).value];
      D.player.play(items(), spec.bpm ? spec.bpm($('[data-speed]', body).value) : speed, {
        onStep(step) {
          clear();
          if (!step) { chart.clear(); return; }
          const [li, ni] = step.ref; toks[li][ni].classList.add('now');
          chart.show(step.sw.closed, step.sw.half, step.sw.over);
          cap.textContent = (step.cap ? step.cap + ' ' : '') + D.describe(step.sw);
        },
        onFrame(step, frac) { if (fill && step) fill.style.width = Math.min(100, Math.max(0, frac * 100)) + '%'; },
        onEnd() { clear(); chart.clear(); if ($('[data-loop]', body).checked && playing) go(); else { playing = false; $('[data-go]', body).classList.remove('on'); cap.textContent = 'Done. Play again or change the speed.'; } }
      });
    }
    function stop() { playing = false; D.player.stop(); clear(); chart.clear(); $('[data-go]', body).classList.remove('on'); }
    $('[data-go]', body).addEventListener('click', go);
    $('[data-stop]', body).addEventListener('click', stop);
    const dr = $('[data-drone]', body);
    if (dr) dr.addEventListener('click', () => { document.getElementById('drone-toggle').click(); dr.classList.toggle('on', Sound.droneOn); });
    const pick = $('[data-pick]', body);
    if (pick) pick.addEventListener('change', () => { stop(); render(); });
    render();
    return stop;
  }

  // ---------- 1. breathing & posture ----------
  function breathDemo(body) {
    body.innerHTML = `
      <div class="breath-demo">
        <svg viewBox="0 0 240 300" class="posture" role="img" aria-label="Standing posture with the belly expanding as the person inhales">
          <circle cx="120" cy="40" r="22" class="fig"/>
          <path d="M120 62 V170" class="fig line"/>
          <path d="M120 80 L70 130 M120 80 L170 130" class="fig line"/>
          <path d="M120 170 L95 270 M120 170 L145 270" class="fig line"/>
          <ellipse id="belly" cx="120" cy="125" rx="18" ry="26" class="belly"/>
          <text x="120" y="12" class="lbl">crown lifted</text>
          <text x="40" y="104" class="lbl">shoulders soft</text>
          <text x="196" y="190" class="lbl">belly expands</text>
        </svg>
        <div class="breath-text">
          <div id="b-phase" class="b-phase">Ready</div>
          <div id="b-count" class="b-count">—</div>
          <p>Inhale through the nose for 4 counts, then exhale slowly through the mouth for 8, as if blowing across the bansuri.</p>
          <ul class="cues">
            <li>Feet hip-width apart, spine tall, chin level.</li>
            <li>Shoulders drop and stay still while the belly and lower ribs widen.</li>
            <li>Keep the exhale thin and steady. Aim for a smooth airstream, not a push.</li>
          </ul>
          <div class="demo-controls"><button class="btn small" data-go>▶ Start</button><button class="btn small ghost" data-stop>■ Stop</button></div>
        </div>
      </div>`;
    const belly = $('#belly', body), phase = $('#b-phase', body), count = $('#b-count', body);
    let timer = null, n = 0;
    const CYCLE = 12;
    function tick() {
      const k = n % CYCLE, inhale = k < 4;
      phase.textContent = inhale ? 'Inhale' : 'Exhale';
      count.textContent = inhale ? k + 1 : k - 3;
      belly.style.transition = reduceMotion() ? 'none' : `transform ${inhale ? 4 : 8}s linear`;
      if (k === 0 || k === 4) belly.style.transform = inhale ? 'scale(1.9)' : 'scale(1)';
      n++;
    }
    function stop() { clearInterval(timer); timer = null; phase.textContent = 'Ready'; count.textContent = '—'; belly.style.transition = 'transform .4s'; belly.style.transform = 'scale(1)'; $('[data-go]', body).classList.remove('on'); }
    $('[data-go]', body).addEventListener('click', () => { if (timer) return; n = 0; tick(); timer = setInterval(tick, 1000); $('[data-go]', body).classList.add('on'); });
    $('[data-stop]', body).addEventListener('click', stop);
    return stop;
  }

  // ---------- 2. sur sadhana ----------
  const sadhana = (body) => phraseDemo(body, {
    intro: 'Hold each swar for one steady breath while the tanpura drones. The bar shows how long to hold. Keep the tone even from start to finish.',
    lines: () => [{ label: 'Hold each swar', tokens: "S:8 R:8 G:8 m:8 P:8 D:8 N:8 S':8", caption: 'Hold steadily.' }],
    meter: true, drone: true, speed: 'Slow',
    bpm: (s) => ({ Slow: 60, Normal: 80, Fast: 100 }[s]),
    idle: 'Press play, and switch on the tanpura to tune your ear to Sa.',
    tip: 'Start soft, keep the volume constant, and end each note without a wobble. Take a quiet breath between swars.'
  });

  // ---------- 3. alankars ----------
  const ASC = ['S', 'R', 'G', 'm', 'P', 'D', 'N', "S'"];
  function groups(size, step) {
    const up = [], down = [];
    for (let i = 0; i + size <= ASC.length; i += step) up.push(ASC.slice(i, i + size));
    up.forEach((g) => down.unshift([...g].reverse()));
    return [up, down];
  }
  const ALANKARS = {
    'Three-note groups': () => groups(3, 1),
    'Four-note groups': () => groups(4, 1),
    'Skipping (S G, R m …)': () => { const up = [], down = []; for (let i = 0; i + 2 < ASC.length; i++) up.push([ASC[i], ASC[i + 2]]); up.forEach((g) => down.unshift([...g].reverse())); return [up, down]; }
  };
  const alankar = (body) => phraseDemo(body, {
    intro: 'Each alankar (palta) is a pattern repeated up the scale, then down. Play it slowly and evenly, with every swar the same length and volume.',
    picker: `<label class="picker">Pattern <select data-pick>${Object.keys(ALANKARS).map((k) => `<option>${k}</option>`).join('')}</select></label>`,
    lines: (b) => {
      const [up, down] = ALANKARS[$('[data-pick]', b).value]();
      const f = (gs) => gs.map((g) => g.join(' ')).join(' | ');
      return [{ label: 'Ascending', tokens: f(up) }, { label: 'Descending', tokens: f(down) }];
    },
    tip: 'Use a metronome or the tabla for steady time. Raise the tempo only when the pattern is clean.'
  });

  // ---------- 4. raga alaap ----------
  function alaapLines(name) {
    const info = root.RAGA_NOTATION[name];
    const asc = info.aroha.split(/\s+/);
    const iS = asc.indexOf('S'), up = asc.slice(iS >= 0 ? iS : 0);
    const lines = [{ label: '1 · Establish Sa', tokens: 'S:4', caption: 'Hold Sa until the tanpura feels settled.' }];
    for (let i = 1; i < up.length - 1; i++) {
      const path = up.slice(0, i + 1).concat(up.slice(0, i).reverse()).map((t, k, a) => (k === i || k === a.length - 1 ? t + ':2' : t));
      lines.push({ label: `${i + 1} · Reach ${up[i].replace("'", '')}`, tokens: path.join(' '), legato: true, caption: `Glide up to ${up[i]} and back to Sa with meend.` });
    }
    const vadi = info.vadi && up.find((t) => t === info.vadi);
    if (vadi) lines.push({ label: `${lines.length + 1} · Rest on the vadi`, tokens: `S ${vadi}:4 S:2`, legato: true, caption: 'The vadi is the most important swar: linger on it.' });
    return lines;
  }
  const alaap = (body) => phraseDemo(body, {
    intro: 'An alaap unfolds a raga slowly with no tabla: establish Sa, then reach one new swar at a time, always returning to Sa, and finally rest on the vadi.',
    picker: `<label class="picker">Raga <select data-pick>${Object.keys(root.RAGA_NOTATION).map((k) => `<option${k === 'Yaman' ? ' selected' : ''}>${k}</option>`).join('')}</select></label>`,
    lines: (b) => alaapLines($('[data-pick]', b).value),
    drone: true, speed: 'Slow',
    bpm: (s) => ({ Slow: 40, Normal: 60, Fast: 80 }[s]),
    tip: 'Notes are connected with meend (glides). Keep the air steady and let the fingers slide off the holes slowly.'
  });

  // ---------- 5. taan & taal ----------
  function taalDemo(body) {
    const TAALS = root.TAALS;
    body.innerHTML = `
      <p class="demo-intro">Keep time with your hands while the tabla plays one cycle. Then a simple taan (a run of swars, one per beat) plays and lands exactly on <b>sam</b>, the first beat.</p>
      <label class="picker">Taal <select data-taal>${Object.keys(TAALS).map((k) => `<option>${k}</option>`).join('')}</select></label>
      <div class="cue-row"><div class="cue" aria-live="polite"><span class="cue-icon" data-icon>·</span><span data-cue>Press play</span></div><div class="cue-stage" data-stage>Listen and count</div></div>
      <div id="taal-demo-grid" class="taal-grid"></div>
      <svg class="demo-chart" viewBox="0 0 640 150" role="img" aria-label="Bansuri finger-hole chart"></svg>
      <div class="demo-controls"><button class="btn small" data-go>▶ Play</button><button class="btn small ghost" data-stop>■ Stop</button><label>Tempo <input type="range" data-bpm min="50" max="120" value="80"> <output data-bpm-out>80</output> BPM</label></div>
      <p class="demo-note">Clap (👏) on sam and each tali, wave (🤚) on khali, and count the other beats with your fingers. The sound uses your tools-bar Sa and tabla volume.</p>`;
    const chart = D.createChart($('.demo-chart', body)), grid = $('#taal-demo-grid', body);
    const sel = $('[data-taal]', body), bpm = $('[data-bpm]', body);
    let beatEls = [], t = null, bus = null, line = null, raf = 0, sched = null, run = 0, cues = [];
    const RUN = ['S', 'R', 'G', 'm', 'P', 'D', 'N', "S'", 'N', 'D', 'P', 'm', 'G', 'R'];
    function build() {
      const tl = TAALS[sel.value]; t = tl; grid.innerHTML = ''; beatEls = []; cues = []; let i = 0;
      tl.vib.forEach((n, v) => {
        const box = document.createElement('div'); box.className = 'vibhag';
        for (let k = 0; k < n; k++, i++) {
          const m = tl.marks[v], first = k === 0;
          cues.push(first ? (m === 'X' ? ['👏', 'Clap on sam'] : m === 'O' ? ['🤚', 'Wave (khali)'] : ['👏', 'Clap (tali ' + m + ')']) : ['☝️', 'Count ' + (k + 1) + ' on fingers']);
          const el = document.createElement('div'); el.className = 'beat';
          el.innerHTML = `<small>${first ? (m === 'X' ? '✕' : m === 'O' ? '○' : m) : '&nbsp;'}</small><b>${tl.bols[i]}</b>`;
          box.appendChild(el); beatEls.push(el);
        }
        grid.appendChild(box);
      });
    }
    function stop() {
      run++; clearInterval(sched); cancelAnimationFrame(raf);
      if (line) line.stop(); if (bus) bus.stop(); line = bus = null;
      beatEls.forEach((e) => e.classList.remove('on')); chart.clear();
      $('[data-icon]', body).textContent = '·'; $('[data-cue]', body).textContent = 'Press play'; $('[data-stage]', body).textContent = 'Listen and count';
      $('[data-go]', body).classList.remove('on');
    }
    function go() {
      stop(); Sound.ensure(); build();
      const n = t.bols.length, spb = 60 / Number(bpm.value), id = ++run, c = Sound.ctx, t0 = c.currentTime + 0.25, total = 2 * n + 2;
      // taan: one swar per beat in the second cycle, then Sa on sam of the next cycle.
      const ev = [];
      for (let k = 0; k < n; k++) ev.push({ f: Sound.saHz * 2 * Math.pow(2, D.parseSwar(RUN[k % RUN.length]).a / 12), start: (n + k) * spb, dur: spb * 0.95, legato: false });
      ev.push({ f: Sound.saHz * 2, start: 2 * n * spb, dur: spb * 2, legato: false });
      bus = Sound.bus(); line = Sound.line(ev, bus, t0);
      let nextBeat = 0;
      sched = setInterval(() => {
        while (nextBeat < 2 * n + 1 && t0 + nextBeat * spb < c.currentTime + 0.2) { Sound.hit(t.bols[nextBeat % n], t0 + nextBeat * spb, spb); nextBeat++; }
      }, 25);
      $('[data-go]', body).classList.add('on');
      let last = -1;
      const frame = () => {
        if (id !== run) return;
        const b = Math.floor((c.currentTime - t0) / spb);
        if (b !== last && b >= 0) {
          last = b;
          const idx = b % n;
          beatEls.forEach((e, j) => e.classList.toggle('on', j === idx));
          $('[data-icon]', body).textContent = cues[idx][0]; $('[data-cue]', body).textContent = cues[idx][1];
          const cyc = Math.floor(b / n);
          $('[data-stage]', body).textContent = cyc === 0 ? 'Cycle 1: listen and count' : cyc === 1 ? 'Cycle 2: taan, one swar per beat' : 'Land on sam!';
          if (cyc === 1) { const sw = D.parseSwar(RUN[idx % RUN.length]); chart.show(sw.closed, sw.half, sw.over); } else if (cyc === 2) { const sw = D.parseSwar('S'); chart.show(sw.closed, sw.half, sw.over); } else chart.clear();
        }
        if (c.currentTime - t0 > total * spb) { stop(); $('[data-cue]', body).textContent = 'Done. Play again to repeat.'; return; }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    $('[data-go]', body).addEventListener('click', go);
    $('[data-stop]', body).addEventListener('click', stop);
    bpm.addEventListener('input', () => { $('[data-bpm-out]', body).textContent = bpm.value; });
    sel.addEventListener('change', () => { stop(); build(); });
    build();
    return stop;
  }

  // ---------- 6. bandish / cool-down ----------
  const cool = (body) => phraseDemo(body, {
    intro: 'A gentle phrase in Raga Bhoopali to end the session: soft air, smooth meend, and a long, quiet Sa at the end.',
    lines: () => [
      { label: 'Phrase 1', tokens: 'S R G P G R S', legato: true, caption: 'Flow gently.' },
      { label: 'Phrase 2', tokens: 'R G P D P G R S', legato: true, caption: 'Open up a little.' },
      { label: 'Phrase 3', tokens: 'G R S .D S:4', legato: true, caption: 'Settle and fade.' }
    ],
    drone: true, speed: 'Slow',
    bpm: (s) => ({ Slow: 45, Normal: 65, Fast: 85 }[s]),
    tip: 'Play softly and end on Sa. Rest for a moment before you put the bansuri down.'
  });

  const BUILDERS = { breath: ['Pranayama & posture', breathDemo], sa: ['Sur sadhana (long tones)', sadhana], alankar: ['Alankars / paltas', alankar], raga: ['Raga alaap', alaap], taal: ['Taan & taal practice', taalDemo], cool: ['Bandish / cool-down', cool] };
  root.PracticeDemos = {
    open(id) {
      const b = BUILDERS[id]; if (!b) return;
      D.openDialog(b[0] + ': show me how', 'Watch, listen, then try it on your bansuri.', b[1]);
    }
  };
})(window);
