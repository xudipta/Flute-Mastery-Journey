/* Now-playing bar (#mini): one slim bar above the tab bar that says what is sounding and what is counting down.

   It shows when the tanpura, the taal or a practice-block timer is running, and
     - on every tab but Home: for sound or a timer (Home has the sound controls itself);
     - on Home: only for a timer, which Home does not show.
   It reads FluteApp (app.js) and redraws when its audio or timer state changes, or when a tab opens.
     text area: goes to Home (sound) or to the running card on Practice (timer);
     stop button: stops the tanpura and the taal, never the timer. */
(function (root) {
  'use strict';
  const doc = root.document;
  const $ = (s) => doc.querySelector(s);
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  function init() {
    const A = root.FluteApp, N = root.FluteNav;
    const el = $('#mini');
    if (!el || !A || !N) return;
    const title = $('#mini-title'), sub = $('#mini-sub'), stop = $('#mini-stop'), open = $('#mini-open');
    let last = '';

    function render() {
      const drone = A.drone.on(), tabla = A.tabla.on(), t = A.timerInfo(), home = N.current() === 'home';
      const sound = [];
      if (drone) sound.push(`Tanpura · ${A.saName(A.sa()).replace(/ \(low\)$/, '')}`);
      if (tabla) sound.push(`${A.taalName().split(' · ')[0]} · ${A.bpm()} BPM`);
      const visible = t.show || ((drone || tabla) && !home);
      let line1, line2;
      if (t.show) { line1 = `${fmt(t.remaining)} · ${t.title}`; line2 = sound.join(' · ') || (t.running ? 'Practice timer' : 'Paused'); }
      else { line1 = sound[0] || ''; line2 = sound[1] || ''; }
      const key = [visible, line1, line2, drone || tabla, t.show && t.running].join('|');
      if (key === last) return;
      last = key;
      el.hidden = !visible;
      doc.body.classList.toggle('has-mini', visible);
      title.textContent = line1; sub.textContent = line2;
      stop.hidden = !(drone || tabla);
      el.classList.toggle('playing', !!(drone || tabla || (t.show && t.running)));
      open.setAttribute('aria-label', t.show ? `${line1}. Go to the timer` : `${line1}${line2 ? ', ' + line2 : ''}. Go to the tanpura and taal`);
    }

    open.addEventListener('click', () => { if (A.timerInfo().show) A.openTimer(); else N.go('home', { focus: false }); });
    stop.addEventListener('click', () => { A.drone.set(false); A.tabla.set(false); });
    A.on('audio', render); A.on('timer', render); A.on('sa', render);
    N.views.forEach((v) => N.onShow(v, render));
    render();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(window);
