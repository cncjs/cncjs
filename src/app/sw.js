/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
// Minimal service worker: enables PWA install and deliberately caches nothing,
// so socket.io traffic and upgrades are unaffected.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // network-only passthrough
