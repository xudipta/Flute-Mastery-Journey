/* View router: the app is five views (Home, Practice, Alankar, Ragas, Learn), one visible at a time, switched from the
   tab bar (phones) or the top nav (desktop). Everything lives in one page, so audio, timers and the now-playing bar keep
   running when you change tab.

   Routes are hash links: #home #practice #alankar #ragas #learn. Older section links still work and open the view
   that now holds the section: #progress and #routine -> practice, #tabla -> home, #tuner #fingering #roadmap
   #techniques -> learn (and scroll to that section).

   API (window.FluteNav):
     go(name, opts)     show the view for `name` (a view or a section id above). opts: { top, focus, replace }
                        top: scroll to the top of the view instead of restoring its last position
                        focus: false to leave focus alone (default: move it to the view's heading)
                        replace: replace the history entry instead of adding one
     current()          the visible view's name
     onShow(view, fn)   call fn each time `view` becomes visible; also once straight away if it already is,
                        so a view can render lazily
     onHide(view, fn)   call fn each time `view` stops being visible
     views              the view names, in tab order
   Each view is <section class="view" id="view-NAME" data-view="NAME">; tabs are <a href="#NAME" data-view="NAME">. */
(function (root) {
  'use strict';
  const VIEWS = ['home', 'practice', 'alankar', 'ragas', 'learn'];
  const ROUTES = {
    home: 'home', top: 'home', tabla: 'home',
    practice: 'practice', progress: 'practice', routine: 'practice',
    alankar: 'alankar',
    ragas: 'ragas',
    learn: 'learn', tuner: 'learn', fingering: 'learn', roadmap: 'learn', techniques: 'learn'
  };
  // Ids of sections to scroll to inside their view (the view names themselves open at the top).
  const SECTIONS = ['progress', 'tabla', 'tuner', 'fingering', 'roadmap', 'techniques'];

  let cur = null;
  const scrollAt = {}, shown = {}, hidden = {};
  const viewEl = (v) => document.getElementById('view-' + v);
  const fire = (map, v) => (map[v] || []).forEach((fn) => { try { fn(v); } catch (e) { console.error(e); } });
  const route = (name) => (ROUTES[name] ? { name, view: ROUTES[name], section: SECTIONS.includes(name) ? name : null } : null);
  const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); return id ? route(id) : route('home'); };

  function headingOf(el) { return el && el.querySelector('h1, h2, h3'); }
  function focusHeading(el) {
    const h = headingOf(el); if (!h) return;
    h.tabIndex = -1; h.focus({ preventScroll: true });
  }

  function markTabs() {
    document.querySelectorAll('a[data-view]').forEach((a) => {
      const on = a.dataset.view === cur;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // Smooth scrolling only inside a view, and never when the user asked for reduced motion.
  const glide = (same) => (same && !root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant');

  function apply(r, o) {
    const same = cur === r.view;
    if (!same) {
      if (cur) { scrollAt[cur] = root.scrollY; fire(hidden, cur); }
      VIEWS.forEach((v) => { viewEl(v).hidden = v !== r.view; });
      cur = r.view; markTabs();
      fire(shown, cur); // lets a view render before its scroll position is restored
    }
    const target = r.section && document.getElementById(r.section);
    if (target) target.scrollIntoView({ block: 'start', behavior: glide(same) });
    else if (o.top) root.scrollTo({ top: 0, behavior: glide(same) });
    else if (!same && !o.initial) root.scrollTo({ top: scrollAt[cur] || 0, behavior: 'instant' });
    if (!o.initial && o.focus !== false) focusHeading(target || viewEl(cur));
  }

  function go(name, o) {
    o = o || {};
    const r = route(name); if (!r) return false;
    if (location.hash.slice(1) !== name) history[o.replace ? 'replaceState' : 'pushState'](null, '', '#' + name);
    apply(r, o);
    return true;
  }

  // Links to a route anywhere in the page switch view; the tab of the view you are on scrolls to its top.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (id === 'main') { e.preventDefault(); focusHeading(viewEl(cur)); return; }
    if (!ROUTES[id]) return;
    e.preventDefault();
    go(id, { top: a.hasAttribute('data-view') && ROUTES[id] === cur });
  });
  // Back, Forward and edited addresses.
  addEventListener('hashchange', () => { const r = fromHash(); if (r) apply(r, {}); });

  root.FluteNav = {
    go, views: VIEWS.slice(), current: () => cur,
    onShow(v, fn) { (shown[v] = shown[v] || []).push(fn); if (cur === v) fn(v); },
    onHide(v, fn) { (hidden[v] = hidden[v] || []).push(fn); }
  };
  apply(fromHash() || route('home'), { initial: true });
})(window);
