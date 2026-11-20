export const PROBE_TIMEOUT = 5000;
export const RETRY_DELAY = 3000; // between probes while the server looks unreachable
export const IDLE_DELAY = 10000; // between probes while HTTP is fine
export const FAILURES_BEFORE_UNREACHABLE = 2;

// Resolves true if the HTTP server answered, false if it is unreachable:
// a network error, a timeout, or a 502-504 from a proxy in front of it.
export const probeServer = (url = `${window.location.pathname}${window.location.search}`) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

  return fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal }).then(
    (res) => {
      clearTimeout(timer);
      return !(res.status >= 502 && res.status <= 504);
    },
    () => {
      clearTimeout(timer);
      return false;
    }
  );
};

// Probes one request at a time. Calls onUnreachable once, after consecutive failures,
// then stops. Returns a function that cancels everything.
export const watchServer = ({ probe = probeServer, onUnreachable }) => {
  let timer = null;
  let failures = 0;
  let stopped = false;

  const tick = () => {
    probe().then((reachable) => {
      if (stopped) {
        return;
      }
      failures = reachable ? 0 : failures + 1;
      if (failures >= FAILURES_BEFORE_UNREACHABLE) {
        stopped = true;
        onUnreachable();
        return;
      }
      timer = setTimeout(tick, reachable ? IDLE_DELAY : RETRY_DELAY);
    });
  };

  timer = setTimeout(tick, RETRY_DELAY);

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
};
