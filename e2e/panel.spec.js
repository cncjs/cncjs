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
  // The panel speaks Polish, so its landmarks are found by role rather than
  // by an English name that only ever existed in these cases.
  const bar = (page) => page.getByRole('banner');
  const rail = (page) => page.getByRole('navigation', { name: 'Nawigacja' });

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
    const tile = cncjs.page.locator('section').filter({ hasText: /pozycja robocza/i });
    await expect(tile.first()).toBeVisible();

    // Per axis rather than by counting dashes in the card: the card's own
    // header carries one too, for the coordinate system nobody has told us
    // yet, and a count cannot tell the two kinds of unknown apart.
    for (const axis of ['X', 'Y', 'Z']) {
      await expect(tile.first().getByRole('group', { name: axis }))
        .toHaveText(new RegExp('^' + axis + ' *– *mm$'));
    }
    await expect(tile.first().getByText('0.000')).toHaveCount(0);
  });

  test('no jog key can be pressed at a machine that is not there', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Every one of them, not a sample. A jog key that looks pressable and
    // silently does nothing teaches an operator that jog keys sometimes do
    // nothing, which is the last thing to believe about a machine — and it is
    // exactly what this panel did before `connected` came to mean *attached*
    // rather than "a port is open somewhere".
    // The jog card carries no header — the mockup gives it none and the keys
    // say what it is — so it is found by the thing that makes it the jog
    // card rather than by a caption that could be styled away.
    // The jog controls live on the jog screen, so the case goes there. The
    // dashboard has no jog tile — the mockup does not put one there, and a
    // case that asserted against one would be testing a layout nobody drew.
    await cncjs.page.getByRole('navigation', { name: 'Nawigacja' })
      .getByRole('button', { name: 'Jog' }).click();

    const jogTile = cncjs.page.locator('section')
      .filter({ has: cncjs.page.getByRole('group', { name: 'Jog' }) }).first();
    await expect(jogTile).toBeVisible();

    const keys = jogTile.getByRole('button');
    const count = await keys.count();
    expect(count, 'the jog tile should have controls to disable').toBeGreaterThan(8);

    for (let i = 0; i < count; i += 1) {
      await expect(keys.nth(i)).toBeDisabled();
    }
  });

  test('the rail says where you are', async ({ cncjs }) => {
    await openPanel(cncjs.page);

    // Colour alone leaves anyone not looking at it unable to tell.
    await expect(rail(cncjs.page).getByRole('button', { name: 'Pulpit' }))
      .toHaveAttribute('aria-current', 'page');
  });
});
