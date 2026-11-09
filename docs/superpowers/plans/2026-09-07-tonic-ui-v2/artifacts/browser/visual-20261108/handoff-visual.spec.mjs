import { test, expect, openWorkspace } from '../support/fixtures.mjs';

test('handoff visual checks at 1439px', async ({ page }) => {
  await page.setViewportSize({ width: 1439, height: 900 });
  await openWorkspace(page);
  const nav = page.locator('nav');
  await expect(nav).toHaveCSS('width', '72px');
  await page.screenshot({ path: 'output/e2e/handoff-1439.png' });
  await nav.locator('a').filter({ hasText: /^Administration$/ }).hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect.poll(async () => page.getByRole('menu').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(200);
  await page.screenshot({ path: 'output/e2e/handoff-flyout.png' });
  const panes = page.locator('main').locator('div').filter({ has: page.locator('[data-widget-id="connection"]') });
  const result = await page.evaluate(() => [...document.querySelectorAll('main *')]
    .filter(element => element.scrollHeight > element.clientHeight + 30 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY))
    .map(element => {
      element.scrollTop = 100;
      return { scrollTop: element.scrollTop, max: element.scrollHeight - element.clientHeight };
    }));
  expect(result.filter(item => item.scrollTop > 0).length).toBeGreaterThanOrEqual(2);
  expect(await panes.count()).toBeGreaterThan(0);
});
