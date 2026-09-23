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

/**
 * What the panel bundle is actually built from.
 *
 * Not every file under `src/panel`. The directory also holds
 * `server-backlog.md` and `README.md`, which webpack never reads — so editing
 * a note declared the bundle stale and refused a run that was perfectly able
 * to pass. That happened on the first real use of this check, which is the
 * argument for the list rather than for the directory.
 */
const BUILT_FROM = /\.(jsx?|css|json|html)$/i;

/** The newest modification time among a directory's buildable files, or 0. */
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
      } else if (BUILT_FROM.test(entry.name)) {
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

/**
 * Every `node` process on this machine, with what it is running and how much
 * it is holding.
 *
 * There is no portable way to ask: a process cannot enumerate its siblings, so
 * this shells out. Windows is the platform this project is developed on and
 * `Get-CimInstance` is the only thing there that reports a command line
 * reliably — `tasklist` truncates it, and truncated is useless when every one
 * of these is `node.exe` and the argument is the whole identity.
 *
 * Returns an empty list rather than throwing when it cannot look. A preflight
 * that fails because it could not run PowerShell would be worse than the
 * problem it is checking for.
 */
const nodeProcesses = () => {
  const { execFileSync } = require('child_process');

  try {
    if (process.platform === 'win32') {
      const out = execFileSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
        'Select-Object ProcessId,WorkingSetSize,CommandLine | ConvertTo-Json -Compress',
      ], { encoding: 'utf8', timeout: 15000, windowsHide: true });

      const parsed = JSON.parse(out || '[]');
      // A single match comes back as an object, not a one-element array.
      return (Array.isArray(parsed) ? parsed : [parsed]).map((row) => ({
        pid: row.ProcessId,
        mb: Math.round(row.WorkingSetSize / (1024 * 1024)),
        command: String(row.CommandLine || ''),
      }));
    }

    return execFileSync('ps', ['-eo', 'pid=,rss=,args='], { encoding: 'utf8', timeout: 15000 })
      .split('\n')
      .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
      .filter((match) => match && /\bnode\b/.test(match[3]))
      .map((match) => ({
        pid: Number(match[1]),
        mb: Math.round(Number(match[2]) / 1024),
        command: match[3],
      }));
  } catch (e) {
    return [];
  }
};

/**
 * What a process is, by what it was told to run.
 *
 * `npx` and `npm` wrappers carry the whole command line of the thing they are
 * about to spawn, so a naive count sees two watchers where there is one — and
 * on this machine the wrapper is not even the watcher's parent, because the
 * chain runs through `cmd.exe` and the ppid link is broken. Excluding the
 * wrappers by name is the reliable discriminator; they still count towards
 * memory, because the memory is real.
 */
const WRAPPER = /npx-cli\.js|npm-cli\.js/;

const ROLES = [
  { id: 'the dev server', pattern: /bin[/\\]cncjs/ },
  { id: 'the panel watcher', pattern: /webpack\.config\.panel/ },
  { id: 'the workspace watcher', pattern: /webpack\.config\.development/ },
];

/**
 * When a single node process is large enough to be worth saying out loud.
 *
 * The panel watcher starts around 400MB and creeps. It reached 8GB in one
 * night on 2026-09-23 and 16GB of 32 on an earlier one, and the 8GB one was
 * serving a bundle an hour out of date while doing it — which is the reason
 * this matters to a *test* run and not only to the machine. Two gigabytes is
 * well above anything healthy here and well below the point where it starts
 * hurting.
 */
const BLOATED_MB = 2048;

/**
 * What the hardware tier asks the server for when it opens the port.
 *
 * Stated here rather than read from anywhere, because there is nowhere to
 * read it from: the tier drives the old application's Connection widget, and
 * a Playwright profile is new on every run, so the widget has nothing
 * remembered and sends `src/app/store/defaultState.js`'s Grbl at 115200.
 * `CNCJS_TEST_BAUD` does not reach it either — the widget is never told a
 * baud rate, only clicked.
 *
 * If these ever stop being what the tier asks for, the tier stops working,
 * because its specs are Grbl to the letter — `$X`, `$23`, the alarm it comes
 * up in. So a disagreement here is the finding rather than a false alarm.
 */
const TIER_OPENS_AS = { controllerType: 'Grbl', baudrate: 115200 };

const checks = {
  /**
   * Nothing is running twice, and nothing has eaten the machine.
   *
   * Two kinds of finding, and they are not the same kind of problem.
   *
   * A second dev server or a second watcher makes the run *wrong*: two
   * watchers write the same bundle file and the loser's output is what gets
   * served, and a second server means the port you are testing may not be the
   * process you just rebuilt. Those stop the run.
   *
   * Bloat does not make a run wrong, so it does not stop one — it is reported
   * and the run continues. Killing a watcher is safe (the bundle is already on
   * disk and nothing rebuilds it until a source file changes), but deciding
   * that for somebody mid-session is not this file's call.
   */
  processes() {
    const all = nodeProcesses();
    if (!all.length) {
      return null;
    }

    const problems = [];
    const named = all.filter((one) => !WRAPPER.test(one.command));

    for (const { id, pattern } of ROLES) {
      const running = named.filter((one) => pattern.test(one.command));
      if (running.length > 1) {
        problems.push(
          `${running.length} copies of ${id} are running: ${running.map((one) => `pid ${one.pid}`).join(', ')}.\n` +
          '    Two watchers write the same bundle and the loser wins the file; two servers mean the\n' +
          '    port under test need not be the process you rebuilt. Keep one:\n' +
          `      Stop-Process -Id ${running.slice(1).map((one) => one.pid).join(',')} -Force`
        );
      }
    }

    const bloated = all.filter((one) => one.mb >= BLOATED_MB);
    const total = all.reduce((sum, one) => sum + one.mb, 0);

    if (bloated.length) {
      problems.push({
        warning:
          `node is holding ${total.toLocaleString()} MB across ${all.length} processes, and ` +
          `${bloated.length} of them ${bloated.length === 1 ? 'is' : 'are'} over ${BLOATED_MB} MB:\n` +
          bloated.map((one) => `      ${String(one.mb).padStart(6)} MB  pid ${one.pid}  ${one.command.slice(0, 70)}`).join('\n') +
          '\n    The panel watcher creeps — 8GB in one session, 16GB of 32 in another — and a watcher\n' +
          '    that large has been seen serving an hour-old bundle while still looking alive.\n' +
          '    Killing it is safe: the bundle is on disk and nothing rebuilds it until a source changes.',
      });
    }

    return problems.length ? problems : null;
  },

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
   * The port the hardware tier was pointed at can be opened *by this tier*.
   *
   * Every case in that tier opens it first, so anything wrong here is
   * thirty-odd identical timeouts rather than one failure — a typo, an
   * unplugged adapter, or a port somebody else is already holding on terms
   * this tier cannot use.
   *
   * That last one only became a stopping problem on 2026-09-23. Until then a
   * port already open was silently attached to and the caller's settings were
   * thrown away, so the tier ran — against whatever controller happened to be
   * there. `CNCEngine` now refuses the mismatch instead, which is right, and
   * which turns the same situation into one full timeout per case, waiting
   * for a widget that will never say "Close". Measured that morning: COM3
   * left open as Marlin at 9600 by a client on another machine.
   */
  async testPortUsable(baseUrl) {
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
    // Absence proves nothing, which is why a missing port is only ever
    // reported when some *other* port is open in its place.
    const open = (await res.json()).filter((entry) => entry && entry.port);
    const here = open.find((entry) => entry.port === wanted);

    if (!here) {
      const elsewhere = open.map((entry) => entry.port);
      return elsewhere.length
        ? `CNCJS_TEST_PORT is ${wanted}, but the server has ${elsewhere.join(', ')} open instead.\n` +
          '    Two machines, or a stale port from an earlier run.'
        : null;
    }

    /*
     * Open on somebody else's terms.
     *
     * Compared field by field rather than as a pair, so the message names the
     * one setting that is wrong — the same two the server itself compares,
     * for the same reason. An `undefined` on the server's side is not a
     * disagreement: it means the controller never reported that setting, and
     * inventing a clash out of a missing value would stop a run that would
     * have passed.
     */
    const clash = [
      ['as', TIER_OPENS_AS.controllerType, here.controller?.type],
      ['at', `${TIER_OPENS_AS.baudrate} baud`, here.baudrate && `${here.baudrate} baud`],
    ].find(([, asked, actual]) => actual && String(asked) !== String(actual));

    if (clash) {
      const [preposition, asked, actual] = clash;
      return `${wanted} is already open ${preposition} ${actual}, and this tier opens it ${preposition} ${asked}.\n` +
        '    A port open with other settings is refused rather than attached to, so every case here\n' +
        '    would sit out its whole timeout waiting for the Connection widget to say "Close".\n' +
        '    Close it where it was opened — the panel has a Connection screen — and start again.\n' +
        '    The tier\'s own teardown cannot do it for you: it closes the port by clicking the same\n' +
        '    button, so it is refused in exactly the same way.';
    }

    /*
     * Open on the right terms, but the controller behind it never came up.
     *
     * `ready: false` is a controller the server built and then heard nothing
     * from — a wrong baud rate, an adapter pulled out, a previous run that
     * left it behind. Attaching to it succeeds, so the widget says "Close"
     * and the tier proceeds; nothing it sends reaches the machine. That is
     * the fixture's own guess when the alarm will not clear, written into its
     * failure message, which is a sign it is worth catching before the run
     * rather than once per case during it.
     */
    if (here.ready === false) {
      return `${wanted} is open, but the controller behind it never became ready.\n` +
        '    Attaching to it works and nothing reaches the machine, so this tier would open the\n' +
        '    port, see "Close", and then time out on a machine that is not listening.\n' +
        '    Close the port and restart the server.';
    }

    return null;
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
  smoke: ['processes', 'appBundleRuns', 'appAssetsPresent', 'panelBundleFresh', 'noPortOpen'],
  hardware: ['processes', 'appBundleRuns', 'appAssetsPresent', 'panelBundleFresh', 'testPortUsable'],
  // Nothing. This is the step that cleans up after a tier, and a cleanup that
  // refuses to run because the machine it is cleaning up is untidy is no
  // cleanup at all.
  'hardware-teardown': [],
};

/**
 * Run the checks for the selected projects and report everything that is
 * wrong — not the first thing.
 *
 * Reporting one at a time would mean a fix, a re-run, and the next one, which
 * is the slow loop this whole file exists to avoid.
 *
 * A check returns nothing, one finding, or several. A finding is a string when
 * it should stop the run and `{ warning }` when it should only be said: the
 * difference is whether it makes the run *wrong* or merely makes the machine
 * unpleasant. Two watchers writing one bundle is the first kind; a watcher
 * holding eight gigabytes is the second, and aborting somebody's run over it
 * would be this file deciding something that is not its to decide.
 */
const preflight = async (baseUrl, projects, { filtered = false } = {}) => {
  const names = [...new Set(projects.flatMap((project) => FOR_PROJECT[project] || []))]
    // A run narrowed to one spec file is usually somebody debugging that file,
    // and refusing it because an unrelated tier's precondition is off would be
    // this check getting in the way instead of out of it.
    .filter((name) => !(filtered && name === 'noPortOpen'));

  const found = [];
  for (const name of names) {
    let result;
    try {
      result = await checks[name](baseUrl);
    } catch (e) {
      result = `${name} could not be checked: ${e.message}`;
    }
    if (result) {
      found.push(...(Array.isArray(result) ? result : [result]));
    }
  }

  return {
    problems: found.filter((one) => typeof one === 'string'),
    warnings: found.filter((one) => one && one.warning).map((one) => one.warning),
  };
};

module.exports = { preflight, FOR_PROJECT };
