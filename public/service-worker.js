const CACHE_NAME = 'taipei-zoo-guide-v3';
const basePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBase = (path) => `${basePath}${path.startsWith('/') ? path : `/${path}`}` || '/';
const APP_SHELL = [
  withBase('/'),
  withBase('/index.html'),
  withBase('/manifest.webmanifest'),
  withBase('/data/zoo-animals.json'),
  withBase('/data/zoo-animal-summary.json'),
  withBase('/data/zoo-plants.json'),
  withBase('/data/zoo-plant-species.json'),
  withBase('/data/zoo-plant-summary.json'),
  withBase('/data/zoo-exhibit-areas.json'),
  withBase('/data/zoo-events.json'),
  withBase('/data/zoo-guide-summary.json'),
  withBase('/data/conversion-report.json'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    }),
  );
});
