/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
// Minimal service worker: enables PWA install and deliberately caches nothing,
// so socket.io traffic and upgrades are unaffected.
const CACHE = 'cncjs-offline-v1';
const OFFLINE_URL = './offline.html';
const OFFLINE_IMG = './images/logo-badge-256x256.png';
const FETCH_TIMEOUT = 5000;
const PRECACHE = [OFFLINE_URL, OFFLINE_IMG];
const OFFLINE_IMG_URL = new URL(OFFLINE_IMG, self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then(
    (res) => {
      clearTimeout(timer); resolve(res);
    },
    (err) => {
      clearTimeout(timer); reject(err);
    }
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(request), FETCH_TIMEOUT)
        .then((res) => ((res.status >= 502 && res.status <= 504) ? caches.match(OFFLINE_URL) : res))
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (request.url === OFFLINE_IMG_URL) {
    // Cache-first for the offline page's logo, falling back to the network
    event.respondWith(caches.match(OFFLINE_IMG_URL).then((res) => res || fetch(request)));
  }
});
