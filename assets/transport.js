/* Shared audio transport: one beat grid on the audio clock for the tabla and a melody pattern.

   The tabla beats and the melody notes are both scheduled from the same beat counter by one lookahead
   scheduler, so a looped pattern stays on the taal's beats (no gap or drift between repeats).

   API (window.FluteTransport; `create(env)` builds another instance, used by tools/check-transport.js):
     start({ bpm, taal, tabla, click, onBeat })   begin the beat grid at the next ~0.1 s. taal is { bols: [...] }
                                                  (an entry of TAALS). onBeat(n, idx, when) fires on each beat.
     stop()                                       stop tabla, click and pattern
     setBpm(v)                                    new tempo from the next beat (melody follows, same grid)
     setTaal(taal)                                restart from sam (beat 0); a running pattern restarts too
     setTabla(on), setClick(on)                   mute/unmute the tabla / metronome without losing the grid
     playPattern(items, opts) -> { stop() }       play a melody on the grid, replacing any current pattern
         items: [{ tok, beats }] or [{ rest }]; `beats`/`rest` count notes (1/notesPerBeat of a beat each)
         opts:  loop (default false), notesPerBeat (default 1: 2 = two notes per beat, 4 = four ...),
                align: 'beat' | 'sam'   where a repeat starts after the previous one ends. Repeat length is
                       rounded up to whole beats ('beat'), or up to a whole number of taal cycles ('sam').
                startAt: 'beat' | 'sam' where the first repeat starts (default 'sam' with a taal, else 'beat'),
                onStep(item, { repeat, index })   when a note starts
                onLoop(repeat)                    when a repeat starts
                onEnd()                           a non-looping pattern has finished
         Starts the transport (tabla off) if it is not running. Legato inside one beat only.
     stopPattern()                                stop the melody, keep the beat grid
     setOnBeat(fn)                                replace the onBeat callback of a running transport
     pump()                                       run the scheduler now (also called from a 25 ms timer)
     running, bpm, patternActive, tablaOn         read-only state; on(fn) calls fn() when running changes

   Tempo and taal changes are applied from the next beat. Beats already queued further ahead (the page is hidden,
   so the lookahead is seconds long) are cut and re-scheduled from the next beat at the new tempo. */
(function (root) {
  'use strict';
  const EPS = 1e-9;

  function create(env) {
    const tr = { bpm: 90, running: false };
    let taal = null, tablaOn = false, clickOn = false, onBeat = null;
    let gen = 0, cursorN = 0, cursorT = 0, ledger = [], timer = null, buses = null, pat = null;
    const listeners = [];
    const cycle = () => (taal && taal.bols.length) || 1;
    const emit = () => listeners.forEach((f) => { try { f(); } catch (e) { /* a listener must not stop playback */ } });

    // ledger: beats already handed to the audio clock, so a tempo change can rewind to the first one it can still move.
    const ahead = () => { const now = env.now(); return ledger.some((b) => b.t > now + 0.3); };
    function freshBuses() { return { tabla: env.bus('tabla'), flute: env.bus('flute') }; }
    function cutAll() { if (buses) { buses.tabla.stop(); buses.flute.stop(); } buses = freshBuses(); }
    function cutFlute() { if (buses) buses.flute.stop(); buses = { tabla: buses ? buses.tabla : env.bus('tabla'), flute: env.bus('flute') }; }
    function cutTabla() { if (buses) buses.tabla.stop(); buses = { tabla: env.bus('tabla'), flute: buses ? buses.flute : env.bus('flute') }; }

    function scheduleBeat(n, t, spb, now) {
      if (taal && tablaOn) env.hit(taal.bols[n % cycle()], t, spb, buses.tabla);
      else if (clickOn) env.hit(n % cycle() === 0 ? 'Ta' : 'Ti', t, spb, buses.tabla);
      const g = gen;
      if (onBeat) env.later(() => { if (g === gen && tr.running && onBeat) onBeat(n, n % cycle(), t); }, Math.max(0, (t - now) * 1000));
      if (pat) patternBeat(n, t, spb, now, g);
    }

    function patternBeat(n, t, spb, now, g) {
      const p = pat;
      if (n < p.s0) return;
      const rel = n - p.s0, repeat = p.loop ? Math.floor(rel / p.step) : 0, local = rel - repeat * p.step;
      if (!p.loop && rel >= p.end) {           // one beat past the end of a single pass
        pat = null;
        if (p.onEnd) env.later(() => { if (g === gen && tr.running) p.onEnd(); }, Math.max(0, (t - now) * 1000));
        return;
      }
      if (local === 0 && p.onLoop) env.later(() => { if (g === gen && tr.running) p.onLoop(repeat); }, Math.max(0, (t - now) * 1000));
      const evs = p.byBeat[local];
      if (!evs) return;
      const line = evs.map((e, i) => ({ f: e.f, start: (e.s - local) * spb, dur: e.d * spb, legato: e.legato && i > 0 }));
      env.line(line, buses.flute, t);
      if (p.onStep) {
        evs.forEach((e) => env.later(() => { if (g === gen && tr.running) p.onStep(e.item, { repeat, index: e.index }); },
          Math.max(0, (t + (e.s - local) * spb - now) * 1000)));
      }
    }

    function pump() {
      if (!tr.running) return;
      const now = env.now(), horizon = now + env.lookahead(0.15);
      let spb = 60 / tr.bpm;
      // The page was suspended for a while: skip the beats that have gone by instead of playing them all at once.
      while (cursorT < now - 0.02) { cursorN++; cursorT += spb; }
      while (cursorT < horizon) {
        scheduleBeat(cursorN, cursorT, spb, now);
        ledger.push({ n: cursorN, t: cursorT });
        cursorN++; cursorT += spb;
      }
      while (ledger.length && ledger[0].t < now - 1) ledger.shift();
    }

    function restartGrid() {
      gen++;
      if (ahead()) cutAll();
      cursorN = 0; cursorT = env.now() + 0.1; ledger = [];
      if (pat) pat.s0 = 0;
    }

    tr.start = function (o = {}) {
      env.ensure();
      if (tr.running) tr.stop();
      tr.bpm = clampBpm(o.bpm === undefined ? tr.bpm : o.bpm);
      taal = o.taal || null; tablaOn = !!taal && o.tabla !== false; clickOn = !!o.click; onBeat = o.onBeat || null;
      buses = freshBuses(); gen++; pat = null; ledger = [];
      cursorN = 0; cursorT = env.now() + 0.1;
      tr.running = true;
      // No pump() here: a pattern added in the same tick still starts on the first beat (sam), not the next cycle.
      timer = env.setInterval(pump, 25);
      emit();
    };
    tr.stop = function () {
      if (!tr.running) return;
      env.clearInterval(timer); timer = null; gen++;
      const b = buses, tail = !ahead();
      tr.running = false; pat = null; ledger = []; buses = null;
      // Let the last hit ring out, but silence anything queued beyond it.
      if (tail) env.later(() => { b.tabla.stop(); b.flute.stop(); }, 1600); else { b.tabla.stop(); b.flute.stop(); }
      emit();
    };
    tr.setBpm = function (v) {
      tr.bpm = clampBpm(v);
      if (!tr.running) return;
      const now = env.now(), first = ledger.find((b) => b.t > now + 0.05);
      if (first && ahead()) {                  // beats are queued at the old tempo: cut them and redo from the first
        gen++; cutAll();
        cursorN = first.n; cursorT = first.t;
        ledger = ledger.filter((b) => b.n < first.n);
        pump();
      }
    };
    tr.setTaal = function (t) {
      taal = t || null; if (!taal) tablaOn = false;
      if (tr.running) { restartGrid(); pump(); }
    };
    tr.setTabla = function (on) {
      tablaOn = !!on && !!taal;
      if (tr.running && !tablaOn && ahead()) cutTabla();
    };
    tr.setClick = function (on) { clickOn = !!on; };
    tr.setOnBeat = function (fn) { onBeat = fn || null; };

    tr.playPattern = function (items, o = {}) {
      const nb = Math.max(1, o.notesPerBeat || 1), loop = !!o.loop;
      const events = []; let units = 0;
      (items || []).forEach((it, index) => {
        if (it.rest) { units += it.rest; return; }
        const f = env.freq(it.tok);
        if (f) events.push({ item: it, index, f, s: units / nb, d: it.beats / nb, legato: !!it.legato });
        units += it.beats;
      });
      if (!events.length) return { stop() {} };
      if (!tr.running) tr.start({ bpm: tr.bpm });
      if (pat && ahead()) cutFlute();         // an older pattern is queued seconds ahead: cut it
      const L = units / nb, C = cycle();
      const align = o.align === 'sam' && taal ? 'sam' : 'beat';
      const step = Math.max(1, align === 'sam' ? Math.ceil(L / C - EPS) * C : Math.ceil(L - EPS));
      const byBeat = {};
      events.forEach((e) => { const b = Math.floor(e.s + EPS); (byBeat[b] = byBeat[b] || []).push(e); });
      const startAt = o.startAt || (taal && tablaOn ? 'sam' : 'beat');
      const s0 = startAt === 'sam' && taal ? Math.ceil(cursorN / C) * C : cursorN;
      const handle = { stop() { if (pat === me) tr.stopPattern(); } };
      const me = pat = { s0, L, step, end: Math.max(1, Math.ceil(L - EPS)), loop, byBeat, onStep: o.onStep, onLoop: o.onLoop, onEnd: o.onEnd };
      return handle;
    };
    tr.stopPattern = function () {
      if (!pat) return;
      pat = null;
      // Always cut the melody, even when nothing is queued far ahead: the notes of a beat already handed to the
      // audio clock (up to a whole beat of them at 2 or 4 notes a beat) would otherwise keep sounding after Stop.
      if (tr.running) cutFlute();
    };
    tr.pump = pump;
    tr.on = function (fn) { listeners.push(fn); };
    Object.defineProperty(tr, 'patternActive', { get: () => !!pat });
    Object.defineProperty(tr, 'tablaOn', { get: () => tablaOn });
    return tr;
  }
  const clampBpm = (v) => Math.min(400, Math.max(20, Number(v) || 90));

  // The browser instance runs on the shared audio engine in audio.js.
  function browserEnv() {
    const Sound = root.FluteAudio.Engine;
    return {
      ensure: () => Sound.ensure(),
      now: () => Sound.ctx.currentTime,
      lookahead: (base) => root.FluteAudio.lookahead(base),
      hit: (bol, when, spb, bus) => Sound.hit(bol, when, spb, bus),
      bus: (kind) => Sound.bus(kind === 'tabla' ? 'tabla' : 'flute'),
      line: (events, bus, t0) => Sound.line(events, bus, t0),
      freq: (tok) => { const sw = root.FluteDemo && root.FluteDemo.parseSwar(tok); return sw ? Sound.saHz * 2 * Math.pow(2, sw.a / 12) : null; },
      later: (fn, ms) => setTimeout(fn, ms),
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (id) => clearInterval(id)
    };
  }
  let shared = null;
  const lazy = (name) => (...args) => (shared || (shared = create(browserEnv())))[name](...args);
  const api = { create, browserEnv };
  ['start', 'stop', 'setBpm', 'setTaal', 'setTabla', 'setClick', 'setOnBeat', 'playPattern', 'stopPattern', 'pump', 'on'].forEach((n) => { api[n] = lazy(n); });
  Object.defineProperty(api, 'running', { get: () => !!shared && shared.running });
  Object.defineProperty(api, 'patternActive', { get: () => !!shared && shared.patternActive });
  Object.defineProperty(api, 'bpm', { get: () => (shared ? shared.bpm : 90) });
  root.FluteTransport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
