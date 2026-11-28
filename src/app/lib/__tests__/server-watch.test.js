/* eslint-env jest */
import ServerConnectionWatcher from '../../containers/Workspace/ServerConnectionWatcher';
import {
  IDLE_DELAY,
  RECOVERY_DELAY,
  PROBE_TIMEOUT,
  RETRY_DELAY,
  probeServer,
  readConnectionRecoveryConfig,
  watchServer,
} from '../server-watch';

// Let pending promise callbacks run (fake timers do not flush the microtask queue)
const tick = () => [1, 2, 3, 4, 5].reduce((p) => p.then(() => undefined), Promise.resolve());

// Advance fake time in probe-sized steps so each probe result is handled in order
const advance = (ms) => Array.from({ length: Math.ceil(ms / RETRY_DELAY) }).reduce(
  (previous, step, index) => previous.then(() => {
    jest.advanceTimersByTime(Math.min(RETRY_DELAY, ms - index * RETRY_DELAY));
    return tick();
  }),
  Promise.resolve()
);

describe('watchServer', () => {
  // Fake timers also fake Date.now(), so the elapsed time follows advanceTimersByTime
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports unreachable once the server has been down for 30 seconds, then stops', async () => {
    const probe = jest.fn(() => Promise.resolve(false));
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });

    // The first failure is seen at 3s, so the fixed limit is reached at 33s
    await advance(RECOVERY_DELAY * 1000);
    expect(onUnreachable).not.toHaveBeenCalled();

    await advance(3000);
    expect(onUnreachable).toHaveBeenCalledTimes(1);

    const calls = probe.mock.calls.length;
    jest.advanceTimersByTime(60000);
    expect(probe).toHaveBeenCalledTimes(calls);
  });

  it('starts the failure window when the first failed probe settles', async () => {
    let resolveProbe;
    const probe = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveProbe = resolve;
      }))
      .mockResolvedValue(false);
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });
    await advance(12000);
    expect(probe).toHaveBeenCalledTimes(1);
    resolveProbe(false);
    await tick();
    await advance(27000);
    expect(onUnreachable).not.toHaveBeenCalled();
    await advance(RETRY_DELAY);
    expect(onUnreachable).toHaveBeenCalledTimes(1);
  });

  it('never reports while HTTP stays reachable (socket-only outage)', async () => {
    const probe = jest.fn(() => Promise.resolve(true));
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });

    jest.advanceTimersByTime(RETRY_DELAY);
    await tick();
    jest.advanceTimersByTime(IDLE_DELAY);
    await tick();
    jest.advanceTimersByTime(IDLE_DELAY);
    await tick();

    expect(probe).toHaveBeenCalledTimes(3);
    expect(onUnreachable).not.toHaveBeenCalled();
  });

  it('restarts the clock after a successful probe', async () => {
    const probe = jest.fn()
      .mockResolvedValueOnce(false) // 3s: down, the clock starts
      .mockResolvedValueOnce(false) // 6s: still down
      .mockResolvedValueOnce(true) // 9s: back, the clock resets
      .mockResolvedValueOnce(false) // 19s: down again, a new clock starts
      .mockResolvedValue(false); // continuous failures after the reset
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });

    await advance(9000);
    jest.advanceTimersByTime(IDLE_DELAY);
    await tick();
    jest.advanceTimersByTime(RETRY_DELAY);
    await tick();

    expect(probe).toHaveBeenCalledTimes(5);
    expect(onUnreachable).not.toHaveBeenCalled();
    await advance(24000); // 46s: the second failure window is still under 30 seconds
    expect(onUnreachable).not.toHaveBeenCalled();
    await advance(RETRY_DELAY); // 49s: 30 seconds after the new first failure
    expect(onUnreachable).toHaveBeenCalledTimes(1);
  });

  it('stops probing when cancelled', () => {
    const probe = jest.fn(() => Promise.resolve(false));
    const stop = watchServer({ probe, onUnreachable: jest.fn() });

    stop();
    jest.advanceTimersByTime(60000);

    expect(probe).not.toHaveBeenCalled();
  });

  it('ignores a probe result that arrives after it was cancelled', async () => {
    let resolveProbe;
    const probe = jest.fn(() => new Promise((resolve) => {
      resolveProbe = resolve;
    }));
    const onUnreachable = jest.fn();
    const stop = watchServer({ probe, onUnreachable });

    jest.advanceTimersByTime(RETRY_DELAY); // probe in flight
    stop();
    resolveProbe(false);
    await tick();
    jest.advanceTimersByTime(60000);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(onUnreachable).not.toHaveBeenCalled();
  });
});

const documentWithConfig = (config) => ({
  getElementById: jest.fn(() => (config === null ? null : { textContent: config })),
});

describe('readConnectionRecoveryConfig', () => {
  it.each([
    null,
    '',
    'invalid JSON',
    'null',
    '{}',
    '{"connectionRecovery":{"offlineFallback":false}}',
    '{"connectionRecovery":{"offlineFallback":"true"}}',
    '{"connectionRecovery":{"offlineFallback":1}}',
  ])('leaves offline fallback disabled for %s', (config) => {
    expect(readConnectionRecoveryConfig(documentWithConfig(config))).toEqual({ offlineFallback: false });
  });

  it('enables offline fallback only for a boolean true in the boot config', () => {
    const doc = documentWithConfig('{"connectionRecovery":{"offlineFallback":true}}');
    expect(readConnectionRecoveryConfig(doc)).toEqual({ offlineFallback: true });
    expect(doc.getElementById).toHaveBeenCalledWith('cncjs-config');
  });
});

describe('ServerConnectionWatcher', () => {
  const originalNavigator = global.navigator;
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
    global.document = originalDocument;
    global.window = originalWindow;
    global.fetch = originalFetch;
  });

  it.each([
    ['{"connectionRecovery":{"offlineFallback":true}}', true, true],
    ['{"connectionRecovery":{"offlineFallback":true}}', false, false],
    ['{"connectionRecovery":{"offlineFallback":false}}', true, false],
    [null, true, false],
    ['invalid', true, false],
  ])('config=%s, controlled=%s switches=%s', async (config, controlled, switches) => {
    jest.useFakeTimers();
    Object.defineProperty(global, 'navigator', {
      value: { serviceWorker: { controller: controlled ? {} : null } }, configurable: true,
    });
    global.document = documentWithConfig(config);
    global.window = { location: { pathname: '/', search: '', reload: jest.fn() } };
    global.fetch = jest.fn().mockResolvedValue({ status: 503 });
    const watcher = new ServerConnectionWatcher();
    watcher.componentDidMount();
    await advance(RECOVERY_DELAY * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();
    await advance(RETRY_DELAY);
    expect(window.location.reload).toHaveBeenCalledTimes(switches ? 1 : 0);
    if (switches) {
      expect(window.location.reload).toHaveBeenCalledWith(false);
    } else {
      expect(fetch).not.toHaveBeenCalled();
    }
    watcher.componentWillUnmount();
  });

  it('does not reload when unmounted during the final failed probe', async () => {
    jest.useFakeTimers();
    Object.defineProperty(global, 'navigator', {
      value: { serviceWorker: { controller: {} } }, configurable: true,
    });
    global.document = documentWithConfig('{"connectionRecovery":{"offlineFallback":true}}');
    global.window = { location: { pathname: '/', search: '', reload: jest.fn() } };
    global.fetch = jest.fn().mockResolvedValue({ status: 503 });

    const watcher = new ServerConnectionWatcher();
    watcher.componentDidMount();
    await advance(RECOVERY_DELAY * 1000);

    let completeProbe;
    global.fetch.mockImplementationOnce(() => new Promise((resolve) => {
      completeProbe = resolve;
    }));
    await advance(RETRY_DELAY);

    watcher.componentWillUnmount();
    completeProbe({ status: 503 });
    await tick();

    expect(window.location.reload).not.toHaveBeenCalled();
  });
});

describe('probeServer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it.each([
    [200, true],
    [403, true],
    [404, true],
    [502, false],
    [503, false],
    [504, false],
  ])('treats HTTP %i as reachable=%s', async (status, expected) => {
    global.fetch = jest.fn(() => Promise.resolve({ status }));
    expect(await probeServer('/')).toBe(expected);
  });

  it('sends a HEAD request without using the cache', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ status: 200 }));
    await probeServer('/x');
    expect(global.fetch.mock.calls[0][0]).toBe('/x');
    expect(global.fetch.mock.calls[0][1].method).toBe('HEAD');
    expect(global.fetch.mock.calls[0][1].cache).toBe('no-store');
  });

  it('treats a network error as unreachable', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('network')));
    expect(await probeServer('/')).toBe(false);
  });

  it('aborts a stalled probe after the timeout and reports unreachable', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));

    const result = probeServer('/');
    jest.advanceTimersByTime(PROBE_TIMEOUT);

    expect(await result).toBe(false);
  });
});
