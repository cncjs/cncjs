const fs = require('fs');
const path = require('path');
const base = require('@playwright/test');
const { _electron: electron } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MAIN = path.join(REPO_ROOT, 'dist', 'cncjs', 'main.js');
const ELECTRON_APP_DIR = path.join(REPO_ROOT, 'dist', 'cncjs', 'electron-app');

// The desktop app is tested against a packaged build, not against source, so
// this tier only runs once `yarn build-prod` has produced one.
const hasBuild = () => fs.existsSync(MAIN);

// Where client mode should point. Same default as the smoke tier.
const REMOTE_URL = process.env.CNCJS_URL || 'http://localhost:8000';

/**
 * Launch the packaged app, hand it to the test, and always shut it down.
 *
 * Every launch is a fresh process but *not* fresh state: the server choice
 * lives in electron-store under the user's profile, which is the behaviour
 * being tested. Specs that change it are responsible for putting it back, and
 * `resetServer` exists for exactly that.
 */
const withApp = async (args, fn) => {
  const app = await electron.launch({
    args: [MAIN, ...args],
    cwd: REPO_ROOT,
    timeout: 120 * 1000,
  });

  try {
    return await fn(app);
  } finally {
    await app.close();
  }
};

/** Put the app back into "run my own server" mode. */
const resetServer = async () => {
  await withApp(['--server-url='], async (app) => {
    const win = await app.firstWindow({ timeout: 120 * 1000 });
    await win.waitForLoadState('domcontentloaded');
  });
};

const firstWindow = async (app) => {
  const win = await app.firstWindow({ timeout: 120 * 1000 });
  await win.waitForLoadState('domcontentloaded');
  return win;
};

/** Wait for the React tree, not merely the HTML shell. */
const waitForWorkspace = async (win) => {
  await win.locator('[data-widget-id="connection"]').waitFor({
    state: 'visible',
    timeout: 90 * 1000,
  });
};

const test = base.test.extend({});

test.skip(() => !hasBuild(), `No packaged build at ${MAIN}. Run \`yarn build-prod\` first.`);

module.exports = {
  test,
  expect: base.expect,
  withApp,
  resetServer,
  firstWindow,
  waitForWorkspace,
  MAIN,
  ELECTRON_APP_DIR,
  REMOTE_URL,
};
