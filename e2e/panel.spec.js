const { test, expect } = require('./fixtures');

/**
 * The panel, with no machine on the other end.
 *
 * A second application in the same repository, served at `/panel` and built
 * from the design mockup rather than migrated out of `src/app`. It shares one
 * thing with the old application — the socket client — and one server.
 *
 * This is the half a browser can reach on its own. What the panel says once a
 * controller is answering lives in `e2e/hardware/panel.spec.js`.
 */
test.describe('panel, disconnected', () => {
  const bar = (page) => page.getByRole('navigation', { name: 'Machine bar' });
  const rail = (page) => page.getByRole('navigation', { name: 'Main navigation' });

  const openPanel = async (page) => {
    await page.goto('/panel/', { waitUntil: 'domcontentloaded' });
    await expect(bar(page)).toBeVisible({ timeout: 45000 });
  };

  test('loads, and is not the old application', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // The old workspace is not in here. If a build ever pointed `/panel` at
    // the wrong output this is what would notice.
    await expect(cncjs.page.locator('[data-widget-id]')).toHaveCount(0);
    await expect(rail(cncjs.page)).toBeVisible();

    cncjs.expectNoPageErrors();
  });

  test('says there is no machine rather than showing an idle one', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Not "Idle", not an empty chip. "Disconnected" is the answer to "why did
    // nothing happen when I pressed that", and it is a state an operator acts
    // on.
    await expect(bar(cncjs.page)).toContainText(/disconnected/i);
  });

  test('the stop is there and cannot be pressed at nothing', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Always present, because the mockup's whole point is that it is always in
    // the same place. Disabled because it would reach no machine — a control
    // that sometimes silently does nothing is one nobody trusts in the moment
    // they need it.
    const stop = bar(cncjs.page).getByRole('button', { name: /^Stop$/i });
    await expect(stop).toBeVisible();
    await expect(stop).toBeDisabled();
  });

  test('every reading is a dash, and not a zero', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // On an unhomed machine "0.000" and "we have not been told" are very
    // different statements, and only one of them is safe to act on.
    const tile = cncjs.page.getByRole('region').filter({ hasText: /work position/i })
      .or(cncjs.page.locator('section').filter({ hasText: /work position/i }));
    await expect(tile.first()).toBeVisible();
    await expect(tile.first().getByText('–', { exact: true })).toHaveCount(3);
    await expect(tile.first().getByText('0.000')).toHaveCount(0);
  });

  test('the rail says where you are', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Colour alone leaves anyone not looking at it unable to tell.
    await expect(rail(cncjs.page).getByRole('button', { name: 'Panel' }))
      .toHaveAttribute('aria-current', 'page');
  });
});
