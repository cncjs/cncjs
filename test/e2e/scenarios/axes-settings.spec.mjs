import { test, expect, openWorkspace, widget } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const openSettings = async page => {
  await openWorkspace(page);
  await widget(page, 'axes').getByRole('button', { name: 'More options', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
  await menu.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  return page.getByRole('dialog').first();
};

const expectFooterGap = async dialog => {
  const cancel = await dialog.getByRole('button', { name: 'Cancel', exact: true }).boundingBox();
  const ok = await dialog.getByRole('button', { name: 'OK', exact: true }).boundingBox();
  expect(ok.x - cancel.x - cancel.width).toBe(8);
};

test('Axes nested command editors validate, cancel, create and update drafts without executing commands', async ({ page }, testInfo) => {
  const writes = [];
  await page.route(/\/api\/mdi\/?(\?.*)?$/, route => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().postDataJSON());
    }
    return route.fulfill({ json: { records: [] } });
  });
  const settings = await openSettings(page);
  await settings.getByRole('tab', { name: 'Custom Commands', exact: true }).click();
  await settings.getByRole('button', { name: 'New', exact: true }).click();
  let editor = page.getByRole('dialog').last();
  await expectFooterGap(editor);
  await editor.getByRole('button', { name: 'OK', exact: true }).click();
  await capture(editor, testInfo, 'axes-command-new');
  await expect(editor.getByText('This field is required.', { exact: true })).toHaveCount(2);
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Draft command');
  await editor.getByRole('textbox', { name: 'Command', exact: true }).fill('G0 X10');
  const width = editor.getByRole('slider', { name: 'Button width', exact: true });
  await width.focus();
  await page.keyboard.press('ArrowRight');
  await expect(width).toHaveAttribute('aria-valuenow', '7');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(settings).toContainText('No data to display');
  await settings.getByRole('button', { name: 'New', exact: true }).click();
  editor = page.getByRole('dialog').last();
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Draft command');
  await editor.getByRole('textbox', { name: 'Command', exact: true }).fill('G0 X10');
  await editor.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(settings).toContainText('Draft command');
  await settings.getByRole('button', { name: 'Update', exact: true }).click();
  editor = page.getByRole('dialog').last();
  await expectFooterGap(editor);
  await expect(editor.getByRole('textbox', { name: 'Command', exact: true })).toHaveValue('G0 X10');
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Updated draft');
  await editor.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(settings).toContainText('Updated draft');
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(writes).toEqual([]);
});

test('ShuttleXpress range handles remain ordered and keyboard adjustable, and canceled changes are discarded', async ({ page }, testInfo) => {
  await page.route(/\/api\/mdi\/?(\?.*)?$/, route => route.fulfill({ json: { records: [] } }));
  let settings = await openSettings(page);
  await settings.getByRole('tab', { name: 'ShuttleXpress', exact: true }).click();
  const minimum = settings.getByRole('slider', { name: 'Minimum feed rate', exact: true });
  const maximum = settings.getByRole('slider', { name: 'Maximum feed rate', exact: true });
  await capture(settings, testInfo, 'axes-shuttlexpress');
  const original = await minimum.getAttribute('aria-valuenow');
  await minimum.focus();
  await page.keyboard.press('ArrowRight');
  await expect(minimum).toHaveAttribute('aria-valuenow', String(Number(original) + 50));
  const beforeDrag = Number(await minimum.getAttribute('aria-valuenow'));
  const handle = await minimum.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Number(await minimum.getAttribute('aria-valuenow'))).toBeGreaterThan(beforeDrag);
  await minimum.focus();
  await page.keyboard.press('End');
  expect(Number(await minimum.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(Number(await maximum.getAttribute('aria-valuenow')));
  await maximum.focus();
  await page.keyboard.press('Home');
  expect(Number(await maximum.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(Number(await minimum.getAttribute('aria-valuenow')));
  const overshoot = settings.getByRole('slider', { name: 'Distance Overshoot', exact: true });
  await overshoot.focus();
  await page.keyboard.press('ArrowRight');
  await expect(overshoot).toHaveAttribute('aria-valuenow', '1.01');
  await settings.getByRole('button', { name: 'Repeat Rate', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
  await page.getByRole('menuitem', { name: '15 Times per Second', exact: true }).click();
  await expect(settings).toContainText('Repeat Rate: 15Hz');
  const handleStyles = await minimum.evaluate(element => {
    const style = getComputedStyle(element);
    return { width: style.width, opacity: style.opacity, background: style.backgroundColor };
  });
  expect(handleStyles.width).toBe('16px');
  expect(handleStyles.opacity).toBe('1');
  const trackColors = await settings.locator('.rc-slider').first().evaluate(element => ({
    rail: getComputedStyle(element.querySelector('.rc-slider-rail')).backgroundColor,
    selected: getComputedStyle(element.querySelector('.rc-slider-track')).backgroundColor,
  }));
  expect(trackColors.selected).not.toBe(trackColors.rail);
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  settings = await openSettings(page);
  await settings.getByRole('tab', { name: 'ShuttleXpress', exact: true }).click();
  await expect(settings.getByRole('slider', { name: 'Minimum feed rate', exact: true })).toHaveAttribute('aria-valuenow', original);
  await expect(settings.getByRole('slider', { name: 'Distance Overshoot', exact: true })).toHaveAttribute('aria-valuenow', '1');
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
});
