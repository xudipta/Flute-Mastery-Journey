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
  // Each string is a sum of exact harmonics (k times the string's frequency), so its pitch is right whatever
  // the sample rate or Sa, and the strings sit in tune with each other. The "jivari" of a tanpura (the buzz of
  // the string over the flat bridge) is modelled as upper harmonics that swell for a second or two after the
  // pluck and then fade slowly, while the plain pluck brightness dies away quickly.
  // Everything lives in one self-contained function so it can also be run inside a Web Worker (see Engine).
  function tanpuraKit() {
    const TAU = Math.PI * 2, BLOCK = 128;
    // String ratios to Sa for the first (lower) string, in just intonation: Pa 3:2, Ma 4:3, shuddha Ni 15:8, an octave down.
    const FIRST = { Pa: 0.75, Ma: 2 / 3, Ni: 15 / 16 };
    function rng(seed) { let s = (Math.floor(seed) % 2147483646) + 1; return () => ((s = (s * 48271) % 2147483647) / 2147483647); }
    // opts: seed (makes each string's phases and shimmer different), jivari (0 to 1.3), sustain (1 = default).
    function tanpuraString(sr, f, seconds, opts) {
      const o = Object.assign({ seed: 1, jivari: 1, sustain: 1 }, opts);
      const len = Math.floor(sr * seconds), out = new Float32Array(len), rnd = rng(Math.round(f * 100) + o.seed * 7919);
      const K = Math.max(6, Math.min(24, Math.floor(6000 / f)));
      const T0 = 8 * o.sustain, TALL = 22 * o.sustain;
      for (let k = 1; k <= K; k++) {
        const w = TAU * k * f / sr, cr = Math.cos(w), si = Math.sin(w), ph = rnd() * TAU;
        let c = Math.cos(ph), s = Math.sin(ph);
        const a0 = Math.pow(k, -0.95) * (k >= 2 && k <= 4 ? 1.2 : 1);
        const tau = T0 / (1 + 0.45 * Math.pow(k - 1, 0.9));              // plain decay: upper harmonics die faster
        const m = k >= 3 ? Math.min(0.92, o.jivari * 0.16 * (k - 2)) : 0;  // share of this harmonic that blooms
        const tp = 0.5 + 0.22 * k;                                         // when the bloom peaks (s)
        const fl = TAU * (0.12 + rnd() * 0.35), fd = 0.05 + rnd() * 0.1, fp = rnd() * TAU; // slow shimmer
        const env = (t) => {
          const plain = Math.exp(-t / tau), bloom = (t / tp) * Math.exp(1 - t / tp - t / 9);
          return a0 * ((1 - 0.55 * m) * plain + m * 1.8 * bloom) * Math.exp(-t / TALL) * (1 + fd * Math.sin(fl * t + fp));
        };
        let a = env(0);
        for (let j = 0, nb = Math.ceil(len / BLOCK); j < nb; j++) {
          const n0 = j * BLOCK, n1 = Math.min(len, n0 + BLOCK), next = env(n1 / sr), da = (next - a) / (n1 - n0);
          for (let n = n0; n < n1; n++) { out[n] += a * c; a += da; const t = c * cr - s * si; s = c * si + s * cr; c = t; }
          a = next;
        }
      }
      // A short soft pluck at the start, then fades and a level that leaves headroom when strings overlap.
      let peak = 0, noise = 0;
      const fadeIn = Math.floor(sr * 0.004), fadeOut = Math.floor(sr * 1.2), click = Math.floor(sr * 0.03);
      for (let n = 0; n < len; n++) {
        if (n < click) { noise += 0.35 * ((rnd() * 2 - 1) - noise); out[n] += 0.05 * noise * (1 - n / click) * K; }
        const v = Math.abs(out[n]); if (v > peak) peak = v;
      }
      const g0 = 0.9 / (peak || 1);
      for (let n = 0; n < len; n++) {
        let g = g0;
        if (n < fadeIn) g *= n / fadeIn;
        if (n > len - fadeOut) { const x = (len - n) / fadeOut; g *= x * x * (3 - 2 * x); }
        out[n] *= g;
      }
      return out;
    }
    // The four strings of one tanpura: first string (Pa, Ma or Ni), Sa, Sa, and Sa an octave down.
    // opts: first ('Pa' | 'Ma' | 'Ni'), seconds, jivari.
    function tanpuraStrings(sr, saHz, opts) {
      const o = Object.assign({ first: 'Pa', seconds: 12, jivari: 1 }, opts);
      const ratio = FIRST[o.first] || FIRST.Pa;
      return [ratio, 1, 1, 0.5].map((r, i) => tanpuraString(sr, saHz * r, o.seconds, { seed: i + 1, jivari: o.jivari * (i === 3 ? 0.85 : 1) }));
    }
    return { tanpuraString, tanpuraStrings, FIRST };
  }
  const Tanpura = tanpuraKit();
  const { tanpuraString, tanpuraStrings } = Tanpura;
  // Settings shared with the app and the measuring script. rate: the strings are always built at this sample rate and
  // the browser resamples them to the device's rate (the pitch stays exact), so they can be built before the audio
  // context exists. gaps: seconds between plucks.
  const TANPURA = { seconds: 12, rate: 48000, ratios: Tanpura.FIRST, gaps: { slow: 1.5, medium: 1.15, fast: 0.9 }, gains: [0.7, 0.9, 0.9, 0.9] };

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
    // A faint, narrow band of air around the note's upper partials: breathy, not hissy.
    nz.buffer = noiseBuffer(c); nz.loop = true; nf.type = 'bandpass'; nf.frequency.value = Math.min(2200, (events[0] ? events[0].f : 440) * 3); nf.Q.value = 3; ng.gain.value = 0.006;
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

  // ---------- building the tanpura off the main thread ----------
  // Building four strings takes a couple of hundred milliseconds on a computer and several times that on a phone,
  // which would freeze the page, so it runs in a Web Worker made from the same code (tanpuraKit). One job runs at a
  // time; a newer request replaces jobs still waiting, so stepping quickly through scales builds only the last one.
  // Without Workers it falls back to the main thread (in a timeout, so the tap that asked is not blocked).
  const TanpuraBuilder = (function () {
    let worker = null, off = typeof root.Worker === 'undefined' || typeof root.Blob === 'undefined', inflight = null, queue = [], nextId = 1;
    function finish(job, bufs) { inflight = null; job.done(bufs); pump(); }
    function viaMainThread(job) { setTimeout(() => finish(job, tanpuraStrings(job.sr, job.saHz, job.opts)), 0); }
    function start() {
      try {
        const src = '(function(){var Kit=(' + tanpuraKit.toString() + ')();self.onmessage=function(e){var d=e.data,r=Kit.tanpuraStrings(d.sr,d.saHz,d.opts);self.postMessage({id:d.id,bufs:r},r.map(function(a){return a.buffer;}));};})();';
        const url = root.URL.createObjectURL(new root.Blob([src], { type: 'application/javascript' }));
        worker = new root.Worker(url);
        worker.onmessage = (e) => { root.URL.revokeObjectURL(url); if (inflight && inflight.id === e.data.id) finish(inflight, e.data.bufs); };
        worker.onerror = () => { off = true; worker = null; if (inflight) viaMainThread(inflight); };
      } catch (err) { off = true; worker = null; }
    }
    function pump() {
      if (inflight || !queue.length) return;
      const job = (inflight = queue.shift());
      if (!worker && !off) start();
      if (off) viaMainThread(job); else worker.postMessage({ id: job.id, sr: job.sr, saHz: job.saHz, opts: job.opts });
    }
    return {
      // urgent: someone is waiting for it (replaces everything queued); otherwise only replaces other waiting warm-ups.
      request(sr, saHz, opts, urgent, done, dropped) {
        queue = queue.filter((j) => { const drop = urgent || !j.urgent; if (drop) j.dropped(); return !drop; });
        queue.push({ id: nextId++, sr, saHz, opts, urgent, done, dropped });
        pump();
      }
    };
  })();

  // ---------- engine (browser runtime) ----------
  // While the page is hidden (screen off, another app in front) browsers may run timers only about once a
  // second, so the drone and tabla schedule a few seconds ahead instead of a fraction of a second.
  const lookahead = (visible) => (typeof document !== 'undefined' && document.hidden ? 3 : visible);
  const Engine = {
    ctx: null, saHz: 146.83, tabla: null, drone: null, droneOn: false, droneTimer: null, droneNext: 0, droneStep: 0, droneSrc: [],
    tanpura: { first: 'Pa', speed: 'medium', fine: 0 }, tanpuraCache: new Map(), droneBufs: null, droneGen: 0, tuning: false, warmTimer: null,
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
    setSa(hz) { this.saHz = hz; this.warmTanpura(); },
    // o: { first: 'Pa' | 'Ma' | 'Ni' (the lower first string), speed: 'slow' | 'medium' | 'fast' (pluck speed),
    // fine: cents (moves the tanpura only; the tabla and the reference note stay on Sa) }.
    setTanpura(o) {
      const was = this.tanpura.first, t = Object.assign(this.tanpura, o);
      if (!TANPURA.ratios[t.first]) t.first = 'Pa';
      if (!TANPURA.gaps[t.speed]) t.speed = 'medium';
      t.fine = Math.max(-100, Math.min(100, Number(t.fine) || 0));
      const rate = Math.pow(2, t.fine / 1200);
      this.droneSrc.forEach(({ s }) => { s.playbackRate.value = rate; });   // strings already ringing follow the fine tune
      if (t.first !== was) { if (this.droneOn) this.restartDrone(); else this.warmTanpura(); }
    },
    setTuning(on) { if (this.tuning !== on) { this.tuning = on; if (this.onTuning) this.onTuning(on); } },
    setVolume(which, v) { if (this[which]) this[which].vol.value = v; },
    hit(bol, when, spb, bus) { tablaHit(this.ctx, bus ? bus.input : this.tabla.input, bol, when, spb, this.saHz); },
    // A separate output for one demo (or one tabla run); stop() fades it out and cuts everything scheduled on it.
    bus(to = 'flute') {
      const c = this.ensure(), g = c.createGain();
      g.connect(this[to].input);
      return { input: g, stop() { g.gain.setTargetAtTime(0, c.currentTime, 0.03); setTimeout(() => g.disconnect(), 400); } };
    },
    line(events, bus, t0) { return fluteLine(this.ctx, bus.input, events, t0); },
    // Rings the bell at audio time `at` (default: now). The returned cancel() silences it if it has not rung yet.
    ring(at) {
      const c = this.ensure(), g = c.createGain(), when = Math.max(at || 0, c.currentTime + 0.02);
      g.connect(c.destination); bell(c, g, when);
      return { at: when, cancel() { g.disconnect(); } };
    },
    // The four strings for the current Sa and first string are built once and kept (the last three are cached).
    tanpuraEntry(urgent) {
      const sr = TANPURA.rate, key = `${this.saHz.toFixed(3)}|${this.tanpura.first}`, cache = this.tanpuraCache;
      let e = cache.get(key);
      if (e) { cache.delete(key); cache.set(key, e); return e; }
      e = { raw: null, bufs: null, ready: null };
      e.ready = new Promise((resolve) => TanpuraBuilder.request(sr, this.saHz, { first: this.tanpura.first, seconds: TANPURA.seconds }, urgent,
        (raw) => { e.raw = raw; resolve(e); }, () => cache.delete(key)));
      cache.set(key, e);
      while (cache.size > 3) cache.delete(cache.keys().next().value);
      return e;
    },
    // Builds the current tuning ahead of time (shortly after Sa or the first string changes), so pressing play is instant.
    warmTanpura() {
      clearTimeout(this.warmTimer);
      this.warmTimer = setTimeout(() => this.tanpuraEntry(false), 250);
    },
    // Calls done(buffers) with the four strings as AudioBuffers: at once when they are cached (returns true), else
    // when they have been built (returns false).
    withTanpura(done) {
      const c = this.ensure(), e = this.tanpuraEntry(true);
      const use = () => {
        if (!e.bufs) { e.bufs = e.raw.map((d) => { const b = c.createBuffer(1, d.length, TANPURA.rate); b.getChannelData(0).set(d); return b; }); e.raw = null; }
        done(e.bufs);
      };
      if (e.bufs || e.raw) { use(); return true; }
      e.ready.then(use);
      return false;
    },
    droneTick() {
      const c = this.ctx, bufs = this.droneBufs;
      if (!bufs) return;
      const gap = TANPURA.gaps[this.tanpura.speed], rate = Math.pow(2, this.tanpura.fine / 1200);
      while (this.droneNext < c.currentTime + lookahead(0.4)) {
        const s = c.createBufferSource(), g = c.createGain();
        s.buffer = bufs[this.droneStep % 4]; s.playbackRate.value = rate;
        g.gain.value = TANPURA.gains[this.droneStep % 4] * (0.94 + Math.random() * 0.12);   // no two plucks exactly alike
        s.connect(g); g.connect(this.drone.input);
        s.start(Math.max(this.droneNext, c.currentTime));
        this.droneSrc.push({ s, g });
        s.onended = () => { this.droneSrc = this.droneSrc.filter((x) => x.s !== s); };
        this.droneStep++; this.droneNext += gap * (0.97 + Math.random() * 0.06);
      }
    },
    startDrone() {
      this.ensure(); this.droneOn = true; this.droneStep = 0; this.droneBufs = null;
      const gen = ++this.droneGen;
      const begin = (bufs) => {
        if (gen !== this.droneGen || !this.droneOn) return;
        this.setTuning(false);
        this.droneBufs = bufs; this.droneNext = this.ctx.currentTime + 0.05;
        this.droneTick(); this.droneTimer = setInterval(() => this.droneTick(), 100);
      };
      if (!this.withTanpura(begin)) this.setTuning(true);   // not built yet: "tuning…" until it is
    },
    stopDrone() {
      this.droneOn = false; this.droneGen++; clearInterval(this.droneTimer); this.setTuning(false);
      const t = this.ctx.currentTime;
      this.droneSrc.forEach(({ s, g }) => { g.gain.setTargetAtTime(0, t, 0.08); s.stop(t + 0.5); });
      this.droneSrc = [];
    },
    restartDrone() { if (this.droneOn) { this.stopDrone(); this.startDrone(); } }
  };

  root.FluteAudio = { Engine, lookahead, tablaHit, buildTablaChain, tanpuraString, tanpuraStrings, TANPURA, bell, fluteLine };
})(typeof window !== 'undefined' ? window : globalThis);
