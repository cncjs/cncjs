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
    const position = (axis, kind) =>
      axes
        .locator('tr')
        .filter({ has: page.locator(`[class*="Axes/index__coordinate"] > *:text-is("${axis}")`) })
        .locator(`[class*="Axes/index__${kind}-position"] > div`)
        .first();

    const workPosition = (axis) => position(axis, 'work');
    const machinePosition = (axis) => position(axis, 'machine');

    // The visualizer header mirrors the controller's active state, so it is
    // the cheapest place to watch for Idle/Jog/Run/Alarm.
    const controllerState = page.locator('[class*="Visualizer/index__controller-state"]');

    const connect = async () => {
      await cncjs.gotoWorkspace();

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
      await expect(controllerState).toHaveText(/idle/i, { timeout: 30000 });
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
     */
    const readControllerState = async () => {
      const res = await page.request.get('/api/controllers');
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
