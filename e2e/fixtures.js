const base = require('@playwright/test');

// Noise the dev server emits regardless of application health. Anything
// matching these is dropped before a spec asserts on the console, so the
// assertions stay meaningful instead of being permanently red.
const IGNORED_CONSOLE = [
  // webpack-dev-server's HMR client dials :8000/ws while the dev server sits
  // on :8080, so the handshake always fails in this setup.
  /\[webpack-dev-server\]/i,
  /WebSocket connection to .*\/ws.* failed/i,
  // eslint-webpack-plugin pipes lint warnings through the browser console.
  /\[eslint\]/i,
  /Do not define components during render/i,
  // Three.js renders through the software GL stack under headless Chromium.
  /GL Driver Message/i,
  /WebGL/i,
  // React 15 deprecation chatter that predates this suite.
  /componentWill(Mount|ReceiveProps|Update) has been renamed/i,
  // Carries no URL, so it says nothing the response listener below does not
  // already report — and report with enough detail to act on.
  /Failed to load resource/i,
];

// Requests that are allowed to fail without meaning the app is broken.
const IGNORED_REQUESTS = [
  // A rebuild invalidates the hash the running page is polling for, so an
  // in-flight client asks for a chunk that no longer exists.
  /hot-update\.(json|js)$/i,
  /\/ws(\?|$)/i,
  /favicon\.ico$/i,
  /*
   * An engine.io poll for a session the server no longer knows. **Unexplained.**
   *
   * Written down as ignorance rather than as a diagnosis, because that is what
   * it is. What is known, measured 2026-09-23:
   *
   *   - about one full smoke run in two, never twice in the same run
   *   - always in `panel.spec.js`, and on a different case each time — it
   *     lands on whichever case happens to be running
   *   - always `transport=polling` carrying an `sid`, so a session that was
   *     established and then forgotten
   *
   * Ruled out, each by trying it: navigating repeatedly between languages on
   * one page; opening and closing 24 panel pages at eight different moments in
   * their lifetime; running `panel.spec.js` alone three times over. All clean.
   * It needs the whole suite — the old application's specs and then the
   * panel's — which is the one condition a narrower experiment cannot hold.
   *
   * Scoped as tightly as the knowledge allows. Only a *polling* request that
   * already carries an `sid` is forgiven: a failed handshake has no `sid` and
   * still fails the suite, as does any other socket.io status. Widening this
   * would hide a broken socket, which is most of what this panel is.
   *
   * Left in the kickoff as an open question with this recipe, rather than
   * closed. An ignored request that nobody understands is a debt, and it is
   * recorded as one.
   */
  /\/socket\.io\/\?.*transport=polling.*[?&]sid=/i,
];

const matches = (patterns, text) => patterns.some((re) => re.test(text));

/**
 * Every spec gets a page that records console errors, uncaught exceptions and
 * failed requests. Call `expectNoPageErrors()` to assert the app stayed clean,
 * or read the arrays directly when a spec wants to be more specific.
 */
const test = base.test.extend({
  cncjs: async ({ page }, use) => {
    const consoleErrors = [];
    const pageErrors = [];
    const httpErrors = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') {
        return;
      }
      const text = msg.text();
      if (!matches(IGNORED_CONSOLE, text)) {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      if (!matches(IGNORED_CONSOLE, err.message)) {
        pageErrors.push(err.message);
      }
    });

    page.on('response', (res) => {
      if (res.status() < 400 || matches(IGNORED_REQUESTS, res.url())) {
        return;
      }
      httpErrors.push(`${res.status()} ${res.url()}`);
    });

    // Each navigation is a full SPA bootstrap: 15 widgets plus a Three.js
    // renderer. That comfortably exceeds the default expect timeout on a busy
    // machine, so the initial wait gets its own budget rather than being
    // papered over with retries.
    const BOOT_TIMEOUT = 45 * 1000;

    const gotoWorkspace = async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // The workspace is what mounts the widgets; wait for one to prove the
      // React tree actually rendered rather than just the HTML shell.
      await page
        .locator('[data-widget-id="connection"]')
        .waitFor({ state: 'visible', timeout: BOOT_TIMEOUT });
    };

    const gotoSettings = async (section) => {
      await page.goto(`/#/settings/${section}`, { waitUntil: 'domcontentloaded' });
      await settingsSection(page).waitFor({ state: 'visible', timeout: BOOT_TIMEOUT });
    };

    const expectNoPageErrors = () => {
      base.expect(pageErrors, `uncaught exceptions:\n${pageErrors.join('\n')}`).toEqual([]);
      base.expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
      base.expect(httpErrors, `failed requests:\n${httpErrors.join('\n')}`).toEqual([]);
    };

    await use({
      page,
      consoleErrors,
      pageErrors,
      httpErrors,
      gotoWorkspace,
      gotoSettings,
      expectNoPageErrors,
    });
  },
});

/**
 * The workspace stays mounted under `display: none` while settings are open
 * (see containers/App.jsx), so anything looking for settings content has to be
 * scoped or it will match hidden workspace nodes instead.
 *
 * CSS modules are built with `[path][name]__[local]--[hash]` in both the
 * development and production webpack configs, so the path prefix is a stable
 * hook even though the trailing hash is not.
 */
const settingsSection = (page) => page.locator('[class*="containers/Settings/index__section"]');

// Widgets present in the default workspace layout. Each renders a container
// carrying its own `data-widget-id`, which is the stable hook this suite uses.
const DEFAULT_WIDGETS = [
  'connection',
  'console',
  'grbl',
  'marlin',
  'smoothie',
  'tinyg',
  'webcam',
  'visualizer',
  'axes',
  'gcode',
  'macro',
  'autolevel',
  'probe',
  'tool',
  'spindle',
];

const SETTINGS_SECTIONS = [
  'general',
  'workspace',
  'controller',
  'machine-profiles',
  'user-accounts',
  'commands',
  'events',
  'about',
];

module.exports = {
  test,
  expect: base.expect,
  settingsSection,
  DEFAULT_WIDGETS,
  SETTINGS_SECTIONS,
};
