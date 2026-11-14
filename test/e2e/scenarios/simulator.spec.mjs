/* Simulator commands must be issued and observed sequentially. */
/* eslint-disable no-await-in-loop */
import { test, expect, widget } from '../support/simulator.mjs';
import { capture } from '../support/screenshots.mjs';

const toolpath = 'G21\nG90\nG1 X10 Y5 F600\nG1 X0 Y0 F600\n';

const readVisualizer = page => page.evaluate(() => {
  const metrics = window.__CNCJS_VISUALIZER_METRICS__;
  const engine = metrics?.engines?.[0];
  if (!engine) {
    return null;
  }
  return {
    hasGCode: engine.hasGCode,
    geometryCount: engine.geometryCount,
    pivotX: engine.pivotX,
    pivotY: engine.pivotY,
    loadCount: metrics.loadCount,
    lastFixtureId: metrics.loadSamples.at(-1)?.fixtureId,
  };
});

async function upload(page, content = toolpath) {
  await widget(page, 'visualizer').locator('input[type="file"]').setInputFiles({
    name: 'e2e-toolpath.nc', mimeType: 'text/plain', buffer: Buffer.from(content),
  });
  await expect(widget(page, 'gcode')).toContainText('e2e-toolpath.nc');
  await expect(widget(page, 'visualizer').getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
}

test('simulator: quick access toolbar sends controller commands to the isolated simulator', async ({ page, simulator }) => {
  const toolbar = page.getByRole('toolbar', { name: 'Quick access toolbar' });
  for (const [name, output] of [
    ['Feedhold', 'E2E RT: !'],
    ['Cycle Start', 'E2E RT: ~'],
    ['Homing', 'CMD: $H ->'],
    ['Unlock', 'CMD: $X ->'],
    ['Sleep', 'CMD: $SLP ->'],
    ['Reset', 'E2E RT: Ctrl-X'],
  ]) {
    await toolbar.getByRole('button', { name, exact: true }).click();
    await expect.poll(() => simulator.commands.some(line => line.includes(output))).toBe(true);
  }
});

test('simulator: loaded toolpath stays visible when appearance changes', async ({ page, simulator }, testInfo) => {
  const visualizer = widget(page, 'visualizer');
  await upload(page, 'G21\nG90\nG0 X0 Y0\nG1 X40 Y20 F600\nG1 X0 Y0 F600\n');
  const canvas = visualizer.locator('[aria-label="3D Visualizer"] canvas');
  await expect(canvas).toBeVisible();
  const initial = testInfo.project.use.colorScheme;
  const opposite = initial === 'dark' ? 'light' : 'dark';
  await capture(visualizer, testInfo, 'toolpath-before-theme-switch');
  await page.getByRole('button', { name: 'Application menu' }).click();
  await page.getByRole('menuitem', { name: /^Appearance:/ }).click();
  await page.getByRole('menuitem', { name: opposite === 'dark' ? 'Dark theme' : 'Light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', opposite);
  await expect(visualizer).toContainText('e2e-toolpath.nc');
  await expect(canvas).toBeVisible();
  await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
  expect(simulator.commands.filter(line => / CMD: G(?:0|1|2|3)(?:\s|$)/.test(line))).toEqual([]);
  await capture(visualizer, testInfo, 'toolpath-after-theme-switch');
});

test('simulator: previews dimensions, executes G-code and clears the loaded file', async ({ page, simulator }, testInfo) => {
  const visualizer = widget(page, 'visualizer');
  const gcode = widget(page, 'gcode');
  await upload(page);
  await expect(gcode).toContainText('10.000 mm');
  await expect(gcode).toContainText('5.000 mm');
  await expect(visualizer).toContainText('e2e-toolpath.nc');
  await expect.poll(() => readVisualizer(page)).toEqual(expect.objectContaining({ hasGCode: true }));
  const loaded = await readVisualizer(page);
  expect(loaded.geometryCount).toBeGreaterThan(0);
  expect(loaded.pivotX).toBeCloseTo(5, 2);
  expect(loaded.pivotY).toBeCloseTo(2.5, 2);
  expect(loaded.lastFixtureId).toBe('e2e-toolpath.nc');
  const loadCount = loaded.loadCount;
  await capture(page, testInfo, 'visualizer-toolpath', { fullPage: true });
  await visualizer.getByRole('button', { name: 'Run', exact: true }).click();
  await expect.poll(() => simulator.commands.some(line => line.includes('CMD: G1 X10 Y5 F600 ->'))).toBe(true);
  await expect(visualizer.getByRole('button', { name: 'Close G-code file', exact: true })).toBeEnabled();
  await expect.poll(() => simulator.commands.some(line => line.includes('CMD: G1 X0 Y0 F600 ->'))).toBe(true);
  await visualizer.getByRole('button', { name: 'Close G-code file', exact: true }).click();
  await expect(gcode).toContainText('G-code not loaded');
  await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
  await expect.poll(() => readVisualizer(page)).toEqual(expect.objectContaining({ hasGCode: false }));
  expect((await readVisualizer(page)).loadCount).toBe(loadCount);
});

test('simulator: 3D-off dashboard keeps progress labels inside a full-height track', async ({ page, simulator }, testInfo) => {
  const visualizer = widget(page, 'visualizer');
  const toggle = visualizer.getByRole('button', { name: '3D View', exact: true }).first();
  await toggle.click();
  const dashboard = visualizer.getByLabel('G-code dashboard', { exact: true });
  const progress = dashboard.getByRole('progressbar', { name: 'G-code progress' });
  await expect(dashboard).toBeVisible();
  await expect(dashboard.getByText('G-code not loaded', { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  expect((await progress.boundingBox()).height).toBe(20);
  await expect(dashboard.locator('img')).toBeVisible();
  await upload(page);
  await expect(dashboard.getByText('e2e-toolpath.nc', { exact: true })).toBeVisible();
  await expect(dashboard.locator('[class*="line"]').filter({ hasText: 'G1 X10 Y5 F600' }).first()).toBeVisible();
  const total = String(toolpath.split('\n').length);
  await expect(progress).toHaveAttribute('aria-valuemax', total);
  const label = dashboard.getByText(`0 / ${total}`, { exact: true });
  await expect(label).toBeVisible();
  const trackBox = await progress.boundingBox();
  const labelBox = await label.boundingBox();
  expect(labelBox.y).toBeGreaterThanOrEqual(trackBox.y);
  expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(trackBox.y + trackBox.height);
  expect(Math.abs(labelBox.x + labelBox.width / 2 - trackBox.x - trackBox.width / 2)).toBeLessThanOrEqual(1);
  const bounds = await dashboard.boundingBox();
  const toolbar = await visualizer.getByRole('toolbar', { name: 'G-code workflow toolbar' }).boundingBox();
  expect(bounds.y - toolbar.y - toolbar.height).toBeLessThanOrEqual(16);
  await capture(visualizer, testInfo, 'visualizer-dashboard');
  await visualizer.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', total);
  await expect(dashboard.getByText(`${total} / ${total}`, { exact: true })).toBeVisible();
  await expect.poll(() => simulator.commands.some(line => line.includes('CMD: G1 X0 Y0 F600'))).toBe(true);
  await toggle.click();
  await expect(dashboard).toBeHidden();
  await expect(visualizer.locator('[aria-label="3D Visualizer"] canvas')).toBeVisible();
});

test('simulator: pause, resume and stop preserve workflow safety controls', async ({ page, simulator }) => {
  const visualizer = widget(page, 'visualizer');
  await upload(page, 'G21\nG90\nG1 X100 F60\nG1 X0 F60\n');
  await visualizer.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(visualizer.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await visualizer.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(visualizer.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  await expect(visualizer.getByRole('button', { name: 'Upload G-code', exact: true })).toBeDisabled();
  await visualizer.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(visualizer.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await visualizer.getByRole('button', { name: 'Pause', exact: true }).click();
  await visualizer.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(visualizer.getByRole('button', { name: 'Close G-code file', exact: true })).toBeEnabled();
  await expect(visualizer.getByRole('button', { name: 'Pause', exact: true })).toBeDisabled();
});

test('simulator: work coordinate entry updates the reported controller mode', async ({ page, simulator }) => {
  const visualizer = widget(page, 'visualizer');
  await visualizer.getByRole('button', { name: 'G54 (P1)', exact: true }).click();
  await page.getByRole('menuitem', { name: 'G55 (P2)', exact: true }).click();
  await expect(visualizer.getByRole('button', { name: 'G55 (P2)', exact: true })).toBeVisible();
  await expect.poll(() => simulator.commands.some(line => line.includes('CMD: G55'))).toBe(true);
});

test('simulator: watch directory opens safely without selecting or uploading a file', async ({ page, simulator }) => {
  const visualizer = widget(page, 'visualizer');
  await visualizer.getByRole('button', { name: 'Upload G-code options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Browse...', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Watch Directory', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Load G-code', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
});

test('simulator: Grbl info tabs and override controls reflect actual controller state', async ({ page, simulator }) => {
  const grbl = widget(page, 'grbl');
  const bounds = await grbl.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
  const panels = grbl.locator('[data-tonic="Accordion"]');
  await expect(panels).not.toHaveCount(0);
  const borders = await panels.evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return {
      top: parseFloat(style.borderTopWidth),
      right: parseFloat(style.borderRightWidth),
      bottom: parseFloat(style.borderBottomWidth),
      left: parseFloat(style.borderLeftWidth),
    };
  }));
  for (const [index, border] of borders.entries()) {
    expect(border.top).toBe(index === 0 ? 1 : 0);
    expect(border.right).toBe(1);
    expect(border.bottom).toBe(1);
    expect(border.left).toBe(1);
  }
  await grbl.getByRole('button', { name: 'Grbl controller info', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const tabBounds = await dialog.getByRole('tablist').boundingBox();
  const panelBounds = await dialog.getByRole('tabpanel').boundingBox();
  expect(panelBounds.y - tabBounds.y - tabBounds.height).toBe(8);
  expect(panelBounds.x - tabBounds.x).toBe(12);
  expect(tabBounds.x + tabBounds.width - panelBounds.x - panelBounds.width).toBe(12);
  await expect(dialog.getByRole('tabpanel')).toContainText('machineState');
  await dialog.getByRole('tab', { name: 'Controller Settings', exact: true }).click();
  await expect(dialog.getByRole('tabpanel')).toContainText('$100');
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
  await grbl.getByRole('button', { name: '10%', exact: true }).first().click();
  const feedRow = grbl.getByRole('button', { name: 'Reset feed rate override', exact: true }).locator('..');
  await expect(feedRow).toContainText('110%');
  await grbl.getByRole('button', { name: 'Reset feed rate override', exact: true }).click();
  await expect(feedRow).toContainText('100%');
  const intensity = widget(page, 'laser').getByRole('status', { name: 'Laser Intensity Control' });
  await expect(intensity).toHaveText('100%');
  const spindleReset = grbl.getByRole('button', { name: 'Reset spindle override', exact: true });
  await spindleReset.locator('..').getByRole('button', { name: '10%', exact: true }).click();
  await expect(intensity).toHaveText('110%');
  await spindleReset.click();
  await expect(intensity).toHaveText('100%');
});

const cameraViews = [
  { id: 'top', label: 'Top View', position: [0, 0, 200], rotationX: 0 },
  { id: '3d', label: '3D View', position: [200, -200, 200], rotationX: Math.PI / 4 },
  { id: 'front', label: 'Front View', position: [0, -200, 0], rotationX: Math.PI / 2 },
  { id: 'left', label: 'Left Side View', position: [200, 0, 0], rotationX: Math.PI / 2 },
  { id: 'right', label: 'Right Side View', position: [-200, 0, 0], rotationX: Math.PI / 2 },
];

const readCameraView = page => page.evaluate(() => {
  const metrics = window.__CNCJS_VISUALIZER_METRICS__;
  const engine = metrics?.engines?.[0];
  return engine ? {
    cameraPosition: engine.cameraPosition,
    cameraX: engine.cameraX,
    cameraY: engine.cameraY,
    cameraZ: engine.cameraZ,
    cameraRotationX: engine.cameraRotationX,
    hasGCode: engine.hasGCode,
    loadCount: metrics.loadCount,
  } : null;
});

const savedCameraView = page => page.evaluate(() => (
  JSON.parse(localStorage.getItem('cnc') || '{}').state?.widgets?.visualizer?.cameraPosition
));

const expectCameraView = async (page, view) => {
  const visualizer = widget(page, 'visualizer');
  const toolbar = visualizer.getByRole('toolbar', { name: 'Visualizer camera toolbar' });
  await expect(toolbar.getByRole('button', { name: view.label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await readCameraView(page))?.cameraPosition).toBe(view.id);
  await expect.poll(async () => {
    const camera = await readCameraView(page);
    const coordinates = camera && [camera.cameraX, camera.cameraY, camera.cameraZ];
    return coordinates?.every(value => typeof value === 'number')
      ? coordinates.map(value => Number(value.toFixed(3)))
      : null;
  }).toEqual(view.position);
  await expect.poll(async () => (await readCameraView(page))?.cameraRotationX).toBeCloseTo(view.rotationX, 3);
};

for (const view of cameraViews) {
  test(`simulator: selected camera view survives loading and unloading G-code: ${view.id}`, async ({ page, simulator }, testInfo) => {
    expect(simulator.port).toBeGreaterThan(0);
    const visualizer = widget(page, 'visualizer');
    const toolbar = visualizer.getByRole('toolbar', { name: 'Visualizer camera toolbar' });
    await toolbar.getByRole('button', { name: view.label, exact: true }).click();
    await expectCameraView(page, view);
    await expect.poll(async () => (await readCameraView(page))?.hasGCode).toBe(false);
    const initialLoadCount = (await readCameraView(page)).loadCount;

    await upload(page);
    await expect.poll(async () => {
      const camera = await readCameraView(page);
      return camera?.hasGCode && camera.loadCount > initialLoadCount;
    }).toBe(true);
    await expectCameraView(page, view);
    await capture(visualizer, testInfo, `camera-view-${view.id}-loaded`);
    const firstLoadCount = (await readCameraView(page)).loadCount;

    await upload(page, 'G21\nG90\nG1 X20 Y12 F600\nG1 X2 Y1 F600\n');
    await expect.poll(async () => {
      const camera = await readCameraView(page);
      return camera?.hasGCode && camera.loadCount > firstLoadCount;
    }).toBe(true);
    await expectCameraView(page, view);
    const secondLoadCount = (await readCameraView(page)).loadCount;

    await visualizer.getByRole('button', { name: 'Close G-code file', exact: true }).click();
    await expect.poll(async () => (await readCameraView(page))?.hasGCode).toBe(false);
    expect((await readCameraView(page)).loadCount).toBe(secondLoadCount);
    await expectCameraView(page, view);
    await capture(visualizer, testInfo, `camera-view-${view.id}-unloaded`);

    if (view.id === 'front') {
      await expect.poll(() => savedCameraView(page)).toBe('front');
      const connection = widget(page, 'connection');
      await connection.getByRole('button', { name: 'Close', exact: true }).click();
      const dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to close the connection?' });
      await dialog.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(connection.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
      await expectCameraView(page, view);
      await expect.poll(() => savedCameraView(page)).toBe('front');
    }
  });
}
