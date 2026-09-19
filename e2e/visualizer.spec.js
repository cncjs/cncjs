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
/**
 * Drag across the middle of the canvas. Which way the view then moves depends
 * on the widget's camera mode — pan by default — but that it moves at all is
 * the part worth asserting.
 */
const dragCanvas = async (page, dx, dy) => {
  const box = await visualizerCanvas(page).boundingBox();
  const x = box.x + (box.width / 2);
  const y = box.y + (box.height / 2);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();

  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  }));
};

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

  /**
   * The five named viewpoints, each photographed.
   *
   * Preset views are the part of the camera work that is hardest to argue
   * about in the abstract — the unit tests in `camera-fit` prove the box ends
   * up on screen, but not that "front" faces the front. Five images of the
   * same asymmetric machine profile do: an envelope that is 80 wide, 60 deep
   * and 20 tall looks different from every side, so a view wired to the wrong
   * direction cannot match any baseline but its own.
   */
  test.describe('preset views', () => {
    const VIEWS = [
      ['Top view', 'top'],
      ['Front view', 'front'],
      ['Left side view', 'left'],
      ['Right side view', 'right'],
      ['3D view', '3d'],
    ];

    VIEWS.forEach(([label, name]) => {
      test(`frames the machine from the ${name} view`, async ({ cncjs }) => {
        await cncjs.gotoWorkspace();
        await settleScene(cncjs.page);

        // Exact, because the primary toolbar carries a "3D View options"
        // control whose accessible name contains this one.
        await cncjs.page.getByRole('button', { name: label, exact: true }).click();
        await cncjs.page.evaluate(() => new Promise((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
        }));

        await expect(visualizerCanvas(cncjs.page))
          .toHaveScreenshot(`view-${name}.png`, {
            ...SCREENSHOT_OPTIONS,
            mask: sceneMasks(cncjs.page),
          });

        cncjs.expectNoPageErrors();
      });
    });

    /**
     * Presets are absolute, not relative.
     *
     * This is the property that makes them worth having: whatever the view
     * has been dragged to, asking for the top view has to produce *the* top
     * view. Comparing against the baseline the preset test already owns is
     * what makes it an assertion rather than another recording.
     */
    test('returns to the same framing after the view has been moved', async ({ cncjs }) => {
      await cncjs.gotoWorkspace();
      await settleScene(cncjs.page);

      const canvas = visualizerCanvas(cncjs.page);
      await cncjs.page.getByRole('button', { name: 'Top view', exact: true }).click();
      const framed = await canvas.screenshot();

      await dragCanvas(cncjs.page, 160, 90);
      const moved = await canvas.screenshot();

      // If the drag did nothing, the rest of this proves nothing: the
      // controls would be unwired and every preset would trivially "restore"
      // a view that had never left.
      expect(Buffer.compare(framed, moved)).not.toBe(0);

      await cncjs.page.getByRole('button', { name: 'Top view', exact: true }).click();
      await cncjs.page.evaluate(() => new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      }));

      await expect(canvas).toHaveScreenshot('view-top.png', {
        ...SCREENSHOT_OPTIONS,
        mask: sceneMasks(cncjs.page),
      });

      cncjs.expectNoPageErrors();
    });
  });
});
