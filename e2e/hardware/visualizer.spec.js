const path = require('path');
const { test, expect, TEST_PORT } = require('./fixtures');
const {
  SCREENSHOT_OPTIONS,
  TOOLPATH_FIXTURE,
  sceneMasks,
  seedVisualizerState,
  settleScene,
  visualizerCanvas,
} = require('../visualizer-fixtures');

/**
 * What the toolpath itself looks like.
 *
 * This belongs in the hardware tier for a structural reason rather than a
 * convenient one: G-code reaches the visualizer only through the server, as a
 * `gcode:load` event on a connected controller (see `addControllerEvents` in
 * the widget). `controller.command('gcode:load', ...)` is addressed to a port,
 * so with nothing open the upload is dropped and the scene stays empty. The
 * smoke tier therefore cannot draw a toolpath at all, and the grid-only
 * baseline it does own is in e2e/visualizer.spec.js.
 *
 * **Nothing here moves the machine.** Loading G-code fills the sender's queue;
 * only Run starts streaming it, and Run is never clicked. The fixture is also
 * never sent as commands, so a controller with no soft limits is in no more
 * danger than it is while sitting idle.
 */
test.describe('visualizer toolpath', () => {
  test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

  const FIXTURE_NAME = path.basename(TOOLPATH_FIXTURE);

  const gcodeName = (page) => page
    .locator('[data-widget-id="visualizer"]')
    .getByText(FIXTURE_NAME, { exact: true })
    .filter({ visible: true });

  /**
   * The cutting tool and the cutting pointer are drawn at the live work
   * position, so the scene is only comparable against a baseline from a known
   * one. Nothing in this tier moves the machine and the jog specs return every
   * axis to where they found it, so origin is where it should be — but if it is
   * not, say why rather than leaving a pixel diff to be interpreted.
   */
  const expectWorkPositionAtOrigin = async (grbl) => {
    for (const axis of ['X', 'Y', 'Z']) {
      const value = parseFloat(await grbl.workPosition(axis).textContent());
      expect(
        value,
        `${axis} work position is ${value}; the baselines were recorded at origin. ` +
        'Zero the work offsets or re-record.'
      ).toBeCloseTo(0, 2);
    }
  };

  test.beforeEach(async ({ cncjs }) => {
    await seedVisualizerState(cncjs.page);
  });

  test('renders the loaded G-code as a toolpath', async ({ grbl, cncjs }) => {
    await grbl.connect();
    await expectWorkPositionAtOrigin(grbl);

    const visualizer = grbl.page.locator('[data-widget-id="visualizer"]');

    await visualizer.locator('input[type="file"]').setInputFiles(TOOLPATH_FIXTURE);

    // The name label only appears once the widget has taken delivery of the
    // G-code, which makes it the widget's own statement that the load
    // completed — a wait on the canvas alone would pass against the empty
    // scene that was already there.
    //
    // Filtered by visibility because the widget renders the file name twice:
    // the Dashboard also names it, and the Dashboard is the no-WebGL fallback
    // that stays mounted under `display: none` whenever the 3D view is up.
    const name = gcodeName(grbl.page);
    await expect(name).toBeVisible({ timeout: 30000 });

    // 'Rendering' is an overlay that replaces the canvas while the geometry is
    // built, so it has to be gone before there is anything to photograph.
    await expect(grbl.page.getByText(/^Rendering/)).toHaveCount(0, { timeout: 30000 });

    await settleScene(grbl.page);

    await expect(visualizerCanvas(grbl.page))
      .toHaveScreenshot('toolpath-default-view.png', {
        ...SCREENSHOT_OPTIONS,
        mask: sceneMasks(grbl.page, [name]),
      });

    cncjs.expectNoPageErrors();
  });

  /**
   * Closing the file has to take the toolpath back out of the scene. It shares
   * `unload()` with every later load, so a leak here would quietly accumulate
   * geometry across files — and the grid-only image this compares against is
   * the one the smoke tier already owns, which makes the assertion a real
   * round trip rather than a second recording of whatever unload happens to
   * leave behind.
   */
  test('takes the toolpath back out of the scene when the file is closed', async ({ grbl, cncjs }) => {
    await grbl.connect();
    await expectWorkPositionAtOrigin(grbl);

    const visualizer = grbl.page.locator('[data-widget-id="visualizer"]');
    await visualizer.locator('input[type="file"]').setInputFiles(TOOLPATH_FIXTURE);

    const name = gcodeName(grbl.page);
    await expect(name).toBeVisible({ timeout: 30000 });

    await visualizer.getByTitle('Close', { exact: true }).click();
    await expect(name).toHaveCount(0, { timeout: 15000 });

    await settleScene(grbl.page);

    await expect(visualizerCanvas(grbl.page))
      .toHaveScreenshot('toolpath-unloaded.png', {
        ...SCREENSHOT_OPTIONS,
        mask: sceneMasks(grbl.page),
      });

    cncjs.expectNoPageErrors();
  });
});
