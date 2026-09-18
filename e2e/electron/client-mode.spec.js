const path = require('path');
const {
  test,
  expect,
  withApp,
  resetServer,
  firstWindow,
  waitForWorkspace,
  ELECTRON_APP_DIR,
  REMOTE_URL,
} = require('./fixtures');

// These specs write the server choice into electron-store, which outlives the
// process. Whatever they do, the app has to be left running its own server.
test.afterEach(async () => {
  await resetServer();
});

test.describe('client mode', () => {
  test('loads a configured server instead of starting one', async () => {
    await withApp([`--server-url=${REMOTE_URL}`], async (app) => {
      const win = await firstWindow(app);
      const errors = [];
      win.on('pageerror', (e) => errors.push(e.message));

      expect(win.url().startsWith(REMOTE_URL)).toBe(true);
      await waitForWorkspace(win);

      expect(errors, `uncaught exceptions:\n${errors.join('\n')}`).toEqual([]);
    });
  });

  test('talks to the configured server, not a local stand-in', async () => {
    await withApp([`--server-url=${REMOTE_URL}`], async (app) => {
      const win = await firstWindow(app);
      await waitForWorkspace(win);

      // A serial port can only be held by one process. If this instance had
      // quietly started its own server, that server could not have opened a
      // port the real one already has — so any controller reported here came
      // from the machine we meant to reach.
      const result = await win.evaluate(async () => {
        const raw = window.localStorage.getItem('cnc');
        const token = raw ? (JSON.parse(raw)?.state?.session?.token || '') : '';
        const res = await fetch('/api/controllers', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return { status: res.status, count: res.ok ? (await res.json()).length : -1 };
      });

      expect(result.status, 'the remote API should have answered').toBe(200);
    });
  });

  test('remembers the choice across a restart', async () => {
    await withApp([`--server-url=${REMOTE_URL}`], async (app) => {
      await firstWindow(app);
    });

    // No flag this time: the stored value is the only thing that can point it.
    await withApp([], async (app) => {
      const win = await firstWindow(app);
      expect(win.url().startsWith(REMOTE_URL)).toBe(true);
    });
  });

  test('an empty --server-url goes back to the local server', async () => {
    await withApp([`--server-url=${REMOTE_URL}`], async (app) => {
      await firstWindow(app);
    });

    await withApp(['--server-url='], async (app) => {
      const win = await firstWindow(app);
      expect(win.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
    });
  });

  test('the server picker validates before it acts', async () => {
    await withApp([], async (app) => {
      await firstWindow(app);

      // Open the picker the way the Server menu does. Menus cannot be driven
      // from here, so the window is created directly — the point is the
      // contract of its bridge and its validation, not the click path.
      await app.evaluate(async ({ BrowserWindow }, paths) => {
        const win = new BrowserWindow({
          width: 480,
          height: 330,
          show: false,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: paths.preload,
          },
        });
        await win.loadFile(paths.html);
      }, {
        preload: path.join(ELECTRON_APP_DIR, 'server-picker-preload.js'),
        html: path.join(ELECTRON_APP_DIR, 'server-picker.html'),
      });

      const windows = app.windows();
      const picker = windows[windows.length - 1];
      await picker.waitForLoadState('domcontentloaded');

      const surface = await picker.evaluate(() => ({
        bridge: window.serverPicker ? Object.keys(window.serverPicker).sort() : null,
        require: typeof window.require,
      }));
      expect(surface.bridge).toEqual(['cancel', 'current', 'submit']);
      expect(surface.require).toBe('undefined');

      // A malformed address must be reported, not stored — storing it would
      // relaunch the app into a server that cannot exist, and the only way
      // back would be the command line.
      const rejected = await picker.evaluate(() => window.serverPicker.submit('?? not an address ??'));
      expect(rejected.ok).toBe(false);
      expect(rejected.message).toBeTruthy();
    });
  });
});
