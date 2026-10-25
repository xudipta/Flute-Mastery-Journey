// Generates the app icons and the social preview image from one design.
// Usage: node tools/make-icons.js   (needs the `playwright` package and Chromium)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const holes = [215, 255, 295, 355, 395, 435];

// A bansuri on a deep-indigo tile. `pad` shrinks the artwork for maskable icons; `round` rounds the tile.
function iconSvg({ pad = 0, round = true } = {}) {
  const s = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5646e8"/><stop offset="1" stop-color="#1b1456"/></linearGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0bb62"/><stop offset="1" stop-color="#c98a3a"/></linearGradient></defs>
  <rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#g)"/>
  <g transform="translate(256 256) scale(${s}) rotate(-35) translate(-256 -256)">
    <rect x="48" y="224" width="416" height="64" rx="32" fill="url(#b)"/>
    <rect x="72" y="230" width="368" height="12" rx="6" fill="#fff" opacity=".22"/>
    <ellipse cx="125" cy="256" rx="20" ry="12" fill="#5a3410"/>
    ${holes.map((x) => `<circle cx="${x}" cy="256" r="12" fill="#5a3410"/>`).join('\n    ')}
  </g>
  <g fill="#ffd166" transform="translate(30 250)"><ellipse cx="382" cy="150" rx="22" ry="16" transform="rotate(-20 382 150)"/><rect x="396" y="62" width="9" height="92" rx="4"/><path d="M396 62 q46 12 40 54 q-14 -26 -40 -22z"/></g>
</svg>`;
}

const ogHtml = (iconDataUri) => `<!doctype html><html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:64px;padding:0 90px;box-sizing:border-box;background:linear-gradient(135deg,#2a1f8f,#0f0d24);font-family:Inter,system-ui,'Segoe UI',sans-serif;color:#f1f0ff">
  <img src="${iconDataUri}" width="300" height="300" style="border-radius:64px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
  <div>
    <div style="font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:#ffd166;font-weight:700">Indian classical bansuri</div>
    <div style="font-size:84px;font-weight:800;line-height:1.05;margin:14px 0 18px">Flute Mastery<br>Journey</div>
    <div style="font-size:32px;color:#c9c6f2;line-height:1.4">Daily riyaaz, ragas, taal<br>and finger-hole guides.</div>
  </div></body></html>`;

(async () => {
  const out = (f) => path.join(root, f);
  fs.writeFileSync(out('assets/favicon.svg'), iconSvg());
  const b = await chromium.launch();
  const shot = async (svg, size, file) => {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await p.screenshot({ path: out(file), omitBackground: true });
    await p.close();
  };
  await shot(iconSvg(), 192, 'assets/icons/icon-192.png');
  await shot(iconSvg(), 512, 'assets/icons/icon-512.png');
  await shot(iconSvg(), 180, 'assets/icons/apple-touch-icon.png');
  await shot(iconSvg({ pad: 0.1, round: false }), 512, 'assets/icons/icon-maskable-512.png');
  const uri = 'data:image/svg+xml;base64,' + Buffer.from(iconSvg()).toString('base64');
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(ogHtml(uri));
  await p.screenshot({ path: out('assets/icons/og-image.png') });
  await b.close();
})();
