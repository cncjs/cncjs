/* Navigation menus and viewport changes must settle between iterations. */
/* eslint-disable no-await-in-loop */
import {
  test,
  expect,
  openWorkspace,
  widget,
} from '../support/fixtures.mjs';

const getState = page => page.evaluate(() => {
  const { settings, workspace, widgets } = JSON.parse(localStorage.getItem('cnc')).state;
  return { settings, workspace, widgets };
});
const getSettings = async page => (await getState(page)).settings;
const navMetrics = page => page.evaluate(() => ({
  left: document.querySelector('main')?.getBoundingClientRect().left,
  width: document.querySelector('nav')?.getBoundingClientRect().width,
}));

// Navigation entries are Tonic `Link` elements rendered without an `href`, so they expose no link role.
const navItem = (scope, title) => scope.getByText(title, { exact: true });
const navLink = (scope, title) => scope.locator(`xpath=.//a[normalize-space(.) = "${title}"]`);

// Tonic `Checkbox` keeps its input visually hidden, so users toggle the wrapping label instead.
const checkboxLabel = checkbox => checkbox.locator('xpath=ancestor::label[1]');

async function setChecked(checkbox, checked) {
  if ((await checkbox.isChecked()) !== checked) {
    await checkboxLabel(checkbox).click();
  }
  await expect(checkbox).toBeChecked({ checked });
}

async function openApplicationMenu(page) {
  await page.getByRole('button', { name: 'Application menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

async function expectPopup(page, action, urlPart) {
  const popupPromise = page.waitForEvent('popup');
  await action();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toContain(urlPart);
  await popup.close();
}

function expectNoApiWrites(page, writes) {
  expect(writes).toEqual([]);
}

function trackApiWrites(page) {
  const writes = [];
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    if (
      method !== 'GET' &&
      url.includes('/api/') &&
      !url.includes('/api/signin') &&
      !url.includes('/api/gcode')
    ) {
      writes.push(`${method} ${url}`);
    }
  });
  return writes;
}

async function mockRecordReads(page, resource, record) {
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.route(new RegExp(`/api/${resource}(\\?.*)?$`), route => {
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        records: [record],
        pagination: { totalRecords: 1 },
      }),
    });
  });
  await page.route(new RegExp(`/api/${resource}/${escapeRegExp(record.id)}$`), route => {
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(record),
    });
  });
}

test.describe('application header and account menu', () => {
  test('quick access toolbar exposes six disconnected-safe commands and stays reachable on narrow screens', async ({ page }) => {
    await openWorkspace(page);
    const toolbar = page.getByRole('toolbar', { name: 'Quick access toolbar' });
    for (const width of [1440, 800, 390]) {
      await page.setViewportSize({ width, height: 823 });
      const header = await page.locator('header').boundingBox();
      if (width === 1440) {
        const bounds = await toolbar.evaluate(element => ({
          toolbar: element.getBoundingClientRect().toJSON(),
          container: element.parentElement.getBoundingClientRect().toJSON(),
        }));
        const commands = await page.getByRole('button', { name: 'Commands', exact: true }).boundingBox();
        expect(Math.abs(bounds.toolbar.right - bounds.container.right)).toBeLessThanOrEqual(1);
        expect(commands.x - bounds.toolbar.right).toBeGreaterThanOrEqual(16);
      }
      for (const name of ['Cycle Start', 'Feedhold', 'Homing', 'Sleep', 'Unlock', 'Reset']) {
        const button = toolbar.getByRole('button', { name, exact: true });
        await expect(button).toBeDisabled();
        await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox();
        const scroller = await toolbar.evaluate(element => element.parentElement.getBoundingClientRect().toJSON());
        expect(box.x).toBeGreaterThanOrEqual(scroller.left - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(scroller.right + 1);
        expect(box.height).toBeGreaterThanOrEqual(32);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(Math.abs(box.y + box.height / 2 - header.y - header.height / 2)).toBeLessThanOrEqual(1);
      }
      await expect(page.getByRole('button', { name: 'Application menu' })).toBeInViewport();
    }
    await page.goto('/#/administration/commands');
    await expect(toolbar).toHaveCount(0);
  });

  test('shows product identity, page title, language badge, and opens release notes', async ({ page }) => {
    await openWorkspace(page);

    const header = page.locator('header');
    await expect(header).toContainText('CNCjs');
    const languageBadge = header.getByText('en', { exact: true });
    await expect(languageBadge).toBeVisible();
    await expect(languageBadge).toHaveCSS('text-transform', 'uppercase');
    await expect(header.getByText('Workspace', { exact: true })).toBeVisible();

    await expectPopup(
      page,
      () => page.getByRole('button', { name: /View release notes$/ }).click(),
      'github.com/cncjs/cncjs/releases',
    );
  });

  test('account menu exposes appearance, language, About, Help, and Report an issue', async ({ page }) => {
    await openWorkspace(page);
    await openApplicationMenu(page);

    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: /^Appearance:/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /^Language:/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'About' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Help' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Report an issue' })).toBeVisible();

    await expectPopup(
      page,
      () => menu.getByRole('menuitem', { name: 'Help' }).click(),
      'github.com/cncjs/cncjs/wiki',
    );

    await openApplicationMenu(page);
    await expectPopup(
      page,
      () => page.getByRole('menu').getByRole('menuitem', { name: 'Report an issue' }).click(),
      'github.com/cncjs/cncjs/issues',
    );

    await openApplicationMenu(page);
    await page.getByRole('menu').getByRole('menuitem', { name: 'About' }).click();
    await expect(page.locator('header')).toContainText('About');
    await expect(page.getByText('A web-based interface for CNC milling controller running Grbl, Marlin, Smoothieware, or TinyG')).toBeVisible();
  });

  test('appearance submenu switches theme, persists it, and restores the inherited appearance', async ({ page }, testInfo) => {
    const inherited = testInfo.project.use.colorScheme || 'light';
    const opposite = inherited === 'dark' ? 'light' : 'dark';
    const inheritedLabel = inherited === 'dark' ? 'Dark theme' : 'Light theme';
    const oppositeLabel = opposite === 'dark' ? 'Dark theme' : 'Light theme';

    await openWorkspace(page);
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', inherited);
    await expect.poll(async () => (await getSettings(page)).appearance).toBe(inherited);

    await openApplicationMenu(page);
    const appearanceItem = page.getByRole('menuitem', { name: /^Appearance:/ });
    await expect(appearanceItem).toContainText(inherited === 'dark' ? 'Dark' : 'Light');
    await expect(appearanceItem).not.toContainText('Device theme');
    await appearanceItem.click();
    await expect(page.getByText('Setting applies to this browser only')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Use device theme' })).toBeVisible();

    await page.getByRole('menuitem', { name: oppositeLabel }).click();
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', opposite);
    await expect.poll(async () => (await getSettings(page)).appearance).toBe(opposite);

    await page.reload();
    await openWorkspace(page);
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', opposite);
    await expect.poll(async () => (await getSettings(page)).appearance).toBe(opposite);

    await openApplicationMenu(page);
    await page.getByRole('menuitem', { name: /^Appearance:/ }).click();
    await page.getByRole('menuitem', { name: inheritedLabel }).click();

    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', inherited);
    await expect.poll(async () => (await getSettings(page)).appearance).toBe(inherited);
  });

  test('language submenu switches to German and back to English', async ({ page }) => {
    await openWorkspace(page);
    await openApplicationMenu(page);

    const languageItem = page.getByRole('menuitem', { name: /^Language:/ });
    await expect(languageItem).toContainText('English (US)');
    await languageItem.click();
    await expect(page.getByRole('menuitem', { name: 'Deutsch', exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Deutsch', exact: true }).click();

    await expect(page.locator('header')).toContainText('Arbeitsbereich', { timeout: 20_000 });
    await expect.poll(async () => (await getSettings(page)).language).toBe('de');

    await openApplicationMenu(page);
    const germanLanguageItem = page.getByRole('menuitem', { name: /^Sprache:/ });
    await expect(germanLanguageItem).toContainText('Deutsch');
    await germanLanguageItem.click();
    await page.getByRole('menuitem', { name: 'English (US)', exact: true }).click();

    await expect(page.locator('header')).toContainText('Workspace', { timeout: 20_000 });
    await expect.poll(async () => (await getSettings(page)).language).toBe('en');
  });
});

test.describe('About page', () => {
  test('shows product information, update state, and checks for updates without writing state', async ({ page }) => {
    let latestVersion = '1.0.0';
    await page.route('**/api/version/latest', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: latestVersion }),
    }));
    await page.route('**/api/state', route => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkForUpdates: true }),
      });
    });

    const writes = trackApiWrites(page);
    await openWorkspace(page);
    await openApplicationMenu(page);
    await page.getByRole('menu').getByRole('menuitem', { name: 'About' }).click();

    const header = page.locator('header');
    await expect(header).toContainText('About');
    await expect(page.getByText('CNCjs 2.0.0-dev')).toBeVisible();
    await expect(page.getByText('A web-based interface for CNC milling controller running Grbl, Marlin, Smoothieware, or TinyG')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', 'https://github.com/cncjs/cncjs/wiki');
    await expect(page.getByRole('checkbox', { name: 'Automatically check for updates' })).toBeChecked();
    await expect(page.getByText('CNCjs is up to date.')).toBeVisible();

    latestVersion = '9.9.9';
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await expect(page.getByText('A new version of CNCjs is available: 9.9.9')).toBeVisible();
    await expect(page.getByRole('link', { name: /Latest version/ })).toHaveAttribute('href', 'https://github.com/cncjs/cncjs/releases');

    await expectPopup(
      page,
      () => page.getByRole('button', { name: 'Downloads' }).click(),
      'github.com/cncjs/cncjs/releases',
    );

    await expectNoApiWrites(page, writes);
  });
});

test.describe('navigation', () => {
  test('expands and collapses the mini navigation and routes through the administration submenu', async ({ page }) => {
    await openWorkspace(page);

    await expect.poll(async () => (await navMetrics(page)).width).toBe(72);
    await expect.poll(async () => (await navMetrics(page)).left).toBe(72);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect.poll(async () => (await navMetrics(page)).width).toBe(240);
    await expect.poll(async () => (await navMetrics(page)).left).toBe(240);

    const nav = page.locator('nav');
    for (const title of ['Workspace', 'Administration', 'Commands', 'Events', 'Macros', 'Machine Profiles', 'General Settings', 'User Accounts', 'Workspace Settings']) {
      await expect(navItem(nav, title)).toBeVisible();
    }
    for (const title of ['Workspace', 'Commands', 'Events', 'Macros', 'Machine Profiles', 'General Settings', 'User Accounts', 'Workspace Settings']) {
      await expect(navLink(nav, title)).toHaveCount(1);
    }

    await navLink(nav, 'Commands').click();
    await expect(page.locator('header')).toContainText('Commands');
    await expect(navLink(nav, 'Commands')).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect.poll(async () => (await navMetrics(page)).width).toBe(72);

    // The collapsed mini navigation reveals the administration submenu on hover.
    await navLink(nav, 'Administration').hover();
    await expect(page.getByRole('menu')).toBeVisible();
    for (const title of ['Commands', 'Events', 'Macros', 'Machine Profiles', 'General Settings', 'User Accounts', 'Workspace Settings']) {
      await expect(page.getByRole('menuitem', { name: title })).toBeVisible();
    }
    await page.getByRole('menuitem', { name: 'General Settings' }).click();
    await expect(page.locator('header')).toContainText('General Settings');
  });

  test('uses the side navigation drawer on tablet and mobile layouts', async ({ page }) => {
    await openWorkspace(page);

    await page.setViewportSize({ width: 1024, height: 1000 });
    await expect(page.locator('nav')).toHaveCount(1);
    await expect.poll(async () => (await navMetrics(page)).width).toBe(72);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Main navigation' });
    await expect(drawer).toBeVisible();
    await expect(navItem(drawer, 'Commands')).toBeVisible();
    await navItem(drawer, 'Commands').click();
    await expect(page.locator('header')).toContainText('Commands');
    if (await drawer.isVisible()) {
      await drawer.getByRole('button', { name: 'Close navigation' }).click();
    }
    await expect(drawer).toHaveCount(0);

    await page.setViewportSize({ width: 600, height: 1000 });
    await expect(page.locator('nav')).toHaveCount(0);
    await expect.poll(async () => (await navMetrics(page)).left).toBe(0);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(drawer).toBeVisible();
    await navItem(drawer, 'Workspace Settings').click();
    await expect(page.locator('header')).toContainText('Workspace Settings');
    if (await drawer.isVisible()) {
      await drawer.getByRole('button', { name: 'Close navigation' }).click();
    }
    await expect(drawer).toHaveCount(0);
  });

  test('returning to the workspace from administration keeps the visualizer sized', async ({ page }) => {
    await openWorkspace(page);

    const zoom = () => page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__?.engines?.[0]?.cameraZoom ?? 0);
    await expect.poll(zoom).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const nav = page.locator('nav');
    await navLink(nav, 'Commands').click();
    await expect(page.locator('header')).toContainText('Commands');

    await navLink(nav, 'Workspace').click();
    await expect(page.locator('header')).toContainText('Workspace');
    await expect(widget(page, 'visualizer')).toBeVisible();

    await expect.poll(zoom, { timeout: 10_000 }).toBeGreaterThan(0);
    const metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__?.engines?.[0]);
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.height).toBeGreaterThan(0);
    expect(metrics.canvasAttached).toBe(true);
  });
});

test.describe('administration routes', () => {
  test('Commands: add validation, update entry, and bulk delete cancellation', async ({ page }) => {
    const writes = trackApiWrites(page);
    await mockRecordReads(page, 'commands', {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'E2E Command',
      action: 'echo e2e',
      enabled: true,
      mtime: '2024-01-01T00:00:00.000Z',
    });
    await page.goto('/#/administration/commands');
    await expect(page.locator('header')).toContainText('Commands');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Command')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(2);
    await expect(dialog.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('textarea[name="action"]')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    const rows = page.locator('main [role="table"]:visible [role="rowgroup"]').nth(1).getByRole('row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('E2E Command');
    await rows.first().getByRole('button', { name: 'E2E Command' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Command Details')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await setChecked(rows.first().getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Count: 1')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);

    await expectNoApiWrites(page, writes);
  });

  test('Events: add validation and cancel', async ({ page }) => {
    const writes = trackApiWrites(page);
    await page.goto('/#/administration/events');
    await expect(page.locator('header')).toContainText('Events');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Event')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(3);
    await expect(dialog.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('input[name="trigger"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('textarea[name="action"]')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expectNoApiWrites(page, writes);
  });

  test('Macros: add validation, update entry, and bulk delete cancellation', async ({ page }) => {
    const writes = trackApiWrites(page);
    await mockRecordReads(page, 'macros', {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'E2E Macro',
      action: 'G0 X0 Y0',
      mtime: '2024-01-01T00:00:00.000Z',
    });
    await page.goto('/#/administration/macros');
    await expect(page.locator('header')).toContainText('Macros');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Macro')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(2);
    await expect(dialog.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('textarea[name="action"]')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    const rows = page.locator('main [role="table"]:visible [role="rowgroup"]').nth(1).getByRole('row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('E2E Macro');
    await rows.first().getByRole('button', { name: 'E2E Macro' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Macro Details')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await setChecked(rows.first().getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(dialog.getByText('Count: 1')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);

    await expectNoApiWrites(page, writes);
  });

  test('Machine Profiles: validates required name and limit ordering', async ({ page }) => {
    const writes = trackApiWrites(page);
    await page.goto('/#/administration/machine-profiles');
    await expect(page.locator('header')).toContainText('Machine Profiles');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Machine')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('This field is required.')).toHaveCount(1);

    await dialog.getByRole('textbox', { name: /^Machine name/ }).fill('E2E Machine');
    await dialog.getByRole('spinbutton', { name: /^X min/ }).fill('10');
    await dialog.getByRole('spinbutton', { name: /^X max/ }).fill('5');
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('Maximum must be greater than or equal to minimum.')).toBeVisible();
    await expect(dialog.locator('input[name="limits.xmax"]')).toHaveAttribute('aria-invalid', 'true');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expectNoApiWrites(page, writes);
  });

  test('General Settings: edits stay local until saved and reload restores server state', async ({ page }) => {
    const writes = trackApiWrites(page);
    await page.goto('/#/administration/general-settings');
    await expect(page.locator('header')).toContainText('General Settings');

    const checkbox = page.getByRole('checkbox', { name: 'Continue execution when an error is detected in the G-code program' });
    await expect(checkbox).toBeEnabled();
    const initial = await checkbox.isChecked();
    await setChecked(checkbox, !initial);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator('header')).toContainText('General Settings');
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).toBeChecked({ checked: initial });

    await expectNoApiWrites(page, writes);
  });

  test('User Accounts: add validation, update entry, and bulk delete cancellation', async ({ page }) => {
    const writes = trackApiWrites(page);
    await mockRecordReads(page, 'users', {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'E2E User',
      enabled: true,
      mtime: '2024-01-01T00:00:00.000Z',
    });
    await page.goto('/#/administration/user-accounts');
    await expect(page.locator('header')).toContainText('User Accounts');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New User')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(2);
    await expect(dialog.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('input[name="password"]')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    const rows = page.locator('main [role="table"]:visible [role="rowgroup"]').nth(1).getByRole('row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('E2E User');
    await rows.first().getByRole('button', { name: 'E2E User' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('User Details')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await setChecked(rows.first().getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(dialog.getByText('Count: 1')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(rows).toHaveCount(1);

    await expectNoApiWrites(page, writes);
  });

  test('Workspace Settings: exports, rejects invalid import, and cancels import and restore', async ({ page }, testInfo) => {
    const appearance = testInfo.project.use.colorScheme || 'light';
    const writes = trackApiWrites(page);
    await page.goto('/#/administration/workspace-settings');
    await expect(page.locator('header')).toContainText('Workspace Settings');
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(page.getByText('The configuration file:')).toBeVisible();
    await expect(page.getByText('********').first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^cncjs-.*\.json$/);

    const fileInput = page.locator('main input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{not valid json'),
    });
    await expect(page.getByText('Import Error').last()).toBeVisible();
    await expect(page.getByText('Invalid file format.').last()).toBeVisible();

    await fileInput.setInputFiles({
      name: 'workspace.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        version: '2.0.0-dev',
        state: { settings: { appearance, language: 'en' } },
      })),
    });
    let dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to overwrite the workspace settings?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: 'Restore Defaults' }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to restore the default settings?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await expectNoApiWrites(page, writes);
  });
});
