/* eslint-env jest */
import {
  IDLE_DELAY,
  PROBE_TIMEOUT,
  RETRY_DELAY,
  probeServer,
  watchServer,
} from '../server-watch';

// Let pending promise callbacks run (fake timers do not flush the microtask queue)
const tick = () => [1, 2, 3, 4, 5].reduce((p) => p.then(() => undefined), Promise.resolve());

describe('watchServer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports unreachable after two consecutive failed probes, then stops', async () => {
    const probe = jest.fn(() => Promise.resolve(false));
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });

    jest.advanceTimersByTime(RETRY_DELAY);
    await tick();
    expect(onUnreachable).not.toHaveBeenCalled();

    jest.advanceTimersByTime(RETRY_DELAY);
    await tick();
    expect(onUnreachable).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60000);
    expect(probe).toHaveBeenCalledTimes(2);
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

  it('resets the failure count after a successful probe', async () => {
    const probe = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    const onUnreachable = jest.fn();
    watchServer({ probe, onUnreachable });

    jest.advanceTimersByTime(RETRY_DELAY); // probe 1: down
    await tick();
    jest.advanceTimersByTime(RETRY_DELAY); // probe 2: up, count resets
    await tick();
    jest.advanceTimersByTime(IDLE_DELAY); // probe 3: down
    await tick();
    expect(onUnreachable).not.toHaveBeenCalled();

    jest.advanceTimersByTime(RETRY_DELAY); // probe 4: down again
    await tick();
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
