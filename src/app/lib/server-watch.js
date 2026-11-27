export const PROBE_TIMEOUT = 5000;
export const RETRY_DELAY = 3000; // between probes while the server looks unreachable
export const IDLE_DELAY = 10000; // between probes while HTTP is fine

// Fixed seconds of continuous HTTP failure before switching to the offline page.
export const RECOVERY_DELAY = 30;

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

// Only the explicit offline action opts into switching away from the workspace.
export const readConnectionRecoveryConfig = (root = document.documentElement) => ({
  action: root.getAttribute('data-connection-recovery-action') === 'offline' ? 'offline' : 'reconnect',
});

// Probes one request at a time. Calls onUnreachable once, after the server has been
// unreachable for 30 seconds without a single successful probe in between, then stops.
// The check runs when a probe settles, so the actual wait can be a few seconds longer.
// Returns a function that cancels everything.
export const watchServer = ({
  probe = probeServer,
  onUnreachable,
  now = () => Date.now(),
}) => {
  const limit = RECOVERY_DELAY * 1000;
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
