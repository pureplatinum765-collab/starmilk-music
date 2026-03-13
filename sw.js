// Self-destructing service worker — unregisters itself and clears all caches
// This replaces the old caching worker that was causing stale content issues

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(names =>
        Promise.all(names.map(n => caches.delete(n)))
      ),
      self.registration.unregister()
    ])
  );
});
