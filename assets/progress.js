/* Your progress: practice calendar, day notes, routine editor and backup/restore. Uses window.FluteApp from app.js. */
(function (root) {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const App = () => root.FluteApp;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const PRESETS = {
    'Quick · 15 min': { breath: 2, sa: 4, alankar: 3, raga: 4, taal: 0, cool: 2 },
    'Standard · 30 min': { breath: 3, sa: 6, alankar: 6, raga: 8, taal: 4, cool: 3 },
    'Full · 55 min': { breath: 5, sa: 10, alankar: 10, raga: 15, taal: 10, cool: 5 }
  };
  let view = new Date(), selected = null;
  view.setDate(1);

  const pluralDays = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;
  function bestStreak(A) {
    const keys = A.practisedDays().sort();
    let best = 0, run = 0, prev = null;
    keys.forEach((k) => {
      const d = new Date(k + 'T00:00:00');
      if (prev && Math.round((d - prev) / 86400000) === 1) run++; else run = 1;
      best = Math.max(best, run); prev = d;
    });
    return best;
  }
  function stats() {
    const A = App(), log = A.state().log, days = A.practisedDays();
    const total = days.reduce((s, k) => s + (log[k].minutes || 0), 0);
    const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    let week = 0, weekDays = 0;
    days.forEach((k) => { if (k >= A.dateKey(mon)) { week += log[k].minutes || 0; weekDays++; } });
    const items = [[A.streak(), 'day streak'], [bestStreak(A), 'best streak'], [days.length, 'days practised'], [week, `min this week (${pluralDays(weekDays)})`], [total, 'minutes in total']];
    $('#pstats').innerHTML = items.map(([n, l]) => `<div><strong>${n}</strong><span>${l}</span></div>`).join('');
  }
  function renderCalendar() {
    const A = App(), log = A.state().log, y = view.getFullYear(), m = view.getMonth();
    $('#cal-title').textContent = `${MONTHS[m]} ${y}`;
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate(), today = A.todayKey();
    const cells = [], keys = [];
    for (let d = 1; d <= count; d++) keys.push(A.dateKey(new Date(y, m, d)));
    // One day is in the tab order (the selected day, else today, else the 1st); arrow keys move between days.
    const tabKey = keys.includes(selected) ? selected : keys.includes(today) ? today : keys[0];
    for (let i = 0; i < lead; i++) cells.push('<span class="cal-empty"></span>');
    keys.forEach((k, i) => {
      const d = i + 1, e = log[k], did = A.practised(k), future = k > today;
      const cls = ['cal-day', did ? (e.complete ? 'lv2' : 'lv1') : '', k === today ? 'today' : '', k === selected ? 'sel' : '', e && e.note ? 'has-note' : ''].join(' ');
      const label = `${d} ${MONTHS[m]}: ${future ? 'not yet' : did ? (e.minutes ? e.minutes + ' minutes' : 'practised') + (e.complete ? ', full routine' : '') : 'no practice'}${e && e.note ? ', has a note' : ''}`;
      cells.push(`<button type="button" class="${cls}" data-k="${k}" aria-label="${label}" aria-pressed="${k === selected}" tabindex="${k === tabKey ? 0 : -1}"${future ? ' disabled' : ''}>${d}</button>`);
    });
    $('#cal-grid').innerHTML = cells.join('');
  }
  function renderDetail() {
    const A = App(), box = $('#day-detail');
    if (!selected) { box.innerHTML = '<p class="hint">Select a day to see details.</p>'; return; }
    const e = A.state().log[selected], d = new Date(selected + 'T00:00:00');
    const names = (e && e.blocks || []).map((id) => (A.BLOCKS.find((b) => b.id === id) || {}).title).filter(Boolean);
    const sum = A.practised(selected)
      ? `${e.minutes ? e.minutes + ' minutes' : 'Practised'}${e.complete ? ' · full routine' : ''}${names.length ? ': ' + names.join(', ') : ''}`
      : 'No practice logged.';
    box.innerHTML = `<h4>${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h4><p>${sum}</p>
      <label class="note-label">Note <span class="hint">(what you worked on, tempo, how it felt)</span>
      <textarea id="day-note" rows="2" maxlength="500" placeholder="e.g. Yaman alaap at 60 BPM, meend on Ga felt steadier"></textarea></label>`;
    const ta = $('#day-note'); ta.value = (e && e.note) || '';
    ta.addEventListener('input', () => {
      const st = A.state();
      if (ta.value.trim()) { st.log[selected] = Object.assign({ minutes: 0, blocks: [], complete: false }, st.log[selected], { note: ta.value }); }
      else if (st.log[selected]) { st.log[selected].note = ''; if (!A.practised(selected)) delete st.log[selected]; }
      A.saveState(); renderCalendar();
    });
  }
  function refresh() { if (!App()) return; stats(); renderCalendar(); renderDetail(); }

  // ----- routine editor -----
  let plan = [];
  function editorTotal() {
    const t = plan.filter((p) => p.on).reduce((s, p) => s + p.min, 0);
    $('#re-total').textContent = `Total: ${t} minutes`; $('#re-save').disabled = !plan.some((p) => p.on);
  }
  function renderEditor() {
    const A = App();
    $('#re-list').innerHTML = plan.map((p, i) => {
      const b = A.BLOCKS.find((x) => x.id === p.id);
      return `<li class="re-row"><label class="re-on"><input type="checkbox" data-i="${i}" data-f="on" ${p.on ? 'checked' : ''} aria-label="Include ${b.title}"> <span>${b.title}</span></label>
        <label class="re-min"><input type="number" min="1" max="60" value="${p.min}" data-i="${i}" data-f="min" aria-label="Minutes for ${b.title}"> min</label>
        <button type="button" class="dock-btn" data-up="${i}" aria-label="Move ${b.title} up" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button type="button" class="dock-btn" data-down="${i}" aria-label="Move ${b.title} down" ${i === plan.length - 1 ? 'disabled' : ''}>▼</button></li>`;
    }).join('');
    editorTotal();
  }
  function openEditor() {
    const A = App();
    plan = (A.settings.routine || A.defaultPlan()).map((p) => Object.assign({}, p));
    A.BLOCKS.forEach((b) => { if (!plan.some((p) => p.id === b.id)) plan.push({ id: b.id, min: b.min, on: false }); });
    renderEditor(); $('#routine-editor').showModal();
  }
  function setupEditor() {
    const dlg = $('#routine-editor'), presets = $('#re-presets');
    Object.keys(PRESETS).forEach((name) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = name;
      b.addEventListener('click', () => {
        const mins = PRESETS[name];
        plan.forEach((p) => { p.on = mins[p.id] > 0; if (mins[p.id] > 0) p.min = mins[p.id]; });
        renderEditor();
      });
      presets.appendChild(b);
    });
    $('#edit-routine').addEventListener('click', openEditor);
    $('#re-close').addEventListener('click', () => dlg.close());
    $('#re-cancel').addEventListener('click', () => dlg.close());
    $('#re-save').addEventListener('click', () => { App().setPlan(plan.map((p) => ({ id: p.id, min: p.min, on: p.on }))); dlg.close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#re-list').addEventListener('change', (e) => {
      const t = e.target, i = Number(t.dataset.i); if (Number.isNaN(i)) return;
      if (t.dataset.f === 'on') plan[i].on = t.checked;
      else plan[i].min = Math.min(60, Math.max(1, Math.round(Number(t.value) || 1)));
      renderEditor();
    });
    $('#re-list').addEventListener('click', (e) => {
      const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]');
      const i = up ? Number(up.dataset.up) : down ? Number(down.dataset.down) : -1; if (i < 0) return;
      const j = up ? i - 1 : i + 1;
      [plan[i], plan[j]] = [plan[j], plan[i]]; renderEditor();
      const sel = `[data-${up ? 'up' : 'down'}="${j}"]`; const nb = $('#re-list ' + sel); if (nb && !nb.disabled) nb.focus();
    });
  }

  // ----- backup / restore -----
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  function clean(imp) {
    const out = { log: {}, favs: [] };
    const src = imp && typeof imp === 'object' ? imp : {};
    const log = src.log && typeof src.log === 'object' ? src.log : {};
    Object.keys(log).slice(0, 5000).forEach((k) => {
      const e = log[k];
      if (!DATE.test(k) || !e || typeof e !== 'object') return;
      out.log[k] = { minutes: Math.min(1000, Math.max(0, Number(e.minutes) || 0)), blocks: Array.isArray(e.blocks) ? e.blocks.filter((x) => typeof x === 'string').slice(0, 20) : [], complete: !!e.complete, note: typeof e.note === 'string' ? e.note.slice(0, 500) : '' };
      if (e.legacy) out.log[k].legacy = true;
    });
    if (src.days && typeof src.days === 'object') Object.keys(src.days).forEach((k) => { if (DATE.test(k) && !out.log[k]) out.log[k] = { minutes: 0, blocks: [], complete: true, legacy: true, note: '' }; });
    const s = src.settings && typeof src.settings === 'object' ? src.settings : {};
    if (Array.isArray(s.favs)) out.favs = s.favs.filter((x) => typeof x === 'string').slice(0, 100);
    return out;
  }
  function setupData() {
    const msg = (t) => { $('#data-msg').textContent = t; };
    $('#data-export').addEventListener('click', () => {
      const A = App(), st = A.state();
      const blob = new Blob([JSON.stringify({ app: 'flute-mastery-journey', version: 2, exported: new Date().toISOString(), log: st.log, settings: A.settings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `flute-journey-backup-${A.todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      msg('Backup downloaded.');
    });
    $('#data-import').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 2e6) { msg('That file is too large to be a backup.'); return; }
      f.text().then((txt) => {
        let data; try { data = JSON.parse(txt); } catch (x) { msg('That file is not valid JSON.'); return; }
        const c = clean(data), keys = Object.keys(c.log);
        if (!keys.length && !c.favs.length) { msg('No practice days found in that file.'); return; }
        const A = App(), st = A.state(), fresh = keys.filter((k) => !st.log[k]).length;
        if (!confirm(`Merge ${keys.length} practice days (${fresh} new) from this backup into your progress? Your current data is kept; where both have a day, the longer practice and any note are kept.`)) return;
        keys.forEach((k) => {
          const cur = st.log[k], inc = c.log[k];
          if (!cur) { st.log[k] = inc; return; }
          if (inc.minutes > cur.minutes) Object.assign(cur, { minutes: inc.minutes, blocks: inc.blocks, complete: inc.complete });
          if (!cur.note && inc.note) cur.note = inc.note;
        });
        A.settings.favs = [...new Set([...(A.settings.favs || []), ...c.favs])];
        A.saveState(); location.reload();
      }).catch(() => msg('Could not read that file.'));
    });
    $('#reset-progress').addEventListener('click', () => {
      if (!confirm('Delete ALL practice history, notes and settings from this browser? Export a backup first if you might want it back. This cannot be undone.')) return;
      try { localStorage.removeItem('flute-journey'); } catch (x) { /* ignore */ }
      location.reload();
    });
  }

  function init() {
    selected = App().todayKey();
    $('#cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
    $('#cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
    $('#cal-today').addEventListener('click', () => { view = new Date(); view.setDate(1); selected = App().todayKey(); refresh(); });
    $('#cal-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      selected = b.dataset.k; renderCalendar(); renderDetail();
      // Keyboard (Enter/Space) keeps focus on the day; a mouse click goes straight to the note.
      if (e.detail === 0) $(`#cal-grid [data-k="${selected}"]`).focus();
      else { const ta = $('#day-note'); if (ta && matchMedia('(pointer: fine)').matches) ta.focus(); }
    });
    $('#cal-grid').addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const days = [...$('#cal-grid').querySelectorAll('[data-k]')], i = days.indexOf(b);
      const dow = (new Date(b.dataset.k + 'T00:00:00').getDay() + 6) % 7;
      const j = { ArrowLeft: i - 1, ArrowRight: i + 1, ArrowUp: i - 7, ArrowDown: i + 7, Home: i - dow, End: i + 6 - dow }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      const t = days[Math.max(0, Math.min(days.length - 1, j))];
      if (!t || t.disabled) return;
      b.tabIndex = -1; t.tabIndex = 0; t.focus();
    });
    $('#add-note').addEventListener('click', () => { view = new Date(); view.setDate(1); selected = App().todayKey(); refresh(); setTimeout(() => { const t = $('#day-note'); if (t) t.focus(); }, 400); });
    setupEditor(); setupData(); refresh();
  }
  root.FluteProgress = { refresh };
  if (root.FluteApp) init(); else document.addEventListener('DOMContentLoaded', init);
})(window);
