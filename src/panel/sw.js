/**
 * So that a panel with no server still opens.
 *
 * Installed on a phone, the pendant is a whole application as far as the
 * operating system is concerned: tapping it while the garage PC is off gives
 * the browser's own offline page inside the app frame — no panel, no state
 * chip, nothing to read. The panel already knows how to say "no server"; it
 * just never got the chance to load and say it.
 *
 * **Network first, cache as the fallback.** Not the other way round, and not
 * a precache list:
 *
 * - A precache list has to name the bundle, and the bundle's name carries a
 *   content hash in production. Keeping the two in step needs a build step
 *   that rewrites this file, which is a moving part for no gain here: what
 *   matters is that the shell is *available*, not that it is instant.
 *
 * - Cache first would mean the watcher's newest bundle losing to yesterday's
 *   copy, which is the classic way a service worker turns into an afternoon
 *   of "why is my change not showing". Network first has the same behaviour
 *   as no service worker at all whenever the server is up, which is what
 *   makes it safe to run in development too — and running it in development
 *   is what makes it something anyone ever tests.
 *
 * The cache warms on the first successful load. Offline before that shows the
 * browser's page, and there is no honest way around it: nothing can serve a
 * file it has never been given.
 */

const CACHE = 'panel-shell-v1';

/**
 * What is worth keeping, and what must never be kept.
 *
 * `/api/` and `/socket.io/` are the machine talking. A cached controller
 * state is a panel showing where the tool *was*, which on a screen next to a
 * spindle is worse than showing nothing — so they are not handled here at
 * all. They fail, the panel notices, and it says so in its own words.
 */
const isShell = (url) => (
  url.origin === self.location.origin &&
  url.pathname.startsWith('/panel/') &&
  !url.pathname.startsWith('/panel/api/')
);

self.addEventListener('install', (event) => {
  // The shell itself, so that the very first offline open has something even
  // if the page was closed before any asset finished. Everything else arrives
  // as it is fetched.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/panel/', '/panel/index.html']))
      // A failed precache must not fail the install — the worker is still
      // useful for everything it caches later, and a server that is already
      // down at install time is exactly when it is needed most.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET. A POST is `/api/signin` or a command, and neither has a
  // meaningful cached answer.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const navigating = request.mode === 'navigate';

  if (!navigating && !isShell(url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only a real answer is worth keeping. A 404 cached is a 404 served
        // for as long as the cache lives.
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }

        /*
         * A navigation to any path under the scope is answered with the
         * shell.
         *
         * The panel is one page that decides what to show from its own
         * state, so `/panel/?lng=pl` and `/panel/` are the same document with
         * a different query — and a cache keyed on the whole URL would miss
         * on the one that was not visited last. Falling back to the shell is
         * what makes the installed app open at all.
         */
        if (navigating) {
          const shell = await caches.match('/panel/index.html') || await caches.match('/panel/');
          if (shell) {
            return shell;
          }
        }

        // Nothing cached and nothing to serve. Said as a response rather than
        // left to throw, so the failure reaches the page as a status it can
        // act on instead of as a network error with no body.
        return new Response('', { status: 504, statusText: 'offline' });
      })
  );
});
