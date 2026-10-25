/* Pitch tuner: listens to the microphone, finds the pitch (YIN) and shows the nearest swar relative to your Sa.
   All audio is analysed on this device and never uploaded. */
(function (root) {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const LETTERS = 'SrRgGmMPdDnN';
  const SHOW = { S: 'Sa', r: 'Re♭', R: 'Re', g: 'Ga♭', G: 'Ga', m: 'Ma', M: 'Ma♯', P: 'Pa', d: 'Dha♭', D: 'Dha', n: 'Ni♭', N: 'Ni' };
  const NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const OCT = { '-1': 'lower octave', 0: 'middle octave', 1: 'upper octave' };

  // ---------- pitch detection (YIN) ----------
  // Returns {freq, clarity} or null when there is silence or no clear pitch.
  function detect(buf, sr, opts) {
    const o = Object.assign({ minF: 90, maxF: 1700, thresh: 0.12, gate: 0.008 }, opts);
    const N = buf.length;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / N);
    if (rms < o.gate) return null;
    const maxTau = Math.min(Math.floor(sr / o.minF), (N >> 1) - 1), minTau = Math.max(2, Math.floor(sr / o.maxF));
    const d = new Float32Array(maxTau + 2);
    const W = N - maxTau;
    for (let tau = 1; tau <= maxTau; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
      d[tau] = s;
    }
    let run = 0; d[0] = 1;
    for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; d[tau] = run ? (d[tau] * tau) / run : 1; }
    let tau = -1;
    for (let t = minTau; t <= maxTau; t++) {
      if (d[t] < o.thresh) { while (t + 1 <= maxTau && d[t + 1] < d[t]) t++; tau = t; break; }
    }
    if (tau < 0) {
      let m = minTau;
      for (let t = minTau; t <= maxTau; t++) if (d[t] < d[m]) m = t;
      if (d[m] > 0.3) return null;
      tau = m;
    }
    // parabolic interpolation around the minimum
    let better = tau;
    if (tau > 1 && tau < maxTau) {
      const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = 2 * (a - 2 * b + c);
      if (den) better = tau + (a - c) / den;
    }
    return { freq: sr / better, clarity: Math.max(0, 1 - d[tau]), rms };
  }

  // ---------- frequency -> swar ----------
  // saHz is the flute's Sa. Returns the nearest swar, the octave, and the cents off it.
  function toSwar(freq, saHz, targetClass) {
    const n = 12 * Math.log2(freq / saHz);            // semitones from Sa (may be fractional)
    let nearest = Math.round(n);
    if (targetClass !== undefined && targetClass !== null) {
      // snap to the target swar in whichever octave is closest
      const base = Math.round((n - targetClass) / 12) * 12 + targetClass;
      nearest = base;
    }
    const cents = (n - nearest) * 100;
    const cls = ((nearest % 12) + 12) % 12, oct = Math.floor(nearest / 12);
    return { n, nearest, cls, oct, cents, letter: LETTERS[cls], name: SHOW[LETTERS[cls]] };
  }
  const westernName = (saIndex, cls) => NOTE[(saIndex + cls) % 12];

  // ---------- UI ----------
  const state = { stream: null, src: null, an: null, raf: 0, buf: null, last: 0, hist: [], voicedAt: 0, trace: [], current: null };
  const App = () => root.FluteApp, Sound = () => root.FluteAudio.Engine;

  function median(a) { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; }
  function setMsg(t) { $('#tuner-msg').textContent = t; }

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setMsg('This browser cannot use the microphone here. Try Chrome, Edge, Firefox or Safari over https.'); return; }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      setMsg(e && e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser\'s site settings, then try again.' : 'No microphone was found.');
      return;
    }
    const c = Sound().ensure();
    state.an = c.createAnalyser(); state.an.fftSize = 4096; state.an.smoothingTimeConstant = 0;
    state.src = c.createMediaStreamSource(state.stream); state.src.connect(state.an);
    state.buf = new Float32Array(state.an.fftSize); state.hist = []; state.trace = [];
    $('#tuner-toggle').textContent = '■ Stop listening'; $('#tuner-toggle').classList.add('on');
    setMsg('Listening… play a long, steady note.');
    state.raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(state.raf);
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    if (state.src) state.src.disconnect();
    state.stream = state.src = state.an = null; state.current = null;
    $('#tuner-toggle').textContent = '🎤 Start listening'; $('#tuner-toggle').classList.remove('on');
    $('#tuner-setsa').disabled = true;
    render(null); setMsg('');
  }

  function loop(t) {
    state.raf = requestAnimationFrame(loop);
    if (t - state.last < 33) return; // about 30 readings a second
    state.last = t;
    state.an.getFloatTimeDomainData(state.buf);
    const r = detect(state.buf, Sound().ctx.sampleRate);
    const now = performance.now();
    if (r && r.clarity > 0.8) {
      state.hist.push(r.freq); if (state.hist.length > 5) state.hist.shift();
      state.voicedAt = now;
      const f = median(state.hist), tgt = $('#tuner-target').value;
      const saHz = Sound().saHz * 2, det = toSwar(f, saHz, null), tg = tgt === 'auto' ? null : toSwar(f, saHz, Number(tgt));
      const on = tg && Math.abs(tg.cents) <= 60 ? tg : det;
      state.current = { f, det, sw: on, aim: tg && !(Math.abs(tg.cents) <= 60) ? tg : null };
      state.trace.push({ t: now, cents: Math.max(-60, Math.min(60, on.cents)), n: on.n });
    } else if (now - state.voicedAt > 350) { state.hist = []; state.current = null; state.trace.push({ t: now, cents: null }); }
    state.trace = state.trace.filter((p) => now - p.t < 8000);
    render(state.current);
  }

  function steadiness() {
    const now = performance.now(), pts = state.trace.filter((p) => p.cents !== null && now - p.t < 4000);
    if (pts.length < 20) return null;
    const m = pts.reduce((s, p) => s + p.n, 0) / pts.length;
    return Math.sqrt(pts.reduce((s, p) => s + (p.n - m) * (p.n - m), 0) / pts.length) * 100;
  }

  let lastVerdict = '';
  function render(cur) {
    const big = $('#tuner-swar'), sub = $('#tuner-sub'), needle = $('#tuner-needle'), verdict = $('#tuner-verdict'), tgtSel = $('#tuner-target').value;
    if (!cur) {
      big.textContent = '—'; sub.textContent = state.stream ? 'Waiting for a note' : 'Not listening';
      needle.style.left = '50%'; needle.classList.remove('ok');
      verdict.textContent = ''; lastVerdict = ''; drawTrace(); $('#tuner-steady').textContent = '—'; $('#tuner-setsa').disabled = true;
      return;
    }
    const sw = cur.sw, A = App(), si = A ? A.settings.sa : 2;
    const oct = OCT[Math.max(-1, Math.min(1, sw.oct))] || (sw.oct > 1 ? 'upper octave' : 'lower octave');
    big.textContent = sw.name;
    sub.textContent = `${westernName(si, sw.cls)} · ${cur.f.toFixed(1)} Hz · ${oct}`;
    const inTune = !cur.aim && Math.abs(sw.cents) <= 10;
    let v;
    if (cur.aim) {
      const up = cur.aim.nearest > cur.det.nearest;
      v = `You are on ${cur.det.name}. Aim for ${SHOW[LETTERS[Number(tgtSel)]]}: go ${up ? 'higher' : 'lower'}.`;
      needle.style.left = (up ? 100 : 0) + '%';
    } else {
      const c = Math.max(-50, Math.min(50, sw.cents));
      needle.style.left = (50 + c) + '%';
      v = inTune ? '✔ In tune' : `${Math.abs(Math.round(sw.cents))} cents ${sw.cents > 0 ? 'sharp ♯: ease the air or cover a little more' : 'flat ♭: a little more air or lift a finger slightly'}`;
    }
    needle.classList.toggle('ok', inTune);
    if (v !== lastVerdict) { verdict.textContent = v; lastVerdict = v; }
    verdict.classList.toggle('ok', inTune);
    const st = steadiness();
    $('#tuner-steady').textContent = st === null ? '—' : `±${st.toFixed(0)} cents · ${st < 6 ? 'very steady' : st < 12 ? 'steady' : 'wobbly: keep the air even'}`;
    $('#tuner-setsa').disabled = false;
    drawTrace();
  }

  function drawTrace() {
    const cv = $('#tuner-trace'); if (!cv) return;
    const dpr = root.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const cs = getComputedStyle(document.documentElement), ok = cs.getPropertyValue('--ok').trim(), muted = cs.getPropertyValue('--muted').trim(), acc = cs.getPropertyValue('--accent2').trim();
    const y = (c) => h / 2 - (c / 60) * (h / 2 - 4);
    g.fillStyle = ok + '33'; g.fillRect(0, y(10), w, y(-10) - y(10));
    g.strokeStyle = muted; g.globalAlpha = .5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); g.globalAlpha = 1;
    const now = performance.now(); g.strokeStyle = acc; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
    let pen = false;
    state.trace.forEach((p) => {
      if (p.cents === null) { pen = false; return; }
      const x = w - ((now - p.t) / 8000) * w, yy = y(p.cents);
      if (!pen) { g.moveTo(x, yy); pen = true; } else g.lineTo(x, yy);
    });
    g.stroke();
  }

  function hearSa() {
    const F = root.FluteDemo; if (!F) return;
    F.player.play([{ tok: 'S', beats: 4 }], 60, { onStep() {}, onEnd() {} });
  }
  function setSaFromNote() {
    if (!state.current || !App() || !App().setSa) return;
    const f = state.current.f, i = ((Math.round(12 * Math.log2(f / 261.626)) % 12) + 12) % 12;
    App().setSa(i);
    setMsg(`Your Sa is now ${NOTE[i]}. Check it by playing Sa again.`);
  }

  function init() {
    const tgt = $('#tuner-target');
    LETTERS.split('').forEach((l, i) => { const o = document.createElement('option'); o.value = i; o.textContent = SHOW[l]; tgt.appendChild(o); });
    $('#tuner-toggle').addEventListener('click', () => (state.stream ? stop() : start()));
    $('#tuner-ref').addEventListener('click', hearSa);
    $('#tuner-setsa').addEventListener('click', setSaFromNote);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.stream) stop(); });
    render(null);
  }
  root.FluteTuner = { detect, toSwar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
