const { test, expect } = require('./fixtures');
const {
  SCREENSHOT_OPTIONS,
  sceneMasks,
  seedVisualizerState,
  settleScene,
  visualizerCanvas,
} = require('./visualizer-fixtures');

/**
 * What the visualizer actually draws, as pixels.
 *
 * `workspace.spec.js` already proves a canvas appears and has a non-zero box,
 * which is worth having but is also satisfied by a renderer that draws
 * nothing at all — the element exists either way. These specs close that gap
 * for everything the scene contains without a machine attached: the grid, the
 * coordinate axes and their labels, the grid line numbers, the machine limits
 * cuboid and the cutting tool.
 *
 * The toolpath itself needs G-code, and G-code only reaches the widget through
 * a connected controller (`controller.on('gcode:load')`), so it is covered in
 * the hardware tier instead — see e2e/hardware/visualizer.spec.js.
 */
test.describe('visualizer scene', () => {
  test.beforeEach(async ({ cncjs }) => {
    await seedVisualizerState(cncjs.page);
  });

  test('draws the grid, axes and limits for the seeded machine profile', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();
    await settleScene(cncjs.page);

    await expect(visualizerCanvas(cncjs.page))
      .toHaveScreenshot('scene-default-view.png', {
        ...SCREENSHOT_OPTIONS,
        mask: sceneMasks(cncjs.page),
      });

    cncjs.expectNoPageErrors();
  });

  /**
   * The same scene with the coordinate system and the grid line numbers turned
   * off. This exists to keep the spec above honest: it is the control that
   * proves the baseline is sensitive to what is in the scene rather than to
   * the canvas merely being the right size. If hiding the grid produced the
   * same image, neither assertion would be measuring anything.
   */
  test('draws a visibly different scene once the grid is hidden', async ({ cncjs }) => {
    await cncjs.page.addInitScript(() => {
      const raw = window.localStorage.getItem('cnc');
      const blob = JSON.parse(raw);
      const objects = blob.state.widgets.visualizer.objects;
      objects.coordinateSystem.visible = false;
      objects.gridLineNumbers.visible = false;
      objects.limits.visible = false;
      window.localStorage.setItem('cnc', JSON.stringify(blob));
    });

    await cncjs.gotoWorkspace();
    await settleScene(cncjs.page);

    await expect(visualizerCanvas(cncjs.page))
      .toHaveScreenshot('scene-objects-hidden.png', {
        ...SCREENSHOT_OPTIONS,
        mask: sceneMasks(cncjs.page),
      });

    cncjs.expectNoPageErrors();
  });
});
