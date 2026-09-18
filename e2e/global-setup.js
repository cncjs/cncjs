/**
 * Wait for the server to actually serve before any spec navigates to it.
 *
 * Without this, starting the suite too soon after `yarn dev` turns a cold
 * webpack compile into a spec failure — the first navigation blows its budget
 * while every later one takes three seconds. That reads as a flaky test rather
 * than as "the server was not up yet", which is a bad trade: raising timeouts
 * to cover it makes genuine hangs slow to surface.
 *
 * Unreachable is a warning, not an error. The Electron tier has specs that do
 * not need an external server at all, and failing here would take those down
 * with it. Specs that do need one will fail on their own terms, saying so.
 */

const BASE_URL = process.env.CNCJS_URL || 'http://localhost:8000';
const TIMEOUT_MS = Number(process.env.CNCJS_WAIT_TIMEOUT || 180 * 1000);
const INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const reachable = async () => {
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    return res.status > 0 && res.status < 500;
  } catch (e) {
    return false;
  }
};

module.exports = async () => {
  const startedAt = Date.now();
  let waited = false;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    if (await reachable()) {
      if (waited) {
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        console.log(`[e2e] ${BASE_URL} became ready after ${seconds}s`);
      }
      return;
    }

    if (Date.now() - startedAt > TIMEOUT_MS) {
      console.warn(
        `[e2e] ${BASE_URL} did not respond within ${Math.round(TIMEOUT_MS / 1000)}s. ` +
        'Specs that need a server will fail; Electron specs that do not will still run.'
      );
      return;
    }

    waited = true;
    // eslint-disable-next-line no-await-in-loop
    await sleep(INTERVAL_MS);
  }
};
