const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

/**
 * The Visualizer's Watch Directory browser.
 *
 * Like the Dashboard, this needs two things at once and so had never been
 * rendered by any tier. PR #26 changed a ref inside it regardless.
 *
 *  - **An open port.** The menu item that opens the dialog is
 *    `disabled={!canUpload}`, and `canUpload` comes from `canClick = !!port`
 *    (`WorkflowControl.jsx`). Seeding localStorage the way
 *    `configured-widgets.spec.js` does cannot reach it — an earlier plan
 *    assumed it could.
 *  - **A configured directory on the server.** `watchDirectory` is read once,
 *    at server start (`src/server/index.js`), so it cannot be attached to a
 *    running instance. Hence the skip below rather than a fixture: the spec
 *    runs when the dev server was started with `--watch-directory` and says
 *    plainly what is missing when it was not.
 */
test.describe('watch directory browser', () => {
  /** Whether the server under test was started with a watch directory. */
  const watchConfigured = async (page) => {
    const res = await page.request.get('/api/watch/status');

    if (!res.ok()) {
      return false;
    }

    const body = await res.json();
    return Boolean(body && body.configured);
  };

  test('sizes the file table headers from the rendered rows', async ({ grbl, cncjs }) => {
    const page = grbl.page;

    await grbl.connect();

    test.skip(
      !(await watchConfigured(page)),
      'No watch directory on the server under test. Start it with ' +
      '`--watch-directory <path>` (see e2e/README.md) to run this case.'
    );

    const visualizer = page.locator('[data-widget-id="visualizer"]');

    // The Browse... item lives behind the caret of the *upload* split-button.
    // Scoped by the button it sits next to: the widget has three dropdowns and
    // the first one is the work coordinate system, not this.
    const uploadGroup = visualizer
      .locator('[class*="buttons---btn-group"]')
      .filter({ has: page.locator('button[title="Upload G-code"]') });

    await uploadGroup.locator('button[class*="dropdown-toggle"]').click();
    await visualizer.getByRole('menuitem', { name: /Browse/ }).click();

    // The modal renders through @trendmicro/react-portal, so it is outside the
    // widget's own subtree.
    const dialog = page.locator('[data-reactportal]');
    await expect(dialog.getByText('Watch Directory')).toBeVisible({ timeout: 15000 });

    // The columns are measured from the rendered rows, so the tree has to have
    // drawn them first. infinite-tree renders its own rows through a separate
    // ReactDOM.render, which is why this waits on content rather than on the
    // component having mounted.
    await expect
      .poll(() => dialog.locator('tbody tr').count(), { timeout: 15000 })
      .toBeGreaterThan(0);

    /**
     * `fitHeaderColumns` measures each rendered cell and writes the result
     * back as an inline width on the matching `<th>`.
     *
     * That is the whole point of the ref: it calls `querySelectorAll` on what
     * the ref hands over, which a React instance cannot answer. So a `<th>`
     * carrying an inline pixel width is the evidence the measurement ran
     * against the real table element.
     */
    const headers = dialog.locator('thead th');
    await expect.poll(() => headers.count(), { timeout: 15000 })
      .toBeGreaterThan(0);

    const widths = await headers.evaluateAll(
      els => els.map(el => el.style.width)
    );

    expect(
      widths.every(width => /^\d+px$/.test(width)),
      `header widths were ${JSON.stringify(widths)}; every one should be an inline pixel value`
    ).toBe(true);

    expect(
      widths.some(width => parseInt(width, 10) > 0),
      'every measured header width was zero'
    ).toBe(true);

    cncjs.expectNoPageErrors();
  });
});
