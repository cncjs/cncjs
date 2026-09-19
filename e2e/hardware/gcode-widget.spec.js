const path = require('path');
const { test, expect, TEST_PORT } = require('./fixtures');
const { TOOLPATH_FIXTURE } = require('../visualizer-fixtures');

/**
 * What the G-code widget says once a job is loaded.
 *
 * This is the half of the widget the smoke tier cannot reach. G-code arrives
 * only as a `gcode:load` event addressed to an open port, so with nothing
 * connected the upload is dropped and every figure here stays at its idle
 * value. The idle half is pinned in `e2e/gcode-widget.spec.js`.
 *
 * **Nothing here moves the machine.** Loading fills the sender's queue; only
 * Run starts streaming it, and Run is never clicked. The fixture is never sent
 * as commands either, so a controller with no soft limits is in no more danger
 * than while sitting idle.
 *
 * Written before the widget is rebuilt on the new component library, so it
 * asserts on the figures and the relationships between them rather than on the
 * markup that currently carries them.
 */
test.describe('gcode widget, job loaded', () => {
  test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

  const FIXTURE_NAME = path.basename(TOOLPATH_FIXTURE);

  const widget = (page) => page.locator('[data-widget-id="gcode"]');
  const dimensions = (page) => widget(page).locator('[data-table="dimension"]');

  /** The three figures on one axis row, as numbers. */
  const axisRow = async (page, axis) => {
    const cells = dimensions(page).locator('tbody tr').filter({
      has: page.getByRole('cell', { name: axis, exact: true }),
    }).locator('td');
    const text = await cells.allInnerTexts();
    // [axis, min, max, dimension]
    return text.slice(1).map((value) => parseFloat(value));
  };

  const loadFixture = async (page) => {
    const visualizer = page.locator('[data-widget-id="visualizer"]');
    await visualizer.locator('input[type="file"]').setInputFiles(TOOLPATH_FIXTURE);
    // The visualizer naming the file is the application's own statement that
    // the load completed; waiting on the G-code widget instead would be
    // waiting on the thing under test.
    await expect(
      visualizer.getByText(FIXTURE_NAME, { exact: true }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 30000 });
  };

  test('reports the bounding box of the loaded toolpath', async ({ grbl }) => {
    await grbl.connect();
    await loadFixture(grbl.page);

    // The fixture is documented as living inside 80 x 60 mm, and it cuts below
    // the surface and retracts above it, so every axis has real extent. A
    // widget reading zeros here is a widget that never received the load.
    await expect
      .poll(async () => (await axisRow(grbl.page, 'X'))[2], { timeout: 15000 })
      .toBeGreaterThan(0);

    for (const axis of ['X', 'Y', 'Z']) {
      const [min, max, dimension] = await axisRow(grbl.page, axis);
      expect(max, `${axis} max should not be below its min`).toBeGreaterThanOrEqual(min);
      // The dimension column is the span, not a third independent reading.
      // Deriving it wrongly is the kind of defect that looks plausible on
      // screen, so it is checked against the two figures beside it.
      expect(dimension, `${axis} dimension should be max - min`).toBeCloseTo(max - min, 3);
    }
  });

  test('counts the lines of the job without having sent any', async ({ grbl }) => {
    await grbl.connect();
    await loadFixture(grbl.page);

    const sent = widget(grbl.page).getByText(/^\d+ \/ \d+$/).first();
    await expect(sent).toBeVisible({ timeout: 15000 });

    const counters = await widget(grbl.page).getByText(/^\d+ \/ \d+$/).allInnerTexts();
    expect(counters, 'both Sent and Received should be counting').toHaveLength(2);

    for (const counter of counters) {
      const [done, total] = counter.split('/').map((value) => parseInt(value.trim(), 10));
      expect(total, 'a loaded job should have lines').toBeGreaterThan(0);
      expect(done, 'nothing has been streamed, so nothing is sent or received').toBe(0);
    }
  });

  test('shows a progress bar once there is a job to progress through', async ({ grbl }) => {
    await grbl.connect();
    await loadFixture(grbl.page);

    // Absent while idle, present once loaded: the bar's existence is itself
    // the statement that a job is waiting.
    await expect(widget(grbl.page).getByRole('progressbar')).toHaveCount(1, { timeout: 15000 });
    await expect(widget(grbl.page).getByText('0%', { exact: true })).toBeVisible();
  });

  test('still reports no times for a job that has not started', async ({ grbl }) => {
    await grbl.connect();
    await loadFixture(grbl.page);

    await expect(widget(grbl.page).getByRole('progressbar')).toHaveCount(1, { timeout: 15000 });

    // Loading is not starting. Start, Elapsed, Finish and Remaining stay
    // blank; showing 00:00:00 would read as a job that began and is frozen.
    await expect(widget(grbl.page).getByText('–', { exact: true })).toHaveCount(4);
  });
});
