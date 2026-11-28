/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */

// Everything this worker owns is namespaced by its registration scope, so it never
// touches caches belonging to other apps on the same origin, or to another CNCjs
// instance hosted under a different path.
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `cncjs-offline:${SCOPE}:`;
const CACHE = `${CACHE_PREFIX}v1`;
const APP_URL = new URL('./', SCOPE);
const OFFLINE_URL = new URL('./offline.html', SCOPE).href;
const OFFLINE_IMG_URL = new URL('./images/logo-badge-256x256.png', SCOPE).href;
const FETCH_TIMEOUT = 5000;

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

// Read from this worker's own cache, not the origin-wide caches.match()
const fromOwnCache = (url) => caches.open(CACHE).then((cache) => cache.match(url));

// Only the app entry page falls back to the offline page: GET navigations to the
// scope root. Form posts (e.g. G-code download), API calls and other navigations
// keep their normal network behavior.
const isAppShellNavigation = (request) => {
  if (request.method !== 'GET' || request.mode !== 'navigate') {
    return false;
  }
  const url = new URL(request.url);
  return url.origin === APP_URL.origin && url.pathname === APP_URL.pathname;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, OFFLINE_IMG_URL].map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (isAppShellNavigation(request)) {
    event.respondWith(
      withTimeout(fetch(request), FETCH_TIMEOUT)
        .then((res) => ((res.status >= 502 && res.status <= 504) ? fromOwnCache(OFFLINE_URL) : res))
        .catch(() => fromOwnCache(OFFLINE_URL))
    );
    return;
  }

  if (request.url === OFFLINE_IMG_URL) {
    // Cache-first for the offline page's logo
    event.respondWith(fromOwnCache(OFFLINE_IMG_URL).then((res) => res || fetch(request)));
  }
});
