/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

// Adjust if the tests live somewhere else in the repo
const OFFLINE_PATH = path.resolve(__dirname, '../offline.html');
const OFFLINE_SCRIPT = fs.readFileSync(OFFLINE_PATH, 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];

// Let pending promise callbacks run (fake timers do not flush the microtask queue)
// Let pending promise callbacks run (fake timers do not flush the microtask queue)
const tick = () => [1, 2, 3, 4, 5].reduce((p) => p.then(() => undefined), Promise.resolve());

describe('offline.html recovery polling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const run = (fetchImpl) => {
    const location = { pathname: '/', search: '?a=1', reload: jest.fn() };
    vm.runInNewContext(OFFLINE_SCRIPT, {
      location,
      fetch: fetchImpl,
      setTimeout,
      clearTimeout,
      AbortController,
    });
    return location;
  };

  it('probes the page URL, not a relative path', () => {
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: false, status: 502 }));
    run(fetchImpl);
    jest.advanceTimersByTime(3000);
    expect(fetchImpl.mock.calls[0][0]).toBe('/?a=1');
    expect(fetchImpl.mock.calls[0][1].method).toBe('HEAD');
  });

  it('keeps one probe in flight and aborts a stalled one', async () => {
    const fetchImpl = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    run(fetchImpl);
    jest.advanceTimersByTime(3000); // first probe starts
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(4999); // still pending: no second probe
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1); // aborted at 5s
    await tick();
    jest.advanceTimersByTime(3000); // next probe after the retry delay
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reloads once on a non-502-504 error such as 403, so the real response is shown', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const location = run(fetchImpl);
    jest.advanceTimersByTime(3000); // 503: still down
    await tick();
    expect(location.reload).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3000); // 403: server answered
    await tick();
    jest.advanceTimersByTime(60000);
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not reload after a network failure, and retries', async () => {
    const fetchImpl = jest.fn(() => Promise.reject(new TypeError('network')));
    const location = run(fetchImpl);
    jest.advanceTimersByTime(3000);
    await tick();
    jest.advanceTimersByTime(3000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('reloads once on the first success and stops probing', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
    const location = run(fetchImpl);
    jest.advanceTimersByTime(3000);
    await tick();
    jest.advanceTimersByTime(60000);
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
