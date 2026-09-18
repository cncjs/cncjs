const {
  test,
  expect,
  withApp,
  firstWindow,
  waitForWorkspace,
} = require('./fixtures');

test.describe('desktop app', () => {
  test('starts its own server and mounts the workspace', async () => {
    await withApp([], async (app) => {
      const win = await firstWindow(app);
      const errors = [];
      win.on('pageerror', (e) => errors.push(e.message));

      // With no server configured the app serves itself on a random loopback
      // port, which is what keeps two instances from fighting over one.
      expect(win.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
      await expect(win).toHaveTitle(/CNCjs/i);

      await waitForWorkspace(win);
      expect(await win.locator('[data-widget-id]').count()).toBeGreaterThanOrEqual(15);

      expect(errors, `uncaught exceptions:\n${errors.join('\n')}`).toEqual([]);
    });
  });

  test('gives the renderer no way into Node', async () => {
    await withApp([], async (app) => {
      const win = await firstWindow(app);
      await waitForWorkspace(win);

      // The window loads its content over HTTP — from another machine once a
      // server is configured. Anything reachable here is reachable by whoever
      // serves that page, or by anyone able to sit between.
      const exposed = await win.evaluate(() => ({
        require: typeof window.require,
        process: typeof window.process,
        ipcRenderer: typeof window.ipcRenderer,
        module: typeof window.module,
      }));

      expect(exposed).toEqual({
        require: 'undefined',
        process: 'undefined',
        ipcRenderer: 'undefined',
        module: 'undefined',
      });
    });
  });

  test('exposes exactly the two bridge methods the app needs', async () => {
    await withApp([], async (app) => {
      const win = await firstWindow(app);
      await waitForWorkspace(win);

      const methods = await win.evaluate(() => (window.cncjs ? Object.keys(window.cncjs).sort() : null));

      // Widening this list is a security decision, not a refactor.
      expect(methods).toEqual(['readUserConfig', 'writeUserConfig']);
    });
  });

  test('round-trips the user config over IPC', async () => {
    await withApp([], async (app) => {
      const win = await firstWindow(app);
      await waitForWorkspace(win);

      const result = await win.evaluate(async () => {
        const original = await window.cncjs.readUserConfig();
        await window.cncjs.writeUserConfig(JSON.stringify({
          version: 'e2e',
          state: { probe: 'roundtrip' },
        }));
        const written = await window.cncjs.readUserConfig();

        // Leave the user's real config exactly as it was found.
        await window.cncjs.writeUserConfig(original);
        const restored = await window.cncjs.readUserConfig();

        return {
          probe: JSON.parse(written)?.state?.probe,
          restored: restored === original,
        };
      });

      expect(result.probe).toBe('roundtrip');
      expect(result.restored, 'the original config should have been put back').toBe(true);
    });
  });
});
