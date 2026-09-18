const { test, expect, settingsSection, SETTINGS_SECTIONS } = require('./fixtures');

test.describe('settings', () => {
  for (const section of SETTINGS_SECTIONS) {
    test(`renders the "${section}" section`, async ({ cncjs }) => {
      await cncjs.gotoSettings(section);

      // The side navigation lists every section regardless of which one is
      // open, so seeing the link proves nothing on its own — the section pane
      // resolving and painting content is the real signal.
      await expect(cncjs.page.locator(`a[href$="/settings/${section}"]`)).toBeVisible();

      const pane = settingsSection(cncjs.page);
      await expect(pane).toBeVisible();
      await expect(pane).not.toBeEmpty();

      cncjs.expectNoPageErrors();
    });
  }

  test('navigates between sections without a full reload', async ({ cncjs }) => {
    await cncjs.gotoSettings('general');

    // Mark the window so a reload can be detected: a client-side route change
    // keeps it, a document navigation wipes it.
    await cncjs.page.evaluate(() => {
      window.__routeProbe = 'kept';
    });

    await cncjs.page.locator('a[href$="/settings/about"]').click();
    await expect(cncjs.page).toHaveURL(/\/settings\/about$/);

    expect(await cncjs.page.evaluate(() => window.__routeProbe)).toBe('kept');

    // The About section reports the running version.
    await expect(settingsSection(cncjs.page).getByText(/\d+\.\d+\.\d+/).first()).toBeVisible();

    cncjs.expectNoPageErrors();
  });
});
