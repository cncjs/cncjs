/* Panel toggles and widget screenshots must settle before the next iteration. */
/* eslint-disable no-await-in-loop */
import { test, expect, openWorkspace, widget } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const ids = ['connection', 'console', 'custom', 'grbl', 'marlin', 'smoothie', 'tinyg', 'webcam', 'axes', 'gcode', 'macro', 'autolevel', 'probe', 'tool', 'spindle', 'laser', 'visualizer'];

for (const width of [1440, 1280, 1024, 800, 390]) {
  test(`layout: ${width}px keeps widget controls inside usable cards`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await openWorkspace(page);
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', testInfo.project.name);
    await expect(widget(page, 'visualizer').locator('canvas')).toBeVisible();
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      workflowBottom: document.querySelector('[aria-label="G-code workflow toolbar"]').getBoundingClientRect().bottom,
      canvasTop: document.querySelector('[aria-label="3D Visualizer"] canvas').getBoundingClientRect().top,
      baud: (() => {
        const field = document.querySelector('[data-test="connection-baud-rate"]');
        const button = field.querySelector('button');
        return { field: field.getBoundingClientRect().width, button: button.getBoundingClientRect().width };
      })(),
      axisBorders: [...document.querySelectorAll('[data-widget-id="axes"] th, [data-widget-id="axes"] td')]
        .map(cell => parseFloat(getComputedStyle(cell).borderRightWidth)),
      inputGroups: [...document.querySelectorAll('[data-tonic="InputGroup"]')]
        .filter(group => group.offsetHeight > 0)
        .map(group => ({
          bounds: group.getBoundingClientRect().toJSON(),
          children: [...group.children].map(child => child.getBoundingClientRect().toJSON()),
        })),
      widgets: [...document.querySelectorAll('[data-widget-id]')].map(element => ({
        id: element.dataset.widgetId,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
      })),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.workflowBottom, 'Workflow controls stay above the coordinate canvas').toBeLessThanOrEqual(geometry.canvasTop);
    expect(Math.abs(geometry.baud.button - geometry.baud.field), 'Baud selector fills its field').toBeLessThanOrEqual(1);
    const controllerButton = await widget(page, 'connection').getByRole('button', { name: 'Grbl', exact: true }).boundingBox();
    const axisButton = await widget(page, 'axes').getByRole('button', { name: 'Move X forward', exact: true }).boundingBox();
    expect(controllerButton.height, 'Controller selection remains easy to hit').toBeGreaterThanOrEqual(32);
    expect(axisButton.height, 'Axis action target height').toBeGreaterThanOrEqual(32);
    expect(axisButton.width, 'Axis action target width').toBeGreaterThanOrEqual(24);
    for (const border of geometry.axisBorders) {
      expect(border, 'Axes table cell divider').toBeGreaterThanOrEqual(1);
    }
    for (const group of geometry.inputGroups) {
      expect(group.children[0].left).toBeGreaterThanOrEqual(group.bounds.left - 1);
      expect(group.children.at(-1).right).toBeLessThanOrEqual(group.bounds.right + 1);
      for (let index = 1; index < group.children.length; index += 1) {
        const gap = group.children[index].left - group.children[index - 1].right;
        expect(gap, 'Composite input segments share their borders').toBeGreaterThanOrEqual(-2);
        expect(gap, 'Composite input segments remain joined').toBeLessThanOrEqual(1);
      }
    }
    expect(geometry.widgets.map(item => item.id).sort()).toEqual([...ids].sort());
    for (const item of geometry.widgets) {
      expect(item.width, `${item.id}: card must not be squeezed`).toBeGreaterThanOrEqual(294);
      expect(item.scrollWidth, `${item.id}: horizontal overflow`).toBeLessThanOrEqual(item.width + 1);
    }
    // Horizontal scrolling on small screens must still expose each panel action.
    for (const side of ['left', 'right']) {
      await page.getByRole('button', { name: `Hide ${side} panel`, exact: true }).click();
      await expect(page.getByRole('button', { name: `Show ${side} panel`, exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Show ${side} panel`, exact: true }).click();
    }
  });
}

test('layout: rendered WebGL canvas inherits the selected surface, not an opaque white clear color', async ({ page }, testInfo) => {
  await openWorkspace(page);
  const canvas = widget(page, 'visualizer').locator('[aria-label="3D Visualizer"] canvas');
  await expect(canvas).toBeVisible();
  const appearance = await canvas.evaluate(element => {
    const gl = element.getContext('webgl') || element.getContext('webgl2');
    let surface = element;
    while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') {
      surface = surface.parentElement;
    }
    return {
      alpha: gl.getParameter(gl.COLOR_CLEAR_VALUE)[3],
      surface: getComputedStyle(surface).backgroundColor,
    };
  });
  expect(appearance.alpha).toBe(0);
  const rgb = appearance.surface.match(/[\d.]+/g).slice(0, 3).map(Number);
  const brightness = rgb.reduce((sum, value) => sum + value, 0) / 3;
  if (testInfo.project.name === 'dark') {
    expect(brightness).toBeLessThan(64);
  } else {
    expect(brightness).toBeGreaterThan(200);
  }
});

test('layout: every widget has a mode-separated review screenshot', async ({ page }, testInfo) => {
  await openWorkspace(page);
  for (const id of ids) {
    const card = widget(page, id);
    await card.scrollIntoViewIfNeeded();
    const bounds = await card.boundingBox();
    expect(bounds.width, `${id}: usable widget width`).toBeGreaterThanOrEqual(294);
    await capture(card, testInfo, id);
  }
});
