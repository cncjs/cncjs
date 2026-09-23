const { test: baseTest, expect } = require('../fixtures');

/**
 * Serial port to drive, e.g. CNCJS_TEST_PORT=COM3. Without it the whole
 * hardware tier is skipped, so `yarn test:e2e` stays runnable on a machine
 * with nothing plugged in.
 */
const TEST_PORT = process.env.CNCJS_TEST_PORT || '';
const TEST_BAUD = process.env.CNCJS_TEST_BAUD || '115200';

const test = baseTest.extend({
  grbl: async ({ cncjs }, use) => {
    const { page } = cncjs;

    const connection = page.locator('[data-widget-id="connection"]');
    const axes = page.locator('[data-widget-id="axes"]');

    /**
     * The big readout for one axis. Both position cells carry a CSS module
     * class built from the source path, which is stable across builds even
     * though the trailing hash is not.
     *
     * The row is identified by the axis label rather than by index. Note the
     * child combinator: the coordinate cell renders `<AxisLabel>X</AxisLabel>`
     * followed by `<AxisSubscript>mm</AxisSubscript>`, so the cell's own text
     * is "Xmm" and matching `:text-is("X")` on it finds nothing.
     */
    const position = (axis, kind) => axes
        .locator('tr')
        .filter({ has: page.locator(`[class*="Axes/index__coordinate"] > *:text-is("${axis}")`) })
        .locator(`[class*="Axes/index__${kind}-position"] > div`)
        .first();

    const workPosition = (axis) => position(axis, 'work');
    const machinePosition = (axis) => position(axis, 'machine');

    // The visualizer header mirrors the controller's active state, so it is
    // the cheapest place to watch for Idle/Jog/Run/Alarm.
    const controllerState = page.locator('[class*="Visualizer/index__controller-state"]');

    /**
     * Dismiss the visualizer's WebGL warning if it is up.
     *
     * A workspace without WebGL raises it on mount, and its overlay covers the
     * whole page — every later click is intercepted by it rather than landing
     * on the widget. A no-op when WebGL is available, which is every spec but
     * the dashboard one.
     */
    const dismissWebGLWarning = async () => {
      // Decided by asking the page whether WebGL exists, not by looking for
      // the dialog. The visualizer mounts after `gotoWorkspace` has returned,
      // so a dialog that is not up *yet* is indistinguishable from one that is
      // never coming — and polling for it would cost every other spec here a
      // timeout it does not need.
      const hasWebGL = await page.evaluate(() => Boolean(window.WebGLRenderingContext));

      if (hasWebGL) {
        return;
      }

      const dialog = page.locator('[data-reactportal]')
        .filter({ hasText: 'WebGL Error Message' });

      await dialog.getByRole('button', { name: 'OK' }).click();
      await expect(dialog).toHaveCount(0, { timeout: 10000 });
    };

    /**
     * The token the application signed in with, out of its own storage.
     *
     * Shared by the two things here that talk to the server directly — the
     * unlock and the controller read — because both need it for the same
     * reason: `src/server/app.js` bypasses JWT verification entirely when
     * NODE_ENV is development, so an unauthenticated request happens to work
     * against `yarn dev` and returns 403 against the production server a
     * garage actually runs.
     */
    const sessionToken = () => page.evaluate(() => {
      try {
        const raw = window.localStorage.getItem('cnc');
        return raw ? JSON.parse(raw)?.state?.session?.token || '' : '';
      } catch (e) {
        return '';
      }
    });

    /**
     * Open the port, and by default wait until the machine will take a command.
     *
     * `requireIdle` is not a convenience. The teardown's whole job is to close
     * the port, and insisting first that the machine behind it is happy makes
     * the one step that *cleans up* the tier depend on the tier having gone
     * well — which is exactly when it has not. Measured 2026-09-23: a leaked
     * controller in the server's store (`sockets: []`, `ready: false`) left
     * the teardown asserting its way to a timeout instead of closing anything,
     * and the port stayed open for every run after it.
     */
    const connect = async ({ requireIdle = true } = {}) => {
      await cncjs.gotoWorkspace();
      await dismissWebGLWarning();

      // Already connected from a previous spec in the same worker.
      if (await connection.getByRole('button', { name: /^Close$/ }).isVisible().catch(() => false)) {
        return;
      }

      await connection.getByText(/choose a port/i).click();
      await page.getByText(new RegExp(`\\b${TEST_PORT}\\b`)).first().click();
      await connection.getByRole('button', { name: /^Open$/ }).click();

      // The button flipping to Close is the widget's own signal that the
      // controller reported ready.
      await expect(connection.getByRole('button', { name: /^Close$/ })).toBeVisible({ timeout: 30000 });

      if (!requireIdle) {
        return;
      }

      const unlocked = await unlock();
      expect(
        unlocked,
        'the controller stayed in alarm after $X. Two different things look like this, and only ' +
        'one of them is about the server:\n' +
        '  - a soft-limit alarm, which Grbl answers with `[MSG:Reset to continue]` and which $X ' +
        'cannot clear at all. A jog that left the envelope is the cause, and since the travel is ' +
        '`[-range, 0]`, a `+` move from a freshly opened port is already outside it. Every case ' +
        'after the one that did it fails here too, which is why this message must not guess.\n' +
        '  - a stale controller in the server (`ready: false`), where nothing reaches the machine ' +
        'at all. Restart the server.\n' +
        'The server log tells them apart in one line.'
      ).toBe(true);

      await expect(controllerState).toHaveText(/idle/i, { timeout: 30000 });
    };

    /**
     * Give an alarmed controller permission to move, but only if it is asking.
     *
     * Opening the port resets Grbl, and with `$22=1` it comes up in `Alarm`
     * rather than `Idle` — it has no idea where it is until it has been homed.
     * This tier waits for Idle, so a port it opened itself used to leave every
     * case in it failing on `Expected /idle/i, received "Alarm"`. The previous
     * session's machine was only ever Idle because somebody had unlocked it by
     * hand and left it that way, which is not a state a suite may depend on.
     *
     * **Also: in alarm the server sends no G-code at all.** Each of the four
     * controllers begins its feeder with `if (this.runner.isAlarm()) {
     * this.feeder.reset(); return; }`, so nothing this tier asks of the
     * machine would reach it — the jog cases would be pressing keys at a
     * controller that never hears them.
     *
     * `$X` moves nothing. It clears the alarm lock, and an unhomed machine
     * then has permission to move on the next command — which is exactly what
     * the jog cases go on to ask for, deliberately and by a known step.
     *
     * Conditional, and it has to be: `$X` on an Idle machine is a needless
     * command sent at hardware, and the point of reading the state first is
     * that this only ever acts on a machine that is asking to be unlocked.
     */
    const unlock = async () => {
      const alarmed = await controllerState.textContent().catch(() => '');
      if (!/alarm/i.test(String(alarmed))) {
        return true;
      }

      /*
       * Sent on a socket of its own, not through a widget.
       *
       * The application keeps its socket client inside the React tree and
       * puts nothing on `window`, so there is no handle to borrow. The two
       * alternatives were typing `$X` into the console widget — which would
       * tie this fixture to the markup of a widget that has its own spec in
       * this tier — and an HTTP route, which does not exist: `src/server/api`
       * has no way to send a controller command at all.
       *
       * So it speaks the protocol, which is the thing this tier is actually
       * about. The server sets `serveClient: true`, so its own socket.io
       * client is on the same origin, and the token is the one the
       * application already signed in with.
       */
      const sent = await page.evaluate(async ([port, token]) => {
        await new Promise((resolve, reject) => {
          const tag = document.createElement('script');
          tag.src = '/socket.io/socket.io.js';
          tag.onload = resolve;
          tag.onerror = () => reject(new Error('the server did not serve its socket.io client'));
          document.head.appendChild(tag);
        });

        const socket = window.io('/', { query: { token } });
        await new Promise((resolve, reject) => {
          socket.on('connect', resolve);
          socket.on('connect_error', reject);
        });

        // `unlock` is the server's own name for it; `GrblController` turns it
        // into `$X`. Named rather than written as a raw line so that the
        // three other firmwares get whatever each of them calls the same
        // thing, and this fixture stays true if the tier ever meets one.
        socket.emit('command', port, 'unlock');
        return true;
      }, [TEST_PORT, await sessionToken()]);

      expect(sent, 'could not reach the server to unlock the controller').toBe(true);

      /*
       * Reported, not asserted.
       *
       * Whether the alarm clears is the caller's business: `connect` says so
       * in the caller's own terms, and the teardown does not care at all. An
       * assertion in here would fail inside a fixture with a message about a
       * CSS-module locator, which is how the reason for a stuck port gets
       * lost.
       */
      return controllerState.waitFor({ state: 'visible', timeout: 5000 })
        .then(() => expect(controllerState).not.toHaveText(/alarm/i, { timeout: 15000 }))
        .then(() => true, () => false);
    };

    const disconnect = async () => {
      const close = connection.getByRole('button', { name: /^Close$/ });
      if (await close.isVisible().catch(() => false)) {
        await close.click();
        await expect(connection.getByRole('button', { name: /^Open$/ })).toBeVisible({ timeout: 15000 });
      }
    };

    /**
     * The jog increment currently selected in the keypad, in mm.
     *
     * Read rather than set: the step control is a dropdown toggle with no
     * accessible name — its label is `{step}<Space /><sub>mm</sub>` — so
     * driving it means depending on fragile markup. Reading what is already
     * selected tests the same jog path with far less coupling. It is the only
     * button in the widget rendering a `<sub>`, which makes it identifiable
     * without reaching for a CSS module hash.
     */
    const jogStep = async () => {
      const label = await axes.locator('button:has(sub)').first().textContent();
      const value = parseFloat(String(label).replace(/[^\d.]/g, ''));
      expect(Number.isFinite(value), `could not read the jog step from "${label}"`).toBe(true);
      return value;
    };

    /**
     * Click a keypad jog button and wait for the move to actually land.
     *
     * Waiting on the controller state alone does not work: for a moment after
     * the click the command has not left the browser yet, so the controller is
     * still reporting Idle and the wait returns immediately. A spec that ends
     * there tears the page down mid-move and the axis never comes back — which
     * is how an early version of this helper left X a millimetre off origin.
     *
     * So wait for the reported position to reach the target first, then for
     * the controller to come to rest.
     */
    const jog = async (direction) => {
      const axis = direction.slice(0, 1);
      const sign = direction.endsWith('+') ? 1 : -1;
      const step = await jogStep();
      const start = parseFloat(await workPosition(axis).textContent());
      const target = start + (sign * step);

      await axes.locator(`[title="Move ${direction}"]`).click();

      await expect
        .poll(async () => parseFloat(await workPosition(axis).textContent()), { timeout: 20000 })
        .toBeCloseTo(target, 2);

      await expect
        .poll(async () => {
          const state = await readControllerState();
          return String(state?.controller?.state?.status?.activeState || '').toLowerCase();
        }, { timeout: 20000 })
        .toBe('idle');
    };

    /**
     * Live controller state straight from the server, for assertions that
     * should not depend on the UI having re-rendered yet.
     *
     * The bearer token is not optional. `src/server/app.js` bypasses JWT
     * verification entirely when NODE_ENV is development, so an unauthenticated
     * request happens to work against `yarn dev` — and returns 403 against any
     * production server, which is what a deployed instance runs. Reading the
     * token the app itself stores keeps this tier usable against both.
     */
    const readControllerState = async () => {
      const res = await page.request.get('/api/controllers', {
        headers: { Authorization: `Bearer ${await sessionToken()}` },
      });
      expect(res.status(), `GET /api/controllers returned ${res.status()}`).toBe(200);

      const list = await res.json();
      return list.find((entry) => entry.port === TEST_PORT) || null;
    };

    await use({
      page,
      connection,
      axes,
      controllerState,
      workPosition,
      machinePosition,
      connect,
      dismissWebGLWarning,
      disconnect,
      jogStep,
      jog,
      readControllerState,
      port: TEST_PORT,
      baud: TEST_BAUD,
    });
  },
});

module.exports = { test, expect, TEST_PORT, TEST_BAUD };
