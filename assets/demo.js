/* Bansuri finger chart, swar fingering model, and the demo dialog + player used by the raga demos. */
(function (root) {
  'use strict';
  const Sound = root.FluteAudio.Engine;
  const $ = (s, p = document) => p.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- swar -> fingering ----------
  // Simplified model of a six-hole bansuri (holes 1-3 left hand, 4-6 right hand):
  //  * lifting a hole raises the pitch; a komal swar is the hole between two swars half-covered;
  //  * Ma is hole 1 half-covered and tivra Ma is every hole open;
  //  * the next octave uses the same fingerings with a stronger breath (overblowing).
  // Keys are semitones from the lowest note (Pa, mandra) up to tivra Ma.
  const BASE = {
    '-5': [[1, 2, 3, 4, 5, 6], []], '-4': [[1, 2, 3, 4, 5], [6]], '-3': [[1, 2, 3, 4, 5], []],
    '-2': [[1, 2, 3, 4], [5]], '-1': [[1, 2, 3, 4], []], '0': [[1, 2, 3], []],
    '1': [[1, 2], [3]], '2': [[1, 2], []], '3': [[1], [2]], '4': [[1], []], '5': [[], [1]], '6': [[], []]
  };
  const SEMI = { S: 0, r: 1, R: 2, g: 3, G: 4, m: 5, M: 6, P: 7, d: 8, D: 9, n: 10, N: 11 };
  const SHOW = { S: 'Sa', r: 'Re♭', R: 'Re', g: 'Ga♭', G: 'Ga', m: 'Ma', M: 'Ma♯', P: 'Pa', d: 'Dha♭', D: 'Dha', n: 'Ni♭', N: 'Ni' };

  function parseSwar(tok) {
    const m = /^(\.?)([SrRgGmMPdDnN])('?)$/.exec(tok);
    if (!m) return null;
    const a = SEMI[m[2]] + (m[1] ? -12 : 0) + (m[3] ? 12 : 0);
    let key = a, over = false;
    if (a > 6) { key = a - 12; over = true; }
    const f = BASE[key];
    if (!f) return null;
    return { tok, a, closed: f[0], half: f[1], over, label: (m[1] ? '·' : '') + SHOW[m[2]] + (m[3] ? '′' : ''), name: SHOW[m[2]] };
  }
  const describe = (sw) => {
    const c = sw.closed.length ? `${sw.closed.length > 1 ? 'holes' : 'hole'} ${sw.closed.join(', ')} covered` : 'no holes fully covered';
    const h = sw.half.length ? `; hole ${sw.half.join(', ')} half-covered` : '';
    return `${sw.label}: ${c}${h}${sw.over ? '. Blow a little harder (upper octave)' : ''}.`;
  };

  // ---------- finger chart ----------
  const HOLE_X = { 1: 180, 2: 235, 3: 290, 4: 400, 5: 455, 6: 510 };
  function createChart(svg) {
    svg.innerHTML = '';
    const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
    add('rect', { class: 'body', x: 20, y: 60, width: 600, height: 24, rx: 12 });
    add('ellipse', { class: 'hole', cx: 85, cy: 72, rx: 14, ry: 8 });
    add('text', { x: 85, y: 108 }).textContent = 'Blowing hole';
    add('text', { x: 235, y: 36 }).textContent = 'LEFT HAND';
    add('text', { x: 455, y: 36 }).textContent = 'RIGHT HAND';
    const key = {}, half = {};
    for (let i = 1; i <= 6; i++) {
      const x = HOLE_X[i];
      key[i] = add('circle', { class: 'key', cx: x, cy: 72, r: 13 });
      half[i] = add('path', { class: 'half', d: `M${x} 59 A13 13 0 0 0 ${x} 85 Z` });
      add('text', { x, y: 108 }).textContent = String(i);
    }
    add('text', { x: 560, y: 140 }).textContent = 'Open end';
    const over = add('text', { x: 85, y: 140, class: 'over' });
    return {
      show(closed, halves, overblow) {
        for (let i = 1; i <= 6; i++) {
          key[i].classList.toggle('on', closed.includes(i));
          key[i].classList.toggle('halfring', halves.includes(i));
          half[i].classList.toggle('on', halves.includes(i));
        }
        over.textContent = overblow ? '↑ blow harder' : '';
      },
      clear() { this.show([], [], false); }
    };
  }

  // ---------- timeline -> audio + highlighting ----------
  // items: [{tok, beats, legato}] or {rest: beats}. Returns {events, steps, total} in beats.
  function toLine(items, spb, saHz) {
    const events = [], steps = [];
    let t = 0;
    items.forEach((it) => {
      if (it.rest) { t += it.rest * spb; return; }
      const sw = parseSwar(it.tok);
      if (!sw) return;
      const dur = it.beats * spb;
      events.push({ f: saHz * 2 * Math.pow(2, sw.a / 12), start: t, dur, legato: !!it.legato });
      steps.push({ start: t, dur, sw, ref: it.ref });
      t += dur;
    });
    return { events, steps, total: t };
  }
  const player = {
    bus: null, line: null, raf: 0, run: 0,
    play(items, bpm, opts) {
      this.stop();
      const spb = 60 / bpm, ln = toLine(items, spb, Sound.saHz);
      if (!ln.events.length) return;
      Sound.ensure();
      this.bus = Sound.bus();
      const c = Sound.ctx, t0 = c.currentTime + 0.12, id = ++this.run;
      this.line = Sound.line(ln.events, this.bus, t0);
      let last = -2;
      const tick = () => {
        if (id !== this.run) return;
        const now = c.currentTime - t0;
        let cur = -1;
        for (let i = 0; i < ln.steps.length; i++) if (now >= ln.steps[i].start && now < ln.steps[i].start + ln.steps[i].dur) cur = i;
        if (cur !== last) { last = cur; opts.onStep(cur >= 0 ? ln.steps[cur] : null); }
        if (opts.onFrame) opts.onFrame(cur >= 0 ? ln.steps[cur] : null, cur >= 0 ? (now - ln.steps[cur].start) / ln.steps[cur].dur : 0);
        if (now > ln.total + 0.15) { this.stop(); opts.onEnd(); return; }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    },
    stop() {
      this.run++; cancelAnimationFrame(this.raf);
      resetPreview();
      if (this.line) this.line.stop();
      if (this.bus) this.bus.stop();
      this.line = this.bus = null;
    }
  };

  // One-tap preview of a raga's aroha from its card.
  let previewBtn = null;
  function resetPreview() { if (previewBtn) { previewBtn.textContent = '▶ Hear aroha'; previewBtn.classList.remove('on'); previewBtn = null; } }
  function preview(name, btn) {
    const info = root.RAGA_NOTATION[name];
    if (!info) return;
    if (previewBtn === btn) { player.stop(); return; }
    const items = info.aroha.split(/\s+/).map((tok) => ({ tok, beats: 1 }));
    items[items.length - 1].beats = 2;
    player.play(items, 80, { onStep() {}, onEnd() {} });
    previewBtn = btn; btn.textContent = '■ Stop'; btn.classList.add('on');
  }

  // ---------- dialog ----------
  let cleanup = null;
  function openDialog(title, sub, build) {
    const dlg = $('#demo');
    $('#demo-title').textContent = title;
    $('#demo-sub').textContent = sub || '';
    const body = $('#demo-body'); body.innerHTML = '';
    cleanup = build(body) || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeDialog() {
    player.stop();
    if (cleanup) { cleanup(); cleanup = null; }
    const dlg = $('#demo');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('#demo-close').addEventListener('click', closeDialog);
    $('#demo').addEventListener('close', () => { player.stop(); if (cleanup) { cleanup(); cleanup = null; } });
    $('#demo').addEventListener('click', (e) => { if (e.target.id === 'demo') closeDialog(); });
  });

  // ---------- raga demo ----------
  const SPEEDS = { Slow: 50, Normal: 80, Fast: 120 };
  const vname = (t) => (t ? parseSwar(t).name : '—');
  function ragaDemo(name, timeGroup) {
    const info = root.RAGA_NOTATION[name];
    if (!info) return;
    openDialog('Raga ' + name, `${timeGroup} raga · thaat ${info.thaat}`, (body) => {
      const lines = [['aroha', 'Aroha (ascending)'], ['avaroha', 'Avaroha (descending)'], ['pakad', 'Pakad (signature phrases)']].filter(([k]) => info[k]);
      body.innerHTML = `
        <dl class="facts"><div><dt>Vadi</dt><dd>${vname(info.vadi)}</dd></div><div><dt>Samvadi</dt><dd>${vname(info.samvadi)}</dd></div><div><dt>Thaat</dt><dd>${info.thaat}</dd></div></dl>
        <div class="notation">${lines.map(([k, label]) => `<div class="nline" data-k="${k}"><span class="nlabel">${label}</span><span class="ntoks"></span></div>`).join('')}</div>
        <svg class="demo-chart" viewBox="0 0 640 150" role="img" aria-label="Bansuri finger-hole chart for the swar being played"></svg>
        <p class="demo-cap" aria-live="polite">Press a play button to hear and see the raga.</p>
        <div class="demo-controls">
          <button class="btn small" data-play="aroha">▶ Aroha</button>
          <button class="btn small" data-play="avaroha">▶ Avaroha</button>
          ${info.pakad ? '<button class="btn small" data-play="pakad">▶ Pakad</button>' : ''}
          <button class="btn small" data-play="both">▶ Aroha + avaroha</button>
          <button class="btn small ghost" data-stop>■ Stop</button>
          <label>Speed <select data-speed>${Object.keys(SPEEDS).map((s) => `<option${s === 'Normal' ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
          <label><input type="checkbox" data-loop> Loop</label>
        </div>
        <p class="demo-note">The tonic follows the Sa chosen in the tools bar. Simplified notation and fingering: check with your guru.</p>`;
      const chart = createChart($('.demo-chart', body)), cap = $('.demo-cap', body);
      const rows = {};
      lines.forEach(([k]) => {
        const holder = $(`.nline[data-k="${k}"] .ntoks`, body);
        rows[k] = [];
        info[k].split(/\s+/).forEach((tok) => {
          if (tok === '|') { holder.append(Object.assign(document.createElement('span'), { className: 'sep', textContent: '|' })); return; }
          const sw = parseSwar(tok); if (!sw) return;
          const s = document.createElement('span'); s.className = 'tok'; s.textContent = sw.label;
          holder.appendChild(s); rows[k].push({ el: s, tok });
        });
      });
      const itemsFor = (k) => {
        const out = []; let idx = 0, prevRest = true;
        info[k].split(/\s+/).forEach((tok) => {
          if (tok === '|') { out.push({ rest: 1 }); prevRest = true; return; }
          if (!parseSwar(tok)) return;
          out.push({ tok, beats: 1, legato: k === 'pakad' && !prevRest, ref: [k, idx++] });
          prevRest = false;
        });
        // hold the final swar of each line a little longer
        const lastSw = [...out].reverse().find((x) => x.tok);
        if (lastSw) lastSw.beats = 2;
        return out;
      };
      const clearMarks = () => body.querySelectorAll('.tok.now').forEach((e) => e.classList.remove('now'));
      let current = null;
      const speed = () => SPEEDS[$('[data-speed]', body).value];
      const loop = () => $('[data-loop]', body).checked;
      function run(which) {
        current = which;
        const items = which === 'both' ? itemsFor('aroha').concat([{ rest: 1 }], itemsFor('avaroha')) : itemsFor(which);
        body.querySelectorAll('[data-play]').forEach((b) => b.classList.toggle('on', b.dataset.play === which));
        player.play(items, speed(), {
          onStep(step) {
            clearMarks();
            if (!step) { chart.clear(); return; }
            const [k, i] = step.ref; rows[k][i].el.classList.add('now');
            chart.show(step.sw.closed, step.sw.half, step.sw.over);
            cap.textContent = describe(step.sw);
          },
          onEnd() { clearMarks(); chart.clear(); if (loop()) run(current); else { cap.textContent = 'Done. Play again, or change the speed.'; body.querySelectorAll('[data-play]').forEach((b) => b.classList.remove('on')); } }
        });
      }
      body.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => run(b.dataset.play)));
      $('[data-stop]', body).addEventListener('click', () => { current = null; player.stop(); clearMarks(); chart.clear(); body.querySelectorAll('[data-play]').forEach((b) => b.classList.remove('on')); });
      return () => { clearMarks(); };
    });
  }

  root.FluteDemo = { parseSwar, describe, createChart, player, openDialog, closeDialog, ragaDemo, preview, SPEEDS };
})(window);
