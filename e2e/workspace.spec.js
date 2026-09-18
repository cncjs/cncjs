const { test, expect, DEFAULT_WIDGETS } = require('./fixtures');

test.describe('workspace', () => {
  test('boots without uncaught errors', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await expect(cncjs.page).toHaveTitle(/CNCjs/i);
    cncjs.expectNoPageErrors();
  });

  test('mounts every widget in the default layout', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    for (const id of DEFAULT_WIDGETS) {
      await expect(
        cncjs.page.locator(`[data-widget-id="${id}"]`),
        `widget "${id}" should be mounted`
      ).toBeVisible();
    }

    cncjs.expectNoPageErrors();
  });

  test('renders the axes readout with all three axes at zero', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const axes = cncjs.page.locator('[data-widget-id="axes"]');
    for (const axis of ['X', 'Y', 'Z']) {
      await expect(axes.getByText(axis, { exact: true }).first()).toBeVisible();
    }
    // Machine and work position for three axes, all unhomed.
    await expect(axes.getByText('0.000')).toHaveCount(6);
  });

  test('renders the visualizer canvas', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Three.js draws into a canvas; if the WebGL renderer failed to construct,
    // the widget falls back to an empty container and this disappears.
    const canvas = cncjs.page.locator('[data-widget-id="visualizer"] canvas');
    await expect(canvas.first()).toBeVisible();

    const box = await canvas.first().boundingBox();
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(200);
  });

  test('console widget mounts its terminal or the idle notice', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Proves the xterm-backed widget got through construction. Which of the
    // two states it lands in depends on whether this client opened a port, so
    // accept either rather than tying the suite to machine availability.
    const consoleWidget = cncjs.page.locator('[data-widget-id="console"]');
    const terminal = consoleWidget.locator('.xterm');
    const idleNotice = consoleWidget.getByText(/no serial connection/i);

    await expect(terminal.or(idleNotice).first()).toBeVisible();
    cncjs.expectNoPageErrors();
  });

  test('connection widget offers every supported controller', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const connection = cncjs.page.locator('[data-widget-id="connection"]');
    for (const controller of ['Grbl', 'Marlin', 'Smoothie', 'TinyG']) {
      await expect(connection.getByText(controller, { exact: true })).toBeVisible();
    }
  });
});
