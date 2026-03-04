// STARMILK Service Worker — lightweight cache-first for offline shell
const CACHE_NAME = 'starmilk-v1';
const SHELL_ASSETS = [
  '/starmilk-music/',
  '/starmilk-music/index.html',
  '/starmilk-music/starmilk-radio.js',
  '/starmilk-music/cosmic-game.js',
  '/starmilk-music/brick-breaker-game.js',
  '/starmilk-music/orchard.js',
  '/starmilk-music/honey-drip.js',
  '/starmilk-music/parking-lot.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-first for HTML (always get latest), cache-first for assets
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
