/* Practice view (#view-practice): the swipeable practice cards.
   app.js builds one card (<li class="pc-card" data-id>) per block of today's routine inside #routine and owns the
   single shared timer; this file is only the carousel: a scroll-snap track whose cards start at the page gutter (the next
   card peeks in at the right edge), the step bar, the "Step N of M / Next: ..." line, arrow buttons and keys.

   API (window.PracticeCards):
     goTo(target, opts)  open a card; target is a block id or an index. opts: { smooth = true, vertical }
                         vertical: 'nearest' | 'center' also scrolls the page so the card is on screen
     sync()              re-read the cards (after the routine was rebuilt, or a card became done/running)
     index()             the card in view
   While the view is hidden (display: none) nothing can be measured, so goTo remembers the card and the view
   scrolls to it when it is shown. */
(function (root) {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const track = $('#routine'), prev = $('#pc-prev'), next = $('#pc-next'), dots = $('#pc-dots'), count = $('#pc-count');
  const stepLabel = $('#pc-step-label'), nextLabel = $('#pc-next-label');
  if (!track) return;

  const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = () => [...track.children];
  const visible = () => track.clientWidth > 0;

  let idx = 0, touched = false, firstShown = false, lockUntil = 0, raf = 0, dotCount = 0;

  // Cards sit at the left padding of the track (the page gutter), so a card is "in view" when its left edge is nearest there.
  const padLeft = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  function centred() {
    const at = track.scrollLeft + padLeft();
    let best = 0, bd = Infinity;
    slides().forEach((s, i) => { const d = Math.abs(s.offsetLeft - at); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const firstUndone = () => { const s = slides(), i = s.findIndex((x) => !x.classList.contains('done')); return i < 0 ? 0 : i; };

  function scrollTo(i, smooth, vertical) {
    const s = slides()[i]; if (!s) return;
    const behavior = smooth && !reduce() ? 'smooth' : 'instant';
    if (smooth) lockUntil = performance.now() + 700; // ignore the scroll events of our own animation
    if (vertical) s.scrollIntoView({ block: vertical, inline: 'start', behavior });
    else track.scrollTo({ left: Math.max(0, s.offsetLeft - padLeft()), behavior });
  }

  function update() {
    const s = slides(), n = s.length;
    idx = Math.max(0, Math.min(n - 1, idx));
    count.textContent = n ? `${idx + 1} of ${n}` : '';
    stepLabel.textContent = n ? `Step ${idx + 1} of ${n}` : '';
    const after = s[idx + 1], name = after && after.querySelector('h3');
    nextLabel.textContent = name ? `Next: ${name.textContent}` : '';
    nextLabel.hidden = !name;
    prev.disabled = idx <= 0; next.disabled = idx >= n - 1;
    s.forEach((x, i) => x.classList.toggle('is-current', i === idx));
    [...dots.children].forEach((d, i) => {
      const li = s[i]; if (!li) return;
      d.classList.toggle('is-current', i === idx);
      d.classList.toggle('is-done', li.classList.contains('done'));
      d.classList.toggle('is-running', li.classList.contains('running'));
      if (i === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
  }

  function sync() {
    const s = slides();
    if (s.length !== dotCount) {
      dotCount = s.length; dots.innerHTML = '';
      s.forEach((li, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pc-dot';
        b.setAttribute('aria-label', `Go to block ${i + 1}: ${(li.querySelector('h3') || {}).textContent || ''}`);
        b.addEventListener('click', () => goTo(i));
        dots.appendChild(b);
      });
      if (visible()) scrollTo(Math.min(idx, s.length - 1), false); // rebuilt (routine edited): keep the place
    }
    update();
  }

  function goTo(target, opts) {
    const o = Object.assign({ smooth: true }, opts);
    const i = typeof target === 'number' ? target : slides().findIndex((s) => s.dataset.id === target);
    if (i < 0) return;
    touched = true; idx = i; update();
    if (visible()) scrollTo(i, o.smooth, o.vertical);
  }

  // Swiping: follow the scroll position, unless a programmatic scroll is still animating.
  track.addEventListener('scroll', () => {
    if (raf || performance.now() < lockUntil) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const i = centred();
      if (i !== idx) { idx = i; touched = true; update(); }
    });
  }, { passive: true });
  ['touchstart', 'pointerdown', 'wheel'].forEach((t) => track.addEventListener(t, () => { lockUntil = 0; }, { passive: true }));

  prev.addEventListener('click', () => goTo(idx - 1));
  next.addEventListener('click', () => goTo(idx + 1));
  track.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('select, textarea, input[type="text"], input[type="range"]')) return;
    const to = e.key === 'ArrowLeft' ? idx - 1 : e.key === 'ArrowRight' ? idx + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? slides().length - 1 : null;
    if (to === null) return;
    e.preventDefault(); goTo(Math.max(0, Math.min(slides().length - 1, to)));
  });
  // Tabbing into a card (or a card taking focus) brings it into view.
  track.addEventListener('focusin', (e) => {
    const li = e.target.closest('.pc-card'); if (!li) return;
    const i = slides().indexOf(li);
    if (i >= 0 && i !== idx && performance.now() >= lockUntil) { idx = i; update(); scrollTo(i, true); }
  });

  // First visit to the view: open the next block still to do. After that, keep the place.
  if (root.FluteNav) {
    root.FluteNav.onShow('practice', () => {
      requestAnimationFrame(() => {
        if (!firstShown) { firstShown = true; if (!touched) idx = firstUndone(); }
        update(); scrollTo(idx, false);
      });
    });
  }

  // The calendar button in the view header jumps to the Progress section further down this view.
  const calBtn = $('#pc-cal');
  if (calBtn) calBtn.addEventListener('click', () => {
    const t = $('#progress'); if (t) t.scrollIntoView({ block: 'start', behavior: reduce() ? 'instant' : 'smooth' });
  });

  root.PracticeCards = { goTo, sync, index: () => idx };
  sync();
  // A timer restored on page load (app.js runs first) tells us which card to open.
  const timerBlock = root.FluteApp && root.FluteApp.timerBlockId && root.FluteApp.timerBlockId();
  if (timerBlock) goTo(timerBlock, { smooth: false });
})(window);
