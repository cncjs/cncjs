export const PROBE_TIMEOUT = 5000;
export const RETRY_DELAY = 3000; // between probes while the server looks unreachable
export const IDLE_DELAY = 10000; // between probes while HTTP is fine

// Seconds of continuous failure before giving up on the server (.cncrc: offlineFailover.timeout)
export const DEFAULT_FAILOVER_TIMEOUT = 30;
export const MIN_FAILOVER_TIMEOUT = 5;
export const MAX_FAILOVER_TIMEOUT = 3600;

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

// Reads the offline failover setting that the server renders into the page from .cncrc.
// It is off unless explicitly enabled. The timeout is in seconds and always lands in a safe range.
export const readFailoverConfig = (root = document.documentElement) => {
  const enabled = root.getAttribute('data-offline-failover') === 'true';
  const seconds = Number(root.getAttribute('data-offline-failover-timeout'));
  const timeout = Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_FAILOVER_TIMEOUT;

  return {
    enabled,
    timeout: Math.min(Math.max(timeout, MIN_FAILOVER_TIMEOUT), MAX_FAILOVER_TIMEOUT),
  };
};

// Probes one request at a time. Calls onUnreachable once, after the server has been
// unreachable for `timeout` seconds without a single successful probe in between, then stops.
// The check runs when a probe settles, so the actual wait can be a few seconds longer.
// Returns a function that cancels everything.
export const watchServer = ({
  probe = probeServer,
  onUnreachable,
  timeout = DEFAULT_FAILOVER_TIMEOUT,
  now = () => Date.now(),
}) => {
  const limit = timeout * 1000;
  let timer = null;
  let unreachableSince = null;
  let stopped = false;

  const tick = () => {
    probe().then((reachable) => {
      if (stopped) {
        return;
      }
      if (reachable) {
        unreachableSince = null;
      } else if (unreachableSince === null) {
        unreachableSince = now();
      }
      if (unreachableSince !== null && now() - unreachableSince >= limit) {
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
