/* Shared UI helpers (window.FluteUI): icons, button labels, bottom sheets and range-slider fill.

   Icons come from the inline sprite at the top of index.html (<symbol id="i-NAME">); they are monoline, take the text
   colour and are sized by .i in styles.css.
     icon(name, cls)        markup for one icon, for building HTML strings
     setLabel(btn, text)    set a button's text and keep its icon:   <button><svg class="i">…</svg><span class="lbl">Text</span></button>
     setIcon(btn, name)     switch the icon of such a button (play -> stop)

   Bottom sheets are <dialog class="sheet"> elements (see "shared components (v2)" in styles.css):
     openSheet(el)          opens it modal and slides it up; focus moves into it and returns to the opener on close
     closeSheet(el)         slides it down and closes it
   Anything inside a sheet with the attribute data-close closes it; so do Escape and a tap on the dimmed backdrop.
   A sheet sends "sheetopen" when it opens (the normal "close" event fires after it closes).

     syncRange(input)       repaint the filled part of a range slider after changing its value from script
   (typing or dragging is handled here already, for every <input type="range">) */
(function (root) {
  'use strict';
  const doc = root.document;
  const icon = (name, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

  function setLabel(btn, text) {
    let l = btn.querySelector(':scope > .lbl');
    if (!l) { l = doc.createElement('span'); l.className = 'lbl'; btn.appendChild(l); }
    l.textContent = text;
  }
  function setIcon(btn, name) {
    const u = btn.querySelector(':scope > svg use');
    if (u) u.setAttribute('href', '#i-' + name);
  }

  // ----- bottom sheets -----
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const opener = new WeakMap();
  function openSheet(el) {
    if (!el || el.open) return;
    opener.set(el, doc.activeElement);
    el.classList.remove('closing');
    el.showModal();
    // the slide runs from the hidden position, so the class is added a frame later
    root.requestAnimationFrame(() => el.classList.add('is-open'));
    el.dispatchEvent(new Event('sheetopen'));
  }
  function closeSheet(el) {
    if (!el || !el.open) return;
    const back = opener.get(el);
    const fin = () => {
      el.classList.remove('is-open', 'closing');
      if (el.open) el.close();
      if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
    };
    if (reduced()) { fin(); return; }
    el.classList.remove('is-open'); el.classList.add('closing');
    let done = false;
    const once = () => { if (done) return; done = true; fin(); };
    el.addEventListener('transitionend', once, { once: true });
    root.setTimeout(once, 300);
  }
  doc.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('[data-close]');
    const sheet = c && c.closest('dialog.sheet');
    if (sheet) { closeSheet(sheet); return; }
    if (e.target.matches && e.target.matches('dialog.sheet')) closeSheet(e.target); // a tap on the backdrop lands on the dialog itself
  });
  doc.addEventListener('cancel', (e) => { // Escape
    if (e.target.matches && e.target.matches('dialog.sheet')) { e.preventDefault(); closeSheet(e.target); }
  }, true);

  // ----- range sliders: the part up to the thumb is filled -----
  function syncRange(el) {
    const min = Number(el.min || 0), max = Number(el.max || 100), v = Number(el.value);
    el.style.setProperty('--pct', max > min ? ((v - min) / (max - min)) * 100 + '%' : '0%');
  }
  doc.addEventListener('input', (e) => { if (e.target.type === 'range') syncRange(e.target); });
  const syncAll = () => doc.querySelectorAll('input[type="range"]').forEach(syncRange);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', syncAll); else syncAll();

  root.FluteUI = { icon, setLabel, setIcon, openSheet, closeSheet, syncRange };
})(window);
