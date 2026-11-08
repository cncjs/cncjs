import { test, expect, openWorkspace } from '../support/fixtures.mjs';

async function readyMenu(page) {
  const menu = page.getByRole('menu').filter({ visible: true });
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
  return menu;
}

for (const resource of ['commands', 'events', 'machines', 'macros', 'users']) {
  test(`administration dropdown: ${resource} page size changes the list query and resets the page`, async ({ page }) => {
    const requests = [];
    await page.route(new RegExp(`/api/${resource}(\\?.*)?$`), route => {
      const query = new URL(route.request().url()).searchParams;
      if (query.get('paging') === 'true') {
        requests.push(Object.fromEntries(query));
      }
      return route.fulfill({ json: { records: [], pagination: { totalRecords: 125 } } });
    });
    const routeName = { machines: 'machine-profiles', users: 'user-accounts' }[resource] || resource;
    await page.goto(`/#/administration/${routeName}`);
    const main = page.locator('main');
    const toggle = main.getByRole('button', { name: /per page$/ });
    await expect(toggle).toBeEnabled();
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    const initialSize = requests[0].pageLength;
    await main.getByRole('textbox', { name: 'Page', exact: true }).fill('2');
    await expect.poll(() => requests.at(-1)?.page).toBe('2');
    await toggle.click();
    let menu = await readyMenu(page);
    await menu.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await toggle.click();
    menu = await readyMenu(page);
    const options = await menu.getByRole('menuitem').allTextContents();
    const selected = options.map(value => value.trim()).find(value => value !== initialSize && /^\d+$/.test(value));
    expect(selected).toBeTruthy();
    await menu.getByRole('menuitem', { name: selected, exact: true }).click();
    await expect(toggle).toHaveText(`${selected} per page`);
    await expect.poll(() => requests.at(-1)?.pageLength).toBe(selected);
    await expect.poll(() => requests.at(-1)?.page).toBe('1');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });
}

test('application menu dismisses on Escape and outside click and applies device-theme selection', async ({ page }, testInfo) => {
  await openWorkspace(page);
  const toggle = page.getByRole('button', { name: 'Application menu', exact: true });
  await toggle.click();
  let menu = await readyMenu(page);
  await menu.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await toggle.click();
  menu = await readyMenu(page);
  await page.locator('header').getByText('CNCjs', { exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await toggle.click();
  menu = await readyMenu(page);
  await menu.getByRole('menuitem', { name: /^Appearance:/ }).click();
  await page.getByRole('menuitem', { name: 'Use device theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', testInfo.project.name);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cnc')).state.settings.appearance)).toBe('auto');
  await page.emulateMedia({ colorScheme: testInfo.project.name === 'dark' ? 'light' : 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', testInfo.project.name === 'dark' ? 'light' : 'dark');
});

test('application appearance and language submenu Back returns to the main menu without changing preferences', async ({ page }) => {
  await openWorkspace(page);
  const preferences = () => page.evaluate(() => JSON.parse(localStorage.getItem('cnc')).state.settings);
  const before = await preferences();
  await page.getByRole('button', { name: 'Application menu', exact: true }).click();
  const menu = await readyMenu(page);
  await menu.getByRole('menuitem', { name: /^Appearance:/ }).click();
  await menu.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(menu.getByRole('menuitem', { name: /^Language:/ })).toBeVisible();
  await menu.getByRole('menuitem', { name: /^Language:/ }).click();
  await menu.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(menu.getByRole('menuitem', { name: 'About', exact: true })).toBeVisible();
  expect(await preferences()).toEqual(before);
  await menu.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('mini-navigation administration hover menu closes when the pointer leaves', async ({ page }) => {
  await openWorkspace(page);
  await page.locator('nav a').filter({ hasText: /^Administration$/ }).hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Commands', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Application menu', exact: true }).hover();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('header Commands menu supports keyboard selection and outside dismissal without executing a server command', async ({ page }) => {
  await page.route(/\/api\/commands(\?.*)?$/, route => route.fulfill({ json: { records: [] } }));
  await openWorkspace(page);
  const toggle = page.locator('header').getByRole('button', { name: 'Commands', exact: true });
  await toggle.click();
  let menu = await readyMenu(page);
  await expect(menu.getByRole('heading', { name: 'Commands', exact: true })).toBeVisible();
  await page.locator('header').getByText('CNCjs', { exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await toggle.click();
  menu = await readyMenu(page);
  await expect(menu.getByRole('heading', { name: 'Commands', exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Manage Commands', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/administration\/commands$/);
  await expect(page.getByRole('menu')).toHaveCount(0);
});
