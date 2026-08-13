const CACHE_NAME = 'taipei-zoo-guide-v6';
const basePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBase = (path) => `${basePath}${path.startsWith('/') ? path : `/${path}`}` || '/';
const APP_SHELL = [
  withBase('/'),
  withBase('/index.html'),
  withBase('/manifest.webmanifest'),
  withBase('/data/zoo-guide-summary.json'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  const cacheResponse = (response) => {
    if (!response || response.status !== 200) return response;
    const clone = response.clone();
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)));
    return response;
  };
  const networkFirst = () => fetch(event.request).then(cacheResponse).catch(() => caches.match(event.request));
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst().then((response) => response || caches.match(withBase('/'))));
    return;
  }
  if (requestUrl.pathname.includes('/data/')) {
    event.respondWith(networkFirst());
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then(cacheResponse)));
});
