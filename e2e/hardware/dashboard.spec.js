const fs = require('fs');
const path = require('path');
const { test, expect, TEST_PORT } = require('./fixtures');
const { TOOLPATH_FIXTURE } = require('../visualizer-fixtures');

test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

/**
 * The Visualizer's Dashboard — the G-code list shown instead of the 3D scene.
 *
 * Nothing had ever rendered it. It needs **two** things at once, and PR #26
 * changed a ref inside it without either being available:
 *
 *  - **No WebGL.** `showDashboard` is `!capable.view3D`, and `view3D` is
 *    `WebGL.isWebGLAvailable()`. The smoke tier deliberately runs full
 *    Chromium *so that* WebGL exists, which is the opposite of what this
 *    needs. `isWebGLAvailable` is memoized and reads
 *    `window.WebGLRenderingContext` once, so deleting it before the bundle
 *    runs is enough and does not disturb anything else.
 *  - **A loaded file.** The virtual list is rendered only when
 *    `this.lines.length > 0`, and G-code reaches the widget only as a
 *    `gcode:load` event on a connected controller — `POST /api/gcode` answers
 *    `Controller not found` without a port. That is what puts this in the
 *    hardware tier rather than the smoke one.
 *
 * **Nothing here moves the machine.** Loading G-code fills the sender's queue;
 * only Run starts streaming it, and Run is never clicked.
 */
test.describe('visualizer dashboard', () => {
  const FIXTURE_NAME = path.basename(TOOLPATH_FIXTURE);

  /** The fixture's own lines, which is what the list has to agree with. */
  const fixtureLines = fs.readFileSync(TOOLPATH_FIXTURE, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0);

  test.beforeEach(async ({ cncjs }) => {
    await cncjs.page.addInitScript(() => {
      // Read once by a memoized isWebGLAvailable(), before any widget mounts.
      delete window.WebGLRenderingContext;
      delete window.WebGL2RenderingContext;
    });
  });

  test('lists the loaded G-code when there is no WebGL', async ({ grbl, cncjs }) => {
    const page = grbl.page;

    await grbl.connect();

    const visualizer = page.locator('[data-widget-id="visualizer"]');

    // With WebGL gone the widget must not have put a 3D canvas up at all.
    await expect(visualizer.locator('canvas')).toHaveCount(0);

    await visualizer.locator('input[type="file"]').setInputFiles(TOOLPATH_FIXTURE);

    // The Dashboard names the file it is showing.
    await expect(visualizer.getByText(FIXTURE_NAME, { exact: true }).first())
      .toBeVisible({ timeout: 30000 });

    /**
     * The measured height is the point of the ref.
     *
     * `resizeVirtualList` reads `clientHeight` off the element the ref hands
     * over and feeds it to the list as its `height`. A ref pointing at a React
     * instance would read `undefined`, the height would stay 0, and the list
     * would render no rows at all — so a non-empty list is the assertion that
     * the measurement happened.
     */
    const viewer = visualizer.locator('[class*="Visualizer/dashboard__gcode-viewer"]');
    const rows = visualizer.locator('[class*="Visualizer/dashboard__line"]');

    await expect.poll(() => rows.count(), { timeout: 30000 })
      .toBeGreaterThan(0);

    // The list is given the measured height, so the two have to agree. If the
    // ref had handed over anything but the element, `clientHeight` would have
    // been undefined and this would be 0.
    const measured = await viewer.evaluate(el => el.clientHeight);
    expect(measured).toBeGreaterThan(0);

    const listed = await viewer.locator('> div').first()
      .evaluate(el => parseInt(el.style.height, 10));
    expect(listed, 'the virtual list was not sized from the measured element')
      .toBe(measured);

    // Every rendered row is numbered, and the numbering starts at 1 — the list
    // is virtual, so only the top of the file is in the DOM.
    const first = rows.first();
    await expect(first).toContainText('1');

    // And the text beside the number is the file's first line, not a blank or
    // an index into the wrong array.
    await expect(first).toContainText(fixtureLines[0].trim().slice(0, 12));

    cncjs.expectNoPageErrors();
  });
});
