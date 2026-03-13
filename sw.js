// STARMILK Service Worker — network-first with offline fallback
// Bump CACHE_VERSION any time you deploy to force old caches out
const CACHE_VERSION = 'starmilk-v6';

const SHELL_ASSETS = [
  '/starmilk-music/',
  '/starmilk-music/index.html',
  '/starmilk-music/visualizer.html',
  '/starmilk-music/starmilk-radio.js',
  '/starmilk-music/starmilk-tracks.json',
  '/starmilk-music/mood-ring.js',
  '/starmilk-music/parking-lot.js',
  '/starmilk-music/orchard.js',
  '/starmilk-music/honey-drip.js',
  '/starmilk-music/the-clearing.js',
  '/starmilk-music/the-river.js',
  '/starmilk-music/cosmic-game.js',
  '/starmilk-music/brick-breaker-game.js',
  '/starmilk-music/worm-game.js',
  '/starmilk-music/star-wizard.jpg',
  '/starmilk-music/manifest.json'
];

// ── Install: precache shell assets for offline use
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: delete every old cache version
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_VERSION)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: NETWORK-FIRST for everything
//    Try the network → cache the fresh response → serve it.
//    If offline, fall back to the last cached copy.
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Skip non-GET requests and cross-origin SoundCloud embeds
  if (request.method !== 'GET') return;
  if (request.url.includes('soundcloud.com')) return;
  if (request.url.includes('w.soundcloud.com')) return;

  e.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Only cache same-origin, successful responses
        if (
          networkResponse.ok &&
          request.url.startsWith(self.location.origin)
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(request);
      })
  );
});
