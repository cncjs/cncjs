const { test, expect } = require('./fixtures');

/**
 * The G-code widget with nothing loaded.
 *
 * This is the half of the widget a browser can reach on its own. G-code only
 * arrives through the server as a `gcode:load` event addressed to an open
 * port, so everything the widget says about a job — dimensions, counts,
 * progress, times — belongs to the hardware tier and lives in
 * `e2e/hardware/gcode-widget.spec.js`. What is left here is the state a
 * machine sits in most of the time, and it is worth pinning on its own: the
 * widget has to be legible and honest when there is nothing to report.
 *
 * Written before the widget is rebuilt on the new component library, so it
 * asserts on what the widget says rather than on the markup it happens to say
 * it with. `data-table="dimension"` is the one structural hook, and it is
 * already in the source.
 */
test.describe('gcode widget, idle', () => {
  const widget = (page) => page.locator('[data-widget-id="gcode"]');

  const dimensions = (page) => widget(page).locator('[data-table="dimension"]');

  test('is mounted and titled', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    await expect(widget(cncjs.page)).toBeVisible();
    await expect(widget(cncjs.page).getByText('G-code', { exact: true })).toBeVisible();
  });

  test('offers a dimension row for each axis', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    const table = dimensions(cncjs.page);
    await expect(table).toBeVisible();

    for (const heading of ['Axis', 'Min', 'Max', 'Dimension']) {
      await expect(table.getByRole('columnheader', { name: heading })).toBeVisible();
    }
    for (const axis of ['X', 'Y', 'Z']) {
      await expect(table.getByRole('cell', { name: axis, exact: true })).toBeVisible();
    }
  });

  test('reports a zero bounding box in millimetres', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Three axes, three columns each. Metric is the default, every figure
    // carries its unit rather than leaning on a header, and every figure is
    // padded to three decimals — `mapPositionToUnits` does that in the widget,
    // not the view. Fixed width is the point: a reading whose digits move as
    // the value changes is unreadable on a machine.
    await expect(dimensions(cncjs.page).getByRole('cell', { name: '0.000 mm', exact: true }))
      .toHaveCount(9);
  });

  test('says nothing rather than zero where no job exists', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Sent, Received, Start, Elapsed, Finish, Remaining. A dash is the honest
    // answer with no job loaded; "0 / 0" and "00:00:00" would read as a job
    // that exists and has not started.
    for (const label of ['Sent', 'Received', 'Start Time', 'Elapsed Time', 'Finish Time', 'Remaining Time']) {
      await expect(widget(cncjs.page).getByText(label, { exact: true })).toBeVisible();
    }
    await expect(widget(cncjs.page).getByText('–', { exact: true })).toHaveCount(6);
  });

  test('shows no progress bar until there is something to progress through', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // The bar is rendered only when `total > 0`. A bar sitting at 0% with no
    // job loaded invites the reading that a job is loaded and stalled.
    //
    // Located by role rather than by class: `.progress` is bootstrap's wrapper
    // and would stop existing the moment this widget is rebuilt, which would
    // turn this assertion green for the wrong reason.
    await expect(widget(cncjs.page).getByRole('progressbar')).toHaveCount(0);
  });

  test('keeps its readings when the widget is minimised and restored', async ({ cncjs }) => {
    await cncjs.gotoWorkspace();

    // Minimising is persisted per widget through WidgetConfig, and the toggle
    // is part of the chrome that the rebuild replaces. The readings have to
    // survive the round trip.
    const toggle = widget(cncjs.page).getByRole('button', { name: /expand|collapse/i }).first();
    await toggle.click();
    await expect(dimensions(cncjs.page)).toBeHidden();

    await toggle.click();
    await expect(dimensions(cncjs.page)).toBeVisible();
    await expect(dimensions(cncjs.page).getByRole('cell', { name: '0.000 mm', exact: true }))
      .toHaveCount(9);
  });
});
