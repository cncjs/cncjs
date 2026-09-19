const { test, expect, settingsSection } = require('./fixtures');

/**
 * Whether the app still responds to being used, as opposed to merely
 * rendering.
 *
 * The rest of the smoke tier is deliberately shallow — it mounts widgets and
 * paints settings panes — and that was enough while React stood still. It is
 * not enough across a React major: 17 moved event delegation from `document`
 * to the root container, dropped event pooling, and switched onFocus/onBlur to
 * native focusin/focusout. None of that changes what a first paint looks like,
 * and all of it changes what happens when someone clicks.
 *
 * So these drive the two places most exposed to it: a dialog, which React
 * renders through a portal and whose events now take a different route out,
 * and the form library inside it, which is one of the packages whose peer
 * range still stops at React 16.
 */
test.describe('interaction', () => {
  /**
   * @trendmicro/react-modal builds its class names the same way the app's own
   * CSS modules do — `[name]---[local]---[hash]` — so the prefix is a stable
   * hook even though the trailing hash is not. It sets no `role`, which is
   * its own small accessibility problem and not one to fix from a test.
   */
  const dialog = (page) => page.locator('[class*="modal---modal-content"]').first();

  test('opens a dialog, takes input, and closes again', async ({ cncjs }) => {
    await cncjs.gotoSettings('machine-profiles');

    // Scoped, and not an exact name match: the button's label is an icon
    // followed by a <Space> component, so its accessible name carries
    // non-breaking spaces around the word.
    await settingsSection(cncjs.page).getByRole('button', { name: 'Add' }).click();

    // Rendered through a portal. In React 17 a click inside one no longer
    // reaches `document` the way it used to, which is the change most likely
    // to strand a dialog open or shut it on its own first click.
    await expect(dialog(cncjs.page)).toBeVisible();
    await expect(cncjs.page.getByText('Machine Profile', { exact: true })).toBeVisible();

    // react-final-form still caps its peer range at React 16, so this is the
    // assertion that it works anyway: a controlled input has to accept a
    // synthetic change event and give the value back.
    const name = dialog(cncjs.page).locator('input[type="text"]').first();
    await name.fill('Bench Mill');
    await expect(name).toHaveValue('Bench Mill');

    await cncjs.page.getByRole('button', { name: 'Cancel', exact: true }).click();
    // `toBeHidden` also passes for an element that was never there, so it
    // only means anything after the `toBeVisible` above has proved the
    // locator matches something real.
    await expect(dialog(cncjs.page)).toBeHidden();

    cncjs.expectNoPageErrors();
  });

  test('keeps the workspace usable after settings have been opened and left', async ({ cncjs }) => {
    // Navigation is client-side, so the workspace stays mounted under
    // `display: none` the whole time. If React's listeners were rebound to the
    // wrong container on the way through, this is where it shows.
    await cncjs.gotoWorkspace();
    await cncjs.gotoSettings('general');
    await cncjs.page.goto('/#/workspace', { waitUntil: 'domcontentloaded' });

    const visualizer = cncjs.page.locator('[data-widget-id="visualizer"]');
    await expect(visualizer).toBeVisible();

    await cncjs.page.getByRole('button', { name: 'Top view', exact: true }).click();
    await expect(cncjs.page.locator('[data-widget-id="visualizer"] canvas').first()).toBeVisible();

    cncjs.expectNoPageErrors();
  });
});
