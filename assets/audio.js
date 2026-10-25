/* Synthesised tabla, tanpura and bell, plus the shared audio engine.
   The synth functions take (ctx, destination, ...) so they can also be rendered offline for testing. */
(function (root) {
  'use strict';

  // ---------- helpers ----------
  function noiseBuffer(c) {
    if (c._noise) return c._noise;
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (c._noise = b);
  }
  function env(g, when, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }
  function tone(c, dest, type, f0, f1, when, peak, attack, decay) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + attack + decay * 0.6);
    env(g, when, peak, attack, decay);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + attack + decay + 0.05);
  }
  function burst(c, dest, when, filterType, freq, q, peak, dur) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c);
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    env(g, when, peak, 0.001, dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(when, Math.random() * 0.5); s.stop(when + dur + 0.05);
  }

  // ---------- tabla ----------
  // Dayan: a clear pitched ring (tuned to Sa) with 2nd/3rd partials and a sharp attack click.
  function dayan(c, d, when, f, s, len) {
    tone(c, d, 'sine', f * 1.05, f, when, 0.9 * s, 0.002, 0.55 * len);
    tone(c, d, 'sine', f * 2.1, f * 2, when, 0.5 * s, 0.002, 0.35 * len);
    tone(c, d, 'sine', f * 3.15, f * 3, when, 0.28 * s, 0.002, 0.2 * len);
    burst(c, d, when, 'bandpass', 3200, 1.2, 0.5 * s, 0.03);
  }
  // Bayan: a pitch-gliding thump. The triangle partial and mid noise keep it audible on small speakers.
  function bayan(c, d, when, s) {
    tone(c, d, 'sine', 180, 85, when, 1.0 * s, 0.003, 0.5);
    tone(c, d, 'triangle', 180, 85, when, 0.55 * s, 0.003, 0.3);
    burst(c, d, when, 'bandpass', 600, 0.8, 0.5 * s, 0.05);
  }
  // bol -> [dayan strength, bayan strength, dayan length]
  const BOLS = {
    Dha: [1, 1, 1], Dhin: [1, 1, 1.2], Dhi: [0.8, 0.9, 0.9],
    Tin: [1, 0, 1], Ta: [0.9, 0, 0.8], Na: [0.8, 0, 0.8], Tu: [0.8, 0, 0.8],
    Ti: [0.55, 0, 0.4], Ra: [0.5, 0, 0.4], Ki: [0.5, 0, 0.4],
    Ge: [0, 0.8, 1], Ka: [0, 0.7, 1], Kat: [0, 0.9, 1]
  };
  const COMPOUND = { DhaGe: ['Dha', 'Ge'], TiraKita: ['Ti', 'Ra', 'Ki', 'Ta'] };
  function tablaHit(c, dest, bol, when, spb, saHz) {
    if (COMPOUND[bol]) {
      const parts = COMPOUND[bol], step = spb / parts.length;
      parts.forEach((p, k) => tablaHit(c, dest, p, when + k * step, spb, saHz));
      return;
    }
    const b = BOLS[bol] || BOLS.Na;
    if (b[0]) dayan(c, dest, when, saHz * 2, b[0], b[2]);
    if (b[1]) bayan(c, dest, when, b[1]);
  }

  // Signal chain for the tabla: volume -> compressor -> makeup -> soft clip -> out.
  function buildTablaChain(c, dest) {
    const vol = c.createGain(), comp = c.createDynamicsCompressor(), makeup = c.createGain(), clip = c.createWaveShaper();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    makeup.gain.value = 1.8;
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
    clip.curve = curve;
    vol.connect(comp); comp.connect(makeup); makeup.connect(clip); clip.connect(dest);
    return { input: vol, vol: vol.gain };
  }

  // ---------- tanpura ----------
  // Karplus-Strong string with a long sustain, then a rising soft-clip that brings out the
  // upper harmonics over time -- the "jivari" shimmer of a tanpura.
  function tanpuraString(sr, f, seconds) {
    const len = Math.floor(sr * seconds), out = new Float32Array(len);
    const N = Math.max(2, Math.round(sr / f - 0.5)), line = new Float32Array(N);
    const decay = Math.pow(0.01, 1 / (f * 6));
    let seed = Math.round(f * 1000) % 2147483647 || 1;
    const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647) * 2 - 1;
    for (let i = 0; i < N; i++) line[i] = rnd();
    for (let k = 0; k < 6; k++) for (let i = 1; i < N; i++) line[i] = (line[i] + line[i - 1]) / 2;
    let idx = 0;
    for (let n = 0; n < len; n++) {
      const cur = line[idx], nxt = line[(idx + 1) % N];
      line[idx] = decay * 0.5 * (cur + nxt);
      out[n] = cur;
      idx = (idx + 1) % N;
    }
    // Drive relative to the local amplitude so the harmonics keep blooming as the string decays.
    let peak = 0, follow = 0;
    const rel = Math.exp(-1 / (sr * 0.05));
    for (let n = 0; n < len; n++) {
      const t = n / sr, k = 0.3 + 3 * (1 - Math.exp(-t / 1.5));
      follow = Math.max(Math.abs(out[n]), follow * rel, 1e-5);
      out[n] = Math.tanh(k * out[n] / follow) * follow;
      if (Math.abs(out[n]) > peak) peak = Math.abs(out[n]);
    }
    const fadeIn = Math.floor(sr * 0.004), fadeOut = Math.floor(sr * 0.5);
    for (let n = 0; n < len; n++) {
      let g = 0.9 / (peak || 1);
      if (n < fadeIn) g *= n / fadeIn;
      if (n > len - fadeOut) g *= (len - n) / fadeOut;
      out[n] *= g;
    }
    return out;
  }
  // Tuning used by most male/mid-range tanpuras: Pa (lower), Sa, Sa, Sa (lower octave).
  function tanpuraStrings(sr, saHz) {
    return [0.75, 1, 1, 0.5].map((r) => tanpuraString(sr, saHz * r, 8));
  }

  // ---------- bell (timer end) ----------
  function bell(c, dest, when) {
    [[880, 0.6], [880 * 2.76, 0.3], [880 * 5.4, 0.15]].forEach(([f, p], i) => tone(c, dest, 'sine', f, f, when, p, 0.003, 1.6 / (i + 1)));
  }

  // ---------- bansuri-like melodic line ----------
  // events: {f, start, dur, legato}. Times are seconds from t0. A legato event glides from the previous
  // note on the same oscillators (meend); otherwise the note is re-articulated. Returns {stop()}.
  function fluteLine(c, dest, events, t0) {
    const out = c.createGain(), nodes = [];
    out.gain.value = 0; out.connect(dest);
    const parts = [[1, 0.6], [2, 0.2], [3, 0.07]].map(([m, a]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; g.gain.value = a; o.connect(g); g.connect(out); nodes.push(o);
      return { o, m };
    });
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5; lg.gain.value = 4; lfo.connect(lg);
    parts.forEach(({ o }) => lg.connect(o.detune)); nodes.push(lfo);
    const nz = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    nz.buffer = noiseBuffer(c); nz.loop = true; nf.type = 'bandpass'; nf.frequency.value = 2600; nf.Q.value = 0.7; ng.gain.value = 0.035;
    nz.connect(nf); nf.connect(ng); ng.connect(out); nodes.push(nz);
    const peak = 0.55;
    let prev = null, end = 0;
    events.forEach((ev, i) => {
      const s = t0 + ev.start, e = s + ev.dur, glide = ev.legato && prev;
      parts.forEach(({ o, m }) => {
        if (glide) {
          o.frequency.setValueAtTime(prev.f * m, s);
          o.frequency.exponentialRampToValueAtTime(ev.f * m, s + Math.min(0.18, ev.dur * 0.5));
        } else o.frequency.setValueAtTime(ev.f * m, s);
      });
      if (!glide) out.gain.setTargetAtTime(peak, s, 0.02);
      const next = events[i + 1];
      if (!(next && next.legato)) out.gain.setTargetAtTime(0, e - 0.06, 0.03);
      prev = ev; end = e;
    });
    nodes.forEach((n) => { n.start(t0); n.stop(end + 0.6); });
    return {
      stop() {
        const now = c.currentTime;
        out.gain.cancelScheduledValues(now); out.gain.setTargetAtTime(0, now, 0.03);
        nodes.forEach((n) => { try { n.stop(now + 0.25); } catch (e) { /* already stopped */ } });
      }
    };
  }

  // ---------- engine (browser runtime) ----------
  const Engine = {
    ctx: null, saHz: 146.83, tabla: null, drone: null, tanpuraBufs: null, droneOn: false, droneTimer: null, droneNext: 0, droneStep: 0, droneSrc: [],
    ensure() {
      if (!this.ctx) {
        const c = (this.ctx = new (root.AudioContext || root.webkitAudioContext)());
        this.tabla = buildTablaChain(c, c.destination);
        const vol = c.createGain(), comp = c.createDynamicsCompressor();
        vol.connect(comp); comp.connect(c.destination);
        this.drone = { input: vol, vol: vol.gain };
        const fl = c.createGain(), fc = c.createDynamicsCompressor();
        fl.connect(fc); fc.connect(c.destination);
        this.flute = { input: fl, vol: fl.gain };
        if (this.onCreate) this.onCreate();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    setSa(hz) { this.saHz = hz; this.tanpuraBufs = null; },
    setVolume(which, v) { if (this[which]) this[which].vol.value = v; },
    hit(bol, when, spb) { tablaHit(this.ctx, this.tabla.input, bol, when, spb, this.saHz); },
    // A separate output for one demo; stop() fades it out and cuts everything scheduled on it.
    bus() {
      const c = this.ensure(), g = c.createGain();
      g.connect(this.flute.input);
      return { input: g, stop() { g.gain.setTargetAtTime(0, c.currentTime, 0.03); setTimeout(() => g.disconnect(), 400); } };
    },
    line(events, bus, t0) { return fluteLine(this.ctx, bus.input, events, t0); },
    ring() { bell(this.ensure(), this.ctx.destination, this.ctx.currentTime + 0.02); },
    buffers() {
      if (!this.tanpuraBufs) {
        const c = this.ctx;
        this.tanpuraBufs = tanpuraStrings(c.sampleRate, this.saHz).map((d) => {
          const b = c.createBuffer(1, d.length, c.sampleRate);
          b.getChannelData(0).set(d);
          return b;
        });
      }
      return this.tanpuraBufs;
    },
    droneTick() {
      const c = this.ctx, bufs = this.buffers(), gap = 1.15;
      while (this.droneNext < c.currentTime + 0.4) {
        const s = c.createBufferSource(), g = c.createGain();
        s.buffer = bufs[this.droneStep % 4];
        g.gain.value = this.droneStep % 4 === 0 ? 0.7 : 0.9;
        s.connect(g); g.connect(this.drone.input);
        s.start(Math.max(this.droneNext, c.currentTime));
        this.droneSrc.push({ s, g });
        s.onended = () => { this.droneSrc = this.droneSrc.filter((x) => x.s !== s); };
        this.droneStep++; this.droneNext += gap;
      }
    },
    startDrone() {
      this.ensure(); this.droneOn = true; this.droneStep = 0; this.droneNext = this.ctx.currentTime + 0.05;
      this.droneTick(); this.droneTimer = setInterval(() => this.droneTick(), 100);
    },
    stopDrone() {
      this.droneOn = false; clearInterval(this.droneTimer);
      const t = this.ctx.currentTime;
      this.droneSrc.forEach(({ s, g }) => { g.gain.setTargetAtTime(0, t, 0.08); s.stop(t + 0.5); });
      this.droneSrc = [];
    },
    restartDrone() { if (this.droneOn) { this.stopDrone(); this.startDrone(); } }
  };

  root.FluteAudio = { Engine, tablaHit, buildTablaChain, tanpuraString, tanpuraStrings, bell, fluteLine };
})(typeof window !== 'undefined' ? window : globalThis);
