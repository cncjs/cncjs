/* eslint-env jest */
import {
  DEFAULT_FAILOVER_TIMEOUT,
  IDLE_DELAY,
  MAX_FAILOVER_TIMEOUT,
  MIN_FAILOVER_TIMEOUT,
  PROBE_TIMEOUT,
  RETRY_DELAY,
  probeServer,
  readFailoverConfig,
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

  it('reports unreachable once the server has been down for the timeout, then stops', async () => {
    const probe = jest.fn(() => Promise.resolve(false));
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable, timeout: 10 });

    // The first failure is seen at 3s, so the 10s limit is reached by the probe at 15s
    await advance(12000);
    expect(onUnreachable).not.toHaveBeenCalled();

    await advance(3000);
    expect(onUnreachable).toHaveBeenCalledTimes(1);

    const calls = probe.mock.calls.length;
    jest.advanceTimersByTime(60000);
    expect(probe).toHaveBeenCalledTimes(calls);
  });

  it('never reports while HTTP stays reachable (socket-only outage)', async () => {
    const probe = jest.fn(() => Promise.resolve(true));
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable, timeout: 10 });

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
      .mockResolvedValueOnce(false); // 22s: down for 3s only
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable, timeout: 10 });

    await advance(9000);
    jest.advanceTimersByTime(IDLE_DELAY);
    await tick();
    jest.advanceTimersByTime(RETRY_DELAY);
    await tick();

    expect(probe).toHaveBeenCalledTimes(5);
    expect(onUnreachable).not.toHaveBeenCalled();
  });

  it('uses the default timeout when none is given', async () => {
    const onUnreachable = jest.fn();
    watchServer({ probe: () => Promise.resolve(false), onUnreachable });

    // The first failure is seen at 3s, so the default limit is reached by the probe at 33s
    await advance(DEFAULT_FAILOVER_TIMEOUT * 1000);
    expect(onUnreachable).not.toHaveBeenCalled();

    await advance(RETRY_DELAY);
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
    const stop = watchServer({ probe, onUnreachable, timeout: MIN_FAILOVER_TIMEOUT });

    jest.advanceTimersByTime(RETRY_DELAY); // probe in flight
    stop();
    resolveProbe(false);
    await tick();
    jest.advanceTimersByTime(60000);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(onUnreachable).not.toHaveBeenCalled();
  });
});

describe('readFailoverConfig', () => {
  const ENABLED = { 'data-offline-failover': 'true' };
  const page = (attributes = {}) => ({
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
  });
  const timeoutOf = (value) => readFailoverConfig(page({
    ...ENABLED,
    'data-offline-failover-timeout': value,
  })).timeout;

  it('is off when the server did not enable it', () => {
    expect(readFailoverConfig(page()).enabled).toBe(false);
  });

  it('is off unless the attribute is exactly "true"', () => {
    expect(readFailoverConfig(page({ 'data-offline-failover': 'false' })).enabled).toBe(false);
    expect(readFailoverConfig(page({ 'data-offline-failover': '1' })).enabled).toBe(false);
  });

  it('reads the timeout in seconds', () => {
    expect(readFailoverConfig(page({
      ...ENABLED,
      'data-offline-failover-timeout': '45',
    }))).toEqual({ enabled: true, timeout: 45 });
  });

  it('falls back to the default when the timeout is missing or invalid', () => {
    expect(readFailoverConfig(page(ENABLED)).timeout).toBe(DEFAULT_FAILOVER_TIMEOUT);
    expect(timeoutOf('soon')).toBe(DEFAULT_FAILOVER_TIMEOUT);
    expect(timeoutOf('-3')).toBe(DEFAULT_FAILOVER_TIMEOUT);
  });

  it('clamps the timeout to a safe range', () => {
    expect(timeoutOf('1')).toBe(MIN_FAILOVER_TIMEOUT);
    expect(timeoutOf('999999')).toBe(MAX_FAILOVER_TIMEOUT);
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
