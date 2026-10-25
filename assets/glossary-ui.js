/* Underlines glossary terms in running text (first use per paragraph) and shows a tooltip on hover, focus or tap. */
(function (root) {
  'use strict';
  const entries = root.GLOSSARY.entries;
  const words = [].concat(...entries.map((e) => [e.term, ...e.alias])).sort((a, b) => b.length - a.length);
  const re = new RegExp('(?<![\\w-])(' + words.join('|') + ')(?![\\w-])', 'i');
  const SELECTOR = 'p.lead, .hero-intro p, .card p, .routine li p, .stage li, .demo-intro, .demo-note, .cues li';
  const SKIP = 'button, a, select, option, textarea, input, label, svg, h1, h2, h3, .term, .tok, .nline, .notation';

  function enhance(container) {
    if (container.dataset.gl) return;
    container.dataset.gl = '1';
    const seen = new Set();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node;
      for (let guard = 0; guard < 20 && text; guard++) {
        const m = re.exec(text.nodeValue);
        if (!m) break;
        const entry = root.GLOSSARY.lookup(m[1]);
        if (!entry || seen.has(entry.term)) {
          // skip past this match and keep looking in the rest of the text
          if (m.index + m[0].length >= text.nodeValue.length) break;
          text = text.splitText(m.index + m[0].length);
          continue;
        }
        seen.add(entry.term);
        const after = text.splitText(m.index + m[0].length);
        const hit = text.splitText(m.index);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'term'; b.dataset.term = entry.term; b.textContent = hit.nodeValue;
        hit.replaceWith(b);
        text = after;
      }
    });
  }
  function scan(rootEl) {
    if (rootEl.nodeType !== 1) return;
    if (rootEl.matches(SELECTOR)) enhance(rootEl);
    rootEl.querySelectorAll(SELECTOR).forEach(enhance);
  }

  // Tooltip (a manual popover so it also appears above open dialogs)
  const tip = document.createElement('div');
  tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.setAttribute('popover', 'manual'); tip.hidden = true;
  document.body.appendChild(tip);
  let current = null;
  function show(el) {
    const e = root.GLOSSARY.lookup(el.dataset.term); if (!e) return;
    current = el;
    tip.innerHTML = `<b>${e.term}</b> ${e.def}`;
    tip.hidden = false;
    if (tip.showPopover) { try { tip.showPopover(); } catch (x) { /* already open */ } }
    el.setAttribute('aria-describedby', 'tip');
    const r = el.getBoundingClientRect(), w = Math.min(300, innerWidth - 16);
    tip.style.width = w + 'px';
    const th = tip.offsetHeight;
    const top = r.top - th - 8 > 8 ? r.top - th - 8 : r.bottom + 8;
    tip.style.top = Math.max(8, top) + 'px';
    tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
  }
  function hide() {
    if (!current) return;
    current.removeAttribute('aria-describedby'); current = null;
    if (tip.hidePopover) { try { tip.hidePopover(); } catch (x) { /* not open */ } }
    tip.hidden = true;
  }
  const termOf = (t) => (t.closest ? t.closest('.term') : null);
  document.addEventListener('mouseover', (e) => { const t = termOf(e.target); if (t && t !== current) show(t); });
  document.addEventListener('mouseout', (e) => { if (termOf(e.target) && !termOf(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', (e) => { const t = termOf(e.target); if (t) show(t); });
  document.addEventListener('focusout', (e) => { if (termOf(e.target)) hide(); });
  document.addEventListener('click', (e) => { const t = termOf(e.target); if (t) { current === t && e.detail === 0 ? hide() : show(t); } else hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, { passive: true });

  function init() {
    // Glossary section
    const dl = document.getElementById('glossary-list');
    if (dl) {
      const all = entries.map((e) => [e.term, e.def]).concat(root.GLOSSARY.extra).sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
      dl.innerHTML = all.map(([t, d]) => `<div><dt>${t[0].toUpperCase() + t.slice(1)}</dt><dd>${d}</dd></div>`).join('');
    }
    scan(document.body);
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
