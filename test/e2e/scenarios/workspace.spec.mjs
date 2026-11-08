/* Widget panels and drag steps must settle between iterations. */
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
const getWidgetIds = page => page.evaluate(() => [...document.querySelectorAll('[data-widget-id]')].map(element => element.getAttribute('data-widget-id')));
const getMinimizedIds = async page => Object.entries((await getState(page)).widgets || {})
  .filter(([, value]) => value?.minimized)
  .map(([id]) => id);

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

async function openWidgetManager(page, position = 'first') {
  const buttons = page.getByRole('button', { name: /^Manage Widgets \(/ });
  const button = position === 'last' ? buttons.last() : buttons.first();
  await button.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Widgets', { exact: true })).toBeVisible();
  return dialog;
}

const widgetToggle = (page, id, name) => widget(page, id)
  .getByRole('toolbar', { name: 'Widget controls' })
  .getByRole('button', { name });

// Tonic `Checkbox` keeps its input visually hidden, so users toggle the wrapping label instead.
const checkboxLabel = checkbox => checkbox.locator('xpath=ancestor::label[1]');

async function setChecked(checkbox, checked) {
  if ((await checkbox.isChecked()) !== checked) {
    await checkboxLabel(checkbox).click();
  }
  await expect(checkbox).toBeChecked({ checked });
}

test.describe('workspace panels', () => {
  test('hides and shows the left and right panels with persisted state', async ({ page }) => {
    await openWorkspace(page);

    await page.getByRole('button', { name: 'Hide left panel' }).click();
    await expect(page.getByRole('button', { name: 'Show left panel' })).toBeVisible();
    await expect(widget(page, 'connection')).toBeHidden();
    await expect.poll(async () => (await getState(page)).workspace.container.primary.show).toBe(false);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Show left panel' })).toBeVisible();
    await expect(widget(page, 'connection')).toBeHidden();
    await expect.poll(async () => (await getState(page)).workspace.container.primary.show).toBe(false);

    await page.getByRole('button', { name: 'Show left panel' }).click();
    await expect(widget(page, 'connection')).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.primary.show).toBe(true);

    await page.getByRole('button', { name: 'Hide right panel' }).click();
    await expect(page.getByRole('button', { name: 'Show right panel' })).toBeVisible();
    await expect(widget(page, 'axes')).toBeHidden();
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.show).toBe(false);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Show right panel' })).toBeVisible();
    await expect(widget(page, 'axes')).toBeHidden();
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.show).toBe(false);

    await page.getByRole('button', { name: 'Show right panel' }).click();
    await expect(widget(page, 'axes')).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.show).toBe(true);
  });

  test('collapses and expands all widgets in both panels', async ({ page }) => {
    await openWorkspace(page);

    await page.getByRole('button', { name: 'Collapse all left panel widgets' }).click();
    for (const id of ['connection', 'console', 'webcam', 'custom']) {
      const toggle = widgetToggle(page, id, 'Expand');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await expect.poll(() => getMinimizedIds(page)).toEqual(expect.arrayContaining(['connection', 'console', 'webcam', 'custom']));

    await page.getByRole('button', { name: 'Expand all left panel widgets' }).click();
    for (const id of ['connection', 'console', 'webcam', 'custom']) {
      await expect(widgetToggle(page, id, 'Collapse')).toHaveAttribute('aria-expanded', 'true');
    }
    await expect.poll(() => getMinimizedIds(page)).not.toEqual(expect.arrayContaining(['connection', 'console', 'webcam', 'custom']));

    await page.getByRole('button', { name: 'Collapse all right panel widgets' }).click();
    for (const id of ['axes', 'gcode', 'macro', 'probe', 'spindle', 'laser']) {
      const toggle = widgetToggle(page, id, 'Expand');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await expect.poll(() => getMinimizedIds(page)).toEqual(expect.arrayContaining(['axes', 'gcode', 'macro', 'probe', 'spindle', 'laser']));

    await page.getByRole('button', { name: 'Expand all right panel widgets' }).click();
    for (const id of ['axes', 'gcode', 'macro', 'probe', 'spindle', 'laser']) {
      await expect(widgetToggle(page, id, 'Collapse')).toHaveAttribute('aria-expanded', 'true');
    }
    await expect.poll(() => getMinimizedIds(page)).not.toEqual(expect.arrayContaining(['axes', 'gcode', 'macro', 'probe', 'spindle', 'laser']));
  });
});

test.describe('workspace widget managers', () => {
  test('primary manager removes and re-adds a widget with reload persistence', async ({ page }) => {
    const writes = trackApiWrites(page);
    await openWorkspace(page);

    let dialog = await openWidgetManager(page, 'first');
    const custom = dialog.getByRole('checkbox', { name: 'Custom Widget' });
    await expect(custom).toBeChecked();
    await setChecked(custom, false);
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(widget(page, 'custom')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Manage Widgets (1)' }).first()).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.primary.widgets).not.toContain('custom');

    await page.reload();
    await openWorkspace(page);
    await expect(widget(page, 'custom')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Manage Widgets (1)' }).first()).toBeVisible();

    dialog = await openWidgetManager(page, 'first');
    await expect(dialog.getByRole('checkbox', { name: 'Custom Widget' })).not.toBeChecked();
    await setChecked(dialog.getByRole('checkbox', { name: 'Custom Widget' }), true);
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(widget(page, 'custom')).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.primary.widgets).toContain('custom');
    expect(writes).toEqual([]);
  });

  test('secondary manager cancels changes, then removes and re-adds a widget with reload persistence', async ({ page }) => {
    const writes = trackApiWrites(page);
    await openWorkspace(page);

    let dialog = await openWidgetManager(page, 'last');
    const laser = dialog.getByRole('checkbox', { name: 'Laser Widget' });
    await expect(laser).toBeChecked();
    await setChecked(laser, false);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(widget(page, 'laser')).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.widgets).toContain('laser');

    dialog = await openWidgetManager(page, 'last');
    await setChecked(dialog.getByRole('checkbox', { name: 'Laser Widget' }), false);
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(widget(page, 'laser')).toHaveCount(0);
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.widgets).not.toContain('laser');

    await page.reload();
    await openWorkspace(page);
    await expect(widget(page, 'laser')).toHaveCount(0);

    dialog = await openWidgetManager(page, 'last');
    await expect(dialog.getByRole('checkbox', { name: 'Laser Widget' })).not.toBeChecked();
    await setChecked(dialog.getByRole('checkbox', { name: 'Laser Widget' }), true);
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);

    await expect(widget(page, 'laser')).toBeVisible();
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.widgets).toContain('laser');
    expect(writes).toEqual([]);
  });

  test('forks and removes a console widget, including modal cancellation', async ({ page }) => {
    const writes = trackApiWrites(page);
    await openWorkspace(page);

    const consoleWidget = widget(page, 'console');
    const forkedWidgets = page.locator('[data-widget-id^="console:"]');

    await consoleWidget.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Fork Widget' }).click();
    let dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to fork this widget?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(forkedWidgets).toHaveCount(0);

    await consoleWidget.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Fork Widget' }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to fork this widget?' });
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(forkedWidgets).toHaveCount(1);

    const forkedId = await forkedWidgets.getAttribute('data-widget-id');
    expect(forkedId).toMatch(/^console:/);
    await expect.poll(async () => (await getState(page)).widgets[forkedId]).toBeTruthy();

    await page.reload();
    await openWorkspace(page);
    await expect(forkedWidgets).toHaveCount(1);

    await forkedWidgets.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Remove Widget' }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to remove this widget?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(forkedWidgets).toHaveCount(1);

    await forkedWidgets.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Remove Widget' }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to remove this widget?' });
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(forkedWidgets).toHaveCount(0);
    await expect.poll(async () => (await getState(page)).widgets[forkedId]).toBeUndefined();

    expect(writes).toEqual([]);
  });

  test('dragging a widget handle reorders the primary panel and persists', async ({ page }) => {
    await openWorkspace(page);

    await page.evaluate(() => {
      const element = document.querySelector('[data-widget-id="console"]');
      let parent = element?.parentElement;
      while (parent && getComputedStyle(parent).overflowY !== 'auto') {
        parent = parent.parentElement;
      }
      if (parent) {
        parent.scrollTop = 0;
      }
    });

    const handle = widget(page, 'console').locator('.sortable-handle');
    const target = widget(page, 'connection');
    await expect(handle).toBeVisible();

    const handleBox = await handle.boundingBox();
    const targetBox = await target.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    if (!handleBox || !targetBox) {
      throw new Error('Unable to measure drag handles');
    }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endY = targetBox.y + 20;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    for (let step = 1; step <= 12; step += 1) {
      await page.mouse.move(startX, startY + ((endY - startY) * step) / 12);
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);

    await expect.poll(async () => (await getWidgetIds(page)).slice(0, 2)).toEqual(['console', 'connection']);
    await expect.poll(async () => (await getState(page)).workspace.container.primary.widgets.slice(0, 2)).toEqual(['console', 'connection']);

    await page.reload();
    await openWorkspace(page);
    await expect.poll(async () => (await getWidgetIds(page)).slice(0, 2)).toEqual(['console', 'connection']);
  });
});
