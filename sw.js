const CACHE_NAME = 'collage-maker-v20260714-1';
const ASSETS = [
  './',
  './index.html',
  './custom.html',
  './css/styles.css?v=20260714-3',
  './css/custom.css?v=20260714-1',
  './js/app.js?v=20260714-3',
  './js/collageRenderer.js?v=20260714-3',
  './js/templateManager.js?v=20260714-3',
  './js/custom.js?v=20260714-1',
  './manifest.webmanifest?v=20260714-1'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(networkRes => {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return networkRes;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
