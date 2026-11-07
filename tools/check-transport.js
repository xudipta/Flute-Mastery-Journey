/* Checks the shared audio transport (assets/transport.js) on a fake audio clock: 60 s of audio per scenario.
   Run: node tools/check-transport.js   (exits 1 on any failure) */
const Transport = require('../assets/transport.js');
const TEENTAAL = { bols: ['Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin', 'Dhin', 'Dha'] };
const SCALE = "S R G m P D N S'".split(' ').map((tok) => ({ tok, beats: 1 }));
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' (' + detail + ')' : ''}`); };

// A fake audio engine: records every hit and every melody note with its absolute time and the bus it was sent to.
function fakeEnv(hiddenLookahead) {
  let now = 0, id = 0, busN = 0;
  const timers = [], intervals = {}, hits = [], notes = [];
  const env = {
    ensure() {}, now: () => now, lookahead: (b) => (hiddenLookahead ? 3 : b),
    hit(bol, when, spb, bus) { hits.push({ bol, when, bus }); },
    bus(kind) { const b = { id: ++busN, kind, stoppedAt: Infinity, stop() { if (b.stoppedAt === Infinity) b.stoppedAt = now; } }; return b; },
    line(events, bus, t0) { events.forEach((e) => notes.push({ when: t0 + e.start, dur: e.dur, f: e.f, bus })); return { stop() {} }; },
    freq: (tok) => 100 + tok.charCodeAt(0),
    later(fn, ms) { timers.push({ at: now + ms / 1000, fn }); },
    setInterval(fn) { intervals[++id] = fn; return id; }, clearInterval(i) { delete intervals[i]; }
  };
  // Advance the clock in 25 ms steps, firing timers and the scheduler like the browser would.
  const run = (seconds) => {
    const end = now + seconds;
    while (now < end - 1e-9) {
      now += 0.025;
      Object.values(intervals).forEach((f) => f());
      for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= now) { const t = timers.splice(i, 1)[0]; t.fn(); }
    }
  };
  // Audible = on a bus that was still open when the sound was due.
  const audible = (xs) => xs.filter((x) => x.when < x.bus.stoppedAt);
  return { env, run, hits, notes, audible, now: () => now };
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const MS5 = 0.005;
const frac = (x) => { const r = x - Math.floor(x); return Math.min(r, 1 - r); };

// ---- 1. looped 8-note pattern over Teentaal at 120 BPM, 60 s ----
{
  const f = fakeEnv(false), tr = Transport.create(f.env), beats = [], loops = [], steps = [];
  tr.start({ bpm: 120, taal: TEENTAAL, tabla: true, onBeat: (n) => beats.push(n) });
  tr.playPattern(SCALE, { loop: true, align: 'beat', onLoop: (k) => loops.push(k), onStep: (it) => steps.push(it.tok) });
  f.run(60);
  const h = f.audible(f.hits), t0 = h[0].when, n = f.audible(f.notes);
  check('1 tabla beats sit on the grid (drift < 5 ms)', h.every((x, i) => near(x.when, t0 + i * 0.5, MS5)), `${h.length} beats, max drift ${(Math.max(...h.map((x, i) => Math.abs(x.when - t0 - i * 0.5))) * 1000).toFixed(3)} ms`);
  check('1 melody starts on sam (first note = first beat)', near(n[0].when, t0, MS5));
  check('1 every note lands on a beat', n.every((x) => frac((x.when - t0) / 0.5) < 0.01));
  const gaps = n.slice(1).map((x, i) => x.when - (n[i].when + n[i].dur));
  check('1 gapless: each note starts when the previous one ends', gaps.every((g) => Math.abs(g) < MS5), `max gap ${(Math.max(...gaps.map(Math.abs)) * 1000).toFixed(3)} ms over ${n.length} notes`);
  check('1 repeats every 8 beats', n.filter((x, i) => i % 8 === 0).every((x, k) => near(x.when, t0 + k * 4, MS5)) && loops.length >= 14, `${loops.length} repeats`);
  check('1 onBeat / onStep callbacks fire', beats.length > 110 && steps.length >= 112, `${beats.length} beats, ${steps.length} steps`);
}

// ---- 2. a 12-note pattern with align:'sam' repeats only on sam (every 16 beats) ----
{
  const f = fakeEnv(false), tr = Transport.create(f.env);
  tr.start({ bpm: 120, taal: TEENTAAL, tabla: true });
  tr.playPattern(Array.from({ length: 12 }, (_, i) => ({ tok: 'SRGmPDN'[i % 7], beats: 1 })), { loop: true, align: 'sam' });
  f.run(60);
  const h = f.audible(f.hits), t0 = h[0].when, n = f.audible(f.notes), starts = n.filter((x, i) => i % 12 === 0).map((x) => (x.when - t0) / 0.5);
  check("2 align 'sam': repeats start on beats 0, 16, 32 ...", starts.length >= 7 && starts.every((b, k) => near(b, k * 16, 0.01)), starts.slice(0, 5).join(', '));
}

// ---- 3. two notes per beat: half-beat spacing, still on the grid ----
{
  const f = fakeEnv(false), tr = Transport.create(f.env);
  tr.start({ bpm: 120, taal: TEENTAAL, tabla: true });
  tr.playPattern(SCALE, { loop: true, notesPerBeat: 2 });
  f.run(60);
  const h = f.audible(f.hits), t0 = h[0].when, n = f.audible(f.notes);
  check('3 notesPerBeat 2: notes every 0.25 s from sam, no drift', n.every((x, i) => near(x.when, t0 + i * 0.25, MS5)) && n.length > 200, `${n.length} notes`);
}

// ---- 4/5. tempo change mid-run, with a short (visible) and a long (hidden) lookahead ----
for (const hidden of [false, true]) {
  const f = fakeEnv(hidden), tr = Transport.create(f.env);
  tr.start({ bpm: 120, taal: TEENTAAL, tabla: true });
  tr.playPattern(SCALE, { loop: true });
  f.run(30); tr.setBpm(150); const changedAt = f.now(); f.run(30);
  const h = f.audible(f.hits).sort((a, b) => a.when - b.when), t = h.map((x) => x.when);
  const sp = t.slice(1).map((x, i) => x - t[i]);
  const dup = sp.filter((s) => s < 0.2).length, big = Math.max(...sp);
  const before = sp.filter((s, i) => t[i + 1] < changedAt - 1), after = sp.filter((s, i) => t[i] > changedAt + 4);
  const tag = hidden ? '5 hidden (3 s lookahead)' : '4 visible';
  check(`${tag}: no double beat after a tempo change`, dup === 0, `min spacing ${(Math.min(...sp) * 1000).toFixed(0)} ms`);
  check(`${tag}: no gap (largest spacing <= one old beat + 5 ms)`, big <= 0.5 + MS5, `largest ${(big * 1000).toFixed(0)} ms`);
  check(`${tag}: 0.5 s beats before, 0.4 s after`, before.every((s) => near(s, 0.5, MS5)) && after.every((s) => near(s, 0.4, MS5)));
  const n = f.audible(f.notes).sort((a, b) => a.when - b.when);
  check(`${tag}: melody stays on the beats through the change`, n.every((x) => t.some((b) => near(b, x.when, MS5))), `${n.length} notes`);
}

// ---- 6. taal change restarts from sam; a single pass ends once; stop is clean ----
{
  const f = fakeEnv(false), tr = Transport.create(f.env), beats = []; let ended = 0;
  tr.start({ bpm: 120, taal: TEENTAAL, tabla: true, onBeat: (n, idx) => beats.push(idx) });
  f.run(5); tr.setTaal({ bols: ['Dha', 'Dhi', 'Na', 'Dha', 'Tu', 'Na'] }); const k = beats.length; f.run(3);
  check('6 setTaal restarts from beat 0', beats[k] === 0 && beats[k + 1] === 1, `idx after change: ${beats.slice(k, k + 7).join(' ')}`);
  const from = f.now(); tr.playPattern(SCALE, { onEnd: () => ended++ }); f.run(10);
  check('6 a non-looping pattern plays once and calls onEnd once', ended === 1 && f.notes.filter((x) => x.when > from).length === 8, `${ended} onEnd, ${f.notes.filter((x) => x.when > from).length} notes`);
  const hitsBefore = f.hits.length; tr.stop(); f.run(5);
  check('6 stop(): nothing new is scheduled', f.hits.length === hitsBefore && !tr.running);
}

// ---- 7. no taal: click and melody share the grid ----
{
  const f = fakeEnv(false), tr = Transport.create(f.env);
  tr.start({ bpm: 90, click: true });
  tr.playPattern(SCALE, { loop: true, notesPerBeat: 2 }); f.run(20);
  const n = f.audible(f.notes), h = f.audible(f.hits);
  check('7 no taal: click and melody share the grid', h.length > 25 && n.every((x, i) => near(x.when, h[0].when + i * (60 / 90 / 2), MS5)), `${h.length} clicks, ${n.length} notes`);
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
