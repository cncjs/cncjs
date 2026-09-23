const fs = require('fs');
const path = require('path');

/**
 * Refuse to start a run that cannot pass.
 *
 * A broken precondition does not fail a Playwright run quickly — it fails it
 * one case at a time, and each case spends its **whole** timeout first.
 * Measured on 2026-09-23: a server that had been killed left 25 hardware cases
 * timing out at 34 seconds each, fourteen minutes to learn one fact that
 * `GET /api/controllers` answers in a millisecond. The same night, a smoke run
 * against a stale panel bundle spent three minutes proving that a translation
 * key was missing from a file that already had it.
 *
 * So every condition here is one that makes a *class* of cases fail rather
 * than one case — the kind where the run tells you nothing you did not already
 * know, slowly. Anything that merely might fail belongs in a spec, not here.
 *
 * Each check says what is wrong and what to do about it. None of them fixes
 * anything: rebuilding a bundle or closing somebody's serial port behind their
 * back is a surprise, and a suite that quietly reshapes the machine it is
 * measuring is worse than one that refuses to start.
 */

const ROOT = path.resolve(__dirname, '..');
const PANEL_SOURCE = path.join(ROOT, 'src', 'panel');
const PANEL_BUNDLE = path.join(ROOT, 'output', 'cncjs', 'panel', 'panel.bundle.js');
const APP_OUTPUT = path.join(ROOT, 'output', 'cncjs', 'app');

/** The newest modification time anywhere under a directory, or 0. */
const newestUnder = (dir) => {
  let newest = 0;
  const walk = (at) => {
    let entries;
    try {
      entries = fs.readdirSync(at, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const { mtimeMs } = fs.statSync(full);
        newest = Math.max(newest, mtimeMs);
      }
    }
  };
  walk(dir);
  return newest;
};

/**
 * The script a page loads, followed from the page itself.
 *
 * The dev watcher writes a fixed name and a production build writes a hashed
 * one, so the only honest way to find it is to read the page and take what it
 * asks for.
 */
const bundleOf = async (baseUrl, pagePath) => {
  const res = await fetch(new URL(pagePath, baseUrl).href, { redirect: 'manual' });
  if (!(res.status > 0 && res.status < 500)) {
    return { error: `${pagePath} answered ${res.status}` };
  }

  const html = await res.text();
  const match = html.match(/src="([^"]+\.js)"/);
  if (!match) {
    return { error: `${pagePath} names no script — the shell is up but nothing is built` };
  }

  const url = new URL(match[1], baseUrl).href;
  const script = await fetch(url);
  if (!script.ok) {
    return { error: `${pagePath} asks for ${match[1]}, which answered ${script.status}` };
  }

  return { url, text: await script.text() };
};

const checks = {
  /**
   * The old application's bundle runs, rather than merely being served.
   *
   * A webpack build with a poisoned resolver cache emits a bundle that is 200
   * OK and throws `Cannot find module` on the first line it evaluates. Nothing
   * rebuilds it, so it stays that way; the page answers, the bundle answers,
   * and every spec sits on "Loading..." until it times out. It happened on
   * 2026-09-22 with a module that had existed for weeks.
   */
  async appBundleRuns(baseUrl) {
    const { error, text } = await bundleOf(baseUrl, '/');
    if (error) {
      return `the workspace is not servable: ${error}`;
    }

    /*
     * The literal form only, not webpack's own runtime helper.
     *
     * Every bundle carries `Cannot find module '" + req + "'` — the template
     * `require.resolve` throws from when a *runtime* lookup misses. Matching
     * that flags a healthy build, which this check did on its first run: it
     * reported the workspace as broken on a workspace that boots. Excluding
     * quotes and `+` from the captured path is what tells a baked-in failure
     * (`'../../../lib/toolpath/palette'`) from the template around it.
     */
    const broken = text.match(/Cannot find module '([^'"+]+)'/);
    return broken
      ? `the workspace bundle carries \`Cannot find module '${broken[1]}'\` and will not boot.\n` +
        '    Rebuild it — and only it:\n' +
        '      npx cross-env NODE_ENV=development npx webpack-cli --config webpack.config.development.js\n' +
        '    then put back what that step does not emit (it runs with output.clean):\n' +
        '      Copy-Item src/app/favicon.ico output/cncjs/app -Force\n' +
        "      foreach ($d in 'i18n','images','assets') { Copy-Item \"src/app/$d\" output/cncjs/app -Recurse -Force }"
      : null;
  },

  /**
   * The files the webpack step does not emit are present.
   *
   * `output.clean` empties `output/cncjs/app`, and `build-dev` copies these in
   * as a separate step. A server already running never notices; the *next*
   * start dies on `ENOENT ... favicon.ico` and does not come up at all, which
   * is a confusing thing to discover from a test run.
   */
  appAssetsPresent() {
    const missing = ['favicon.ico', 'i18n', 'images']
      .filter((name) => !fs.existsSync(path.join(APP_OUTPUT, name)));

    return missing.length
      ? `output/cncjs/app is missing ${missing.join(', ')} — the next server start will die on ENOENT.\n` +
        '    Copy-Item src/app/favicon.ico output/cncjs/app -Force\n' +
        "    foreach ($d in 'i18n','images','assets') { Copy-Item \"src/app/$d\" output/cncjs/app -Recurse -Force }"
      : null;
  },

  /**
   * The panel bundle is servable, and is newer than the panel's source.
   *
   * The watcher can be dead, wedged, or several gigabytes deep in its own heap
   * and still leave a readable bundle on disk — one that answers every request
   * with last hour's code. On 2026-09-23 that produced a rail reading
   * `NAV.CONNECT` while the resource file on disk had the key, and the half
   * hour that went into the wrong explanation is the reason this check exists.
   *
   * Only meaningful against the dev watcher's fixed filename. A production
   * build has no source tree to be older than.
   */
  async panelBundleFresh(baseUrl) {
    const { error } = await bundleOf(baseUrl, '/panel/');
    if (error) {
      return `the panel is not servable: ${error}`;
    }

    if (!fs.existsSync(PANEL_BUNDLE)) {
      return null;
    }

    const built = fs.statSync(PANEL_BUNDLE).mtimeMs;
    const newest = newestUnder(PANEL_SOURCE);
    if (built >= newest) {
      return null;
    }

    const behind = Math.round((newest - built) / 1000);
    return `the panel bundle is ${behind}s older than src/panel — the run would measure code that is not the code.\n` +
      '    Wait for the watcher to finish, or restart it if it has stopped compiling:\n' +
      '      npx webpack --watch --config webpack.config.panel.development.js';
  },

  /**
   * No serial port is open, for the tier whose panel cases are about not
   * having one.
   *
   * With a port open the panel says `Idle` where those cases expect
   * `Rozłączony`, and five of them fail for a reason that has nothing to do
   * with the change being tested. A hardware run that did not reach its
   * teardown is the usual way to arrive here.
   */
  async noPortOpen(baseUrl) {
    const open = await openPorts(baseUrl);
    return open.length
      ? `${open.join(', ')} is still open, so the panel's disconnected cases will see a live machine.\n` +
        '    Close it — the panel has a Connection screen now, or:\n' +
        `      CNCJS_TEST_PORT=${open[0]} yarn test:e2e --project=hardware-teardown`
      : null;
  },

  /**
   * The port the hardware tier was pointed at exists.
   *
   * Every case in that tier opens it first, so a typo or an unplugged adapter
   * is thirty-odd identical timeouts.
   */
  async testPortExists(baseUrl) {
    const wanted = process.env.CNCJS_TEST_PORT;
    if (!wanted) {
      // No port named is not an error: the tier skips itself.
      return null;
    }

    const res = await fetch(new URL('/api/controllers', baseUrl).href);
    if (!res.ok) {
      return `the server answered ${res.status} for /api/controllers, so nothing here can be checked`;
    }

    // The server has no route that lists ports — `list` is a socket call — so
    // an already-open port is the only positive proof available over HTTP.
    // Absence proves nothing, which is why this only ever reports a port that
    // is open under a *different* name.
    const open = await openPorts(baseUrl);
    return open.length && !open.includes(wanted)
      ? `CNCJS_TEST_PORT is ${wanted}, but the server has ${open.join(', ')} open instead.\n` +
        '    Two machines, or a stale port from an earlier run.'
      : null;
  },
};

const openPorts = async (baseUrl) => {
  const res = await fetch(new URL('/api/controllers', baseUrl).href);
  if (!res.ok) {
    return [];
  }
  const list = await res.json();
  return (Array.isArray(list) ? list : []).map((entry) => entry.port).filter(Boolean);
};

/**
 * Which checks a tier needs.
 *
 * Tier-aware rather than one list, because a check that cannot apply is a
 * check that will eventually be wrong about something: `electron` brings its
 * own runtime and `auth` starts its own production server, and neither has any
 * business being told that a dev watcher is behind.
 */
const FOR_PROJECT = {
  smoke: ['appBundleRuns', 'appAssetsPresent', 'panelBundleFresh', 'noPortOpen'],
  hardware: ['appBundleRuns', 'appAssetsPresent', 'panelBundleFresh', 'testPortExists'],
  'hardware-teardown': [],
};

/**
 * Run the checks for the selected projects and report everything that is
 * wrong — not the first thing.
 *
 * Reporting one at a time would mean a fix, a re-run, and the next one, which
 * is the slow loop this whole file exists to avoid.
 */
const preflight = async (baseUrl, projects, { filtered = false } = {}) => {
  const names = [...new Set(projects.flatMap((project) => FOR_PROJECT[project] || []))]
    // A run narrowed to one spec file is usually somebody debugging that file,
    // and refusing it because an unrelated tier's precondition is off would be
    // this check getting in the way instead of out of it.
    .filter((name) => !(filtered && name === 'noPortOpen'));

  const problems = [];
  for (const name of names) {
    let problem;
    try {
      problem = await checks[name](baseUrl);
    } catch (e) {
      problem = `${name} could not be checked: ${e.message}`;
    }
    if (problem) {
      problems.push(problem);
    }
  }

  return problems;
};

module.exports = { preflight, FOR_PROJECT };
