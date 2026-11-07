/* Service worker: makes the site work offline.
   Network-first, so a new deploy shows up as soon as you are online; the cache is the offline fallback.
   Bump VERSION to drop old caches after a big change. */
const VERSION = 'bansuri-v7';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/styles.css', 'assets/app.js', 'assets/nav.js', 'assets/audio.js', 'assets/transport.js', 'assets/demo.js', 'assets/practice-demos.js', 'assets/ragas.js', 'assets/progress.js', 'assets/tuner.js',
  // one script and stylesheet per view (each worked on separately)
  'assets/home.js', 'assets/home.css',
  'assets/practice-cards.js', 'assets/practice-cards.css',
  'assets/alankar-data.js', 'assets/alankar.js', 'assets/alankar.css',
  'assets/favicon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
