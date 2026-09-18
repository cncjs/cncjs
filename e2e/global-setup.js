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

/**
 * Ready means "the app can actually load", not "the port answers".
 *
 * Express starts serving index.html well before webpack has finished its first
 * compile, so waiting on the server alone still let a cold start land on the
 * first spec — which then failed waiting for a widget that could not mount
 * without its bundle. So follow the page to the bundle it names and wait for
 * that to be served too.
 */
const reachable = async () => {
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    if (!(res.status > 0 && res.status < 500)) {
      return false;
    }

    const html = await res.text();
    const match = html.match(/src="([^"]*main[^"]*\.js)"/);
    if (!match) {
      // No bundle referenced yet: the shell is up but the build is not.
      return false;
    }

    const bundleUrl = new URL(match[1], BASE_URL).href;
    const bundle = await fetch(bundleUrl, { method: 'HEAD' });
    return bundle.ok;
  } catch (e) {
    return false;
  }
};

// Which tiers talk to an already-running server. The others bring their own
// (auth) or need none at all (electron), and making them sit out the timeout
// for a server they never touch turns a three-second run into a three-minute
// one.
const NEEDS_RUNNING_SERVER = ['smoke', 'hardware'];

/**
 * Which projects this run selected, or null when that cannot be told.
 *
 * Playwright hands globalSetup every configured project rather than the
 * selection, so the only source is the command line. Anything unrecognised
 * returns null and the wait happens as before — the cost of guessing wrong in
 * that direction is a slow run, not a broken one.
 */
const selectedProjects = () => {
  const argv = process.argv.slice(2);
  const names = [];

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg.startsWith('--project=')) {
      names.push(arg.slice('--project='.length));
    } else if (arg === '--project' && argv[i + 1]) {
      names.push(argv[++i]);
    }
  }

  return names.length > 0 ? names : null;
};

module.exports = async () => {
  const selected = selectedProjects();
  if (selected && !selected.some(name => NEEDS_RUNNING_SERVER.includes(name))) {
    return;
  }

  const startedAt = Date.now();
  let waited = false;

  for (;;) {
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
    await sleep(INTERVAL_MS);
  }
};
