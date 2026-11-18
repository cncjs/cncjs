/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

// Adjust if the tests live somewhere else in the repo
const SW_PATH = path.resolve(__dirname, '../sw.js');
const SW_SOURCE = fs.readFileSync(SW_PATH, 'utf8');

const APP = 'https://example.test/';
const nav = (url, method = 'GET') => ({ url, method, mode: 'navigate' });

const createCaches = (names = []) => {
  const store = new Map(names.map((name) => [name, new Map()]));
  return {
    store,
    keys: () => Promise.resolve([...store.keys()]),
    delete: (name) => Promise.resolve(store.delete(name)),
    open: (name) => {
      if (!store.has(name)) {
        store.set(name, new Map());
      }
      const entries = store.get(name);
      return Promise.resolve({
        addAll: (requests) => {
          requests.forEach((r) => entries.set(r.url, { status: 200, url: r.url }));
          return Promise.resolve();
        },
        match: (url) => Promise.resolve(entries.get(url)),
      });
    },
  };
};

// Runs sw.js in a sandbox with fakes for the service worker globals
const createWorker = ({
  scope = APP,
  existingCaches = [],
  fetchImpl = () => Promise.resolve({ status: 200 }),
} = {}) => {
  const handlers = {};
  const caches = createCaches(existingCaches);
  const self = {
    registration: { scope },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
    addEventListener: (type, fn) => {
 handlers[type] = fn;
},
  };
  vm.runInNewContext(SW_SOURCE, {
    self,
    caches,
    URL,
    setTimeout,
    clearTimeout,
    fetch: (...args) => fetchImpl(...args),
    Request: class {
 constructor(url, init) {
 this.url = url; Object.assign(this, init);
}
},
  });
  return {
    caches,
    lifecycle: async (type) => {
      let pending;
      handlers[type]({ waitUntil: (p) => {
 pending = p;
} });
      await pending;
    },
    // returns the promise given to respondWith, or undefined if the worker declined
    fetchEvent: (request) => {
      let response;
      handlers.fetch({ request,
respondWith: (p) => {
 response = p;
} });
      return response;
    },
  };
};

describe('sw.js', () => {
  afterEach(() => jest.useRealTimers());

  describe('cache ownership', () => {
    it('removes only outdated caches of its own scope', async () => {
      const own = `cncjs-offline:${APP}:`;
      const other = 'cncjs-offline:https://example.test/other/:v1';
      const sw = createWorker({ existingCaches: ['other-app-v1', other, `${own}v0`] });
      await sw.lifecycle('install');
      await sw.lifecycle('activate');
      const keys = [...sw.caches.store.keys()];
      expect(keys).toEqual(expect.arrayContaining(['other-app-v1', other, `${own}v1`]));
      expect(keys).not.toContain(`${own}v0`);
    });

    it('serves the offline page from its own cache, not from another cache', async () => {
      const sw = createWorker({
        existingCaches: ['other-app-v1'],
        fetchImpl: () => Promise.reject(new TypeError('network')),
      });
      sw.caches.store.get('other-app-v1').set(`${APP}offline.html`, { from: 'other-app' });
      await sw.lifecycle('install');
      const res = await sw.fetchEvent(nav(APP));
      expect(res.from).toBeUndefined();
      expect(res.url).toBe(`${APP}offline.html`);
    });

    it('precaches the offline page and logo before activating', async () => {
      const sw = createWorker();
      await sw.lifecycle('install');
      const own = sw.caches.store.get(`cncjs-offline:${APP}:v1`);
      expect([...own.keys()]).toEqual([
        `${APP}offline.html`,
        `${APP}images/logo-badge-256x256.png`,
      ]);
    });
  });

  describe('navigation fallback', () => {
    it('serves the offline page when the app-root navigation fails', async () => {
      const sw = createWorker({ fetchImpl: () => Promise.reject(new TypeError('network')) });
      await sw.lifecycle('install');
      expect((await sw.fetchEvent(nav(APP))).url).toBe(`${APP}offline.html`);
    });

    it.each([502, 503, 504])('serves the offline page for a %i response', async (status) => {
      const sw = createWorker({ fetchImpl: () => Promise.resolve({ status }) });
      await sw.lifecycle('install');
      expect((await sw.fetchEvent(nav(APP))).url).toBe(`${APP}offline.html`);
    });

    it('passes through healthy responses', async () => {
      const ok = { status: 200, body: 'app' };
      const sw = createWorker({ fetchImpl: () => Promise.resolve(ok) });
      await sw.lifecycle('install');
      expect(await sw.fetchEvent(nav(APP))).toBe(ok);
    });

    it('falls back when the request never settles', async () => {
      jest.useFakeTimers();
      const sw = createWorker({ fetchImpl: () => new Promise(() => {}) });
      await sw.lifecycle('install');
      const pending = sw.fetchEvent(nav(APP));
      jest.advanceTimersByTime(5000);
      expect((await pending).url).toBe(`${APP}offline.html`);
    });

    it('does not handle the failed G-code download POST', async () => {
      const sw = createWorker({ fetchImpl: () => Promise.reject(new TypeError('network')) });
      await sw.lifecycle('install');
      expect(sw.fetchEvent(nav(`${APP}api/gcode/download`, 'POST'))).toBeUndefined();
    });

    it('does not handle API navigations or non-navigation requests', async () => {
      const sw = createWorker();
      await sw.lifecycle('install');
      expect(sw.fetchEvent(nav(`${APP}api/gcode/download`))).toBeUndefined();
      expect(sw.fetchEvent({ url: `${APP}socket.io/?EIO=4`, method: 'GET', mode: 'cors' })).toBeUndefined();
    });

    it('is anchored to the registration scope under a prefixed deployment', async () => {
      const prefixed = 'https://example.test/cnc/';
      const sw = createWorker({
        scope: prefixed,
        fetchImpl: () => Promise.reject(new TypeError('network')),
      });
      await sw.lifecycle('install');
      expect((await sw.fetchEvent(nav(prefixed))).url).toBe(`${prefixed}offline.html`);
      expect(sw.fetchEvent(nav('https://example.test/'))).toBeUndefined();
    });
  });

  describe('logo', () => {
    it('is served from the cache when the network is down', async () => {
      const sw = createWorker({ fetchImpl: () => Promise.reject(new TypeError('network')) });
      await sw.lifecycle('install');
      const logo = `${APP}images/logo-badge-256x256.png`;
      const res = await sw.fetchEvent({ url: logo, method: 'GET', mode: 'no-cors' });
      expect(res.url).toBe(logo);
    });
  });
});
