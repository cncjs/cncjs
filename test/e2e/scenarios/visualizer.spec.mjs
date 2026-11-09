/* Camera controls must settle before the next control is measured. */
/* eslint-disable no-await-in-loop */
import {
  test,
  expect,
  openWorkspace,
  widget,
} from '../support/fixtures.mjs';

const readMetrics = page => page.evaluate(() => {
  const metrics = window.__CNCJS_VISUALIZER_METRICS__;
  const engine = metrics?.engines?.[0];
  if (!engine) {
    return null;
  }
  return {
    liveEngineCount: metrics.liveEngineCount,
    liveCanvasCount: metrics.liveCanvasCount,
    cameraPosition: engine.cameraPosition,
    cameraMode: engine.cameraMode,
    cameraZoom: engine.cameraZoom,
    cameraRotationX: engine.cameraRotationX,
    cameraX: engine.cameraX,
    cameraY: engine.cameraY,
    cameraZ: engine.cameraZ,
    projection: engine.projection,
    projectionModeOrthographic: engine.projectionModeOrthographic,
    sceneLimitsVisible: engine.sceneLimitsVisible,
    sceneCoordinateSystemVisible: engine.sceneCoordinateSystemVisible,
    sceneGridLineNumbersVisible: engine.sceneGridLineNumbersVisible,
    sceneCuttingToolVisible: engine.sceneCuttingToolVisible,
    hasGCode: engine.hasGCode,
    canvasAttached: engine.canvasAttached,
    renderFrameCount: engine.renderFrameCount,
  };
});

const waitForMetrics = async page => {
  await expect.poll(() => readMetrics(page)).not.toBeNull();
  return readMetrics(page);
};

const waitForAppearance = async (page, testInfo) => {
  const expected = testInfo.project.use.colorScheme;
  await expect.poll(
    () => page.evaluate(() => document.documentElement.getAttribute('data-color-scheme')),
  ).toBe(expected);
};

const openVisualizer = async (page, testInfo) => {
  await openWorkspace(page);
  const visualizer = widget(page, 'visualizer');
  await expect(visualizer).toBeVisible();
  await waitForAppearance(page, testInfo);
  await waitForMetrics(page);
  await expect(visualizer.getByRole('toolbar', { name: 'Visualizer status toolbar' })).toBeVisible();
  return visualizer;
};

const openOptionsMenu = async (page, visualizer) => {
  const trigger = visualizer.getByRole('button', { name: '3D View options', exact: true });
  if (await trigger.getAttribute('aria-expanded') !== 'true') {
    await trigger.click();
  }
  await expect(page.getByRole('menu')).toBeVisible();
  await expect.poll(() => page.getByRole('menu').evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect(page.getByRole('menu').locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const menuTexts = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return (await menu.getByRole('menuitem').allTextContents()).map(text => text.trim());
};

const clickMenuItem = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const clickSceneOption = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
};

const openCameraModeMenu = async (page, visualizer) => {
  await visualizer.getByRole('button', { name: /^Camera mode:/ }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menu')).toBeFocused();
  await expect(page.getByRole('menu').locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const readToolbarGeometry = visualizer => visualizer.evaluate(region => {
  const header = region.querySelector('[class*="widget-header"]');
  const footer = region.querySelector('[class*="widget-footer"]');
  const statusToolbar = header?.querySelector('[role="toolbar"][aria-label="Visualizer status toolbar"]');
  const workflowToolbar = region.querySelector('[role="toolbar"][aria-label="G-code workflow toolbar"]');
  const cameraToolbar = footer?.querySelector('[role="toolbar"][aria-label="Visualizer camera toolbar"]');
  const box = element => {
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  };
  const controlBoxes = toolbar => (toolbar ? [...toolbar.querySelectorAll('button')].map(button => ({
    label: button.getAttribute('aria-label'),
    title: button.getAttribute('title'),
    text: button.textContent.trim(),
    box: box(button),
    disabled: button.disabled,
    pressed: button.getAttribute('aria-pressed'),
  })) : []);
  const upload = [...region.querySelectorAll('button')]
    .find(button => button.textContent.trim() === 'Upload G-code');
  return {
    region: box(region),
    header: box(header),
    footer: box(footer),
    statusToolbar: box(statusToolbar),
    workflowToolbar: box(workflowToolbar),
    cameraToolbar: box(cameraToolbar),
    canvas: box(region.querySelector('[aria-label="3D Visualizer"] canvas')),
    statusControls: controlBoxes(statusToolbar),
    workflowControls: controlBoxes(workflowToolbar),
    cameraControls: controlBoxes(cameraToolbar),
    upload: upload ? box(upload) : null,
  };
});

const readIconContrast = visualizer => visualizer.evaluate(region => {
  const footer = region.querySelector('[class*="widget-footer"]');
  const sample = document.createElement('canvas');
  sample.width = 1;
  sample.height = 1;
  const context = sample.getContext('2d');
  const parse = value => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: alpha / 255 };
  };
  const luminance = color => {
    const channel = value => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
  };
  const nearestBackground = node => {
    let current = node;
    while (current) {
      const color = parse(getComputedStyle(current).backgroundColor);
      if (color && color.a > 0.5) {
        return color;
      }
      current = current.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  return [...footer.querySelectorAll('button')].map(button => {
    const icon = button.querySelector('[role="img"], svg');
    if (!icon) {
      return { label: button.getAttribute('aria-label'), hasIcon: false };
    }

    const background = nearestBackground(button);
    const backgroundLuminance = luminance(background);
    const iconBox = icon.getBoundingClientRect();
    const color = parse(getComputedStyle(icon).color);
    const iconLuminance = luminance({
      r: (color.r * color.a) + (background.r * (1 - color.a)),
      g: (color.g * color.a) + (background.g * (1 - color.a)),
      b: (color.b * color.a) + (background.b * (1 - color.a)),
    });

    return {
      label: button.getAttribute('aria-label'),
      hasIcon: true,
      iconWidth: iconBox.width,
      iconHeight: iconBox.height,
      contrast: (Math.max(iconLuminance, backgroundLuminance) + 0.05) / (Math.min(iconLuminance, backgroundLuminance) + 0.05),
    };
  });
});

const expectBoxesClose = (actual, expected, tolerance = 1) => {
  for (const key of ['x', 'y', 'width', 'height', 'right', 'bottom']) {
    expect(Math.abs(actual[key] - expected[key])).toBeLessThanOrEqual(tolerance);
  }
};

const boxesOverlap = (a, b) => (
  Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
  Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1
);

test.describe('visualizer standalone scenarios', () => {
  test('camera views and split controls drive the renderer independently', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const top = visualizer.getByRole('button', { name: 'Top View', exact: true });
    const front = visualizer.getByRole('button', { name: 'Front View', exact: true });
    const right = visualizer.getByRole('button', { name: 'Right Side View', exact: true });
    const left = visualizer.getByRole('button', { name: 'Left Side View', exact: true });
    const threeD = visualizer.getByRole('button', { name: '3D View', exact: true }).last();
    const toggle = visualizer.getByRole('button', { name: '3D View', exact: true }).first();
    const options = visualizer.getByRole('button', { name: '3D View options', exact: true });

    expect((await readMetrics(page)).cameraPosition).toBe('top');
    await expect(top).toHaveAttribute('aria-pressed', 'true');

    await front.click();
    await expect.poll(async () => (await readMetrics(page)).cameraPosition).toBe('front');
    await expect(top).toHaveAttribute('aria-pressed', 'false');
    await expect(front).toHaveAttribute('aria-pressed', 'true');
    expect((await readMetrics(page)).cameraRotationX).toBeCloseTo(Math.PI / 2, 3);

    await right.click();
    await expect.poll(async () => (await readMetrics(page)).cameraPosition).toBe('right');
    await left.click();
    await expect.poll(async () => (await readMetrics(page)).cameraPosition).toBe('left');

    await threeD.click();
    await expect.poll(async () => (await readMetrics(page)).cameraPosition).toBe('3d');
    expect((await readMetrics(page)).cameraRotationX).toBeCloseTo(Math.PI / 4, 3);
    await expect(threeD).toHaveAttribute('aria-pressed', 'true');

    await expect(toggle).toHaveAttribute('title', 'Disable 3D View');
    await options.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(toggle).toHaveAttribute('title', 'Disable 3D View');
    expect((await readMetrics(page)).liveEngineCount).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(toggle).toHaveAttribute('title', 'Disable 3D View');

    await openCameraModeMenu(page, visualizer);
    expect(await menuTexts(page)).toEqual(['Move the camera', 'Rotate the camera']);
    await clickMenuItem(page, 'Rotate the camera');
    await expect(visualizer.getByRole('button', { name: 'Camera mode: Rotate', exact: true })).toBeVisible();
    await expect.poll(async () => (await readMetrics(page)).cameraMode).toBe('rotate');

    await openCameraModeMenu(page, visualizer);
    await clickMenuItem(page, 'Move the camera');
    await expect(visualizer.getByRole('button', { name: 'Camera mode: Pan', exact: true })).toBeVisible();
    await expect.poll(async () => (await readMetrics(page)).cameraMode).toBe('pan');
  });

  test('zoom controls change camera zoom and render frames', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const initial = await readMetrics(page);
    const zoomIn = visualizer.getByRole('button', { name: 'Zoom In', exact: true });
    const zoomOut = visualizer.getByRole('button', { name: 'Zoom Out', exact: true });
    const zoomFit = visualizer.getByRole('button', { name: 'Zoom to Fit', exact: true });

    await zoomIn.click();
    await expect.poll(async () => (await readMetrics(page)).cameraZoom).toBeGreaterThan(initial.cameraZoom);
    const afterZoomIn = await readMetrics(page);
    expect(afterZoomIn.renderFrameCount).toBeGreaterThan(initial.renderFrameCount);

    await zoomOut.click();
    await expect.poll(async () => (await readMetrics(page)).cameraZoom).toBeLessThan(afterZoomIn.cameraZoom);
    const afterZoomOut = await readMetrics(page);
    expect(afterZoomOut.renderFrameCount).toBeGreaterThan(afterZoomIn.renderFrameCount);

    await zoomFit.click();
    await expect.poll(async () => Math.abs((await readMetrics(page)).cameraZoom - initial.cameraZoom)).toBeLessThan(0.001);
  });

  test('3D options toggle projection and scene object visibility', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);

    await openOptionsMenu(page, visualizer);
    expect(await menuTexts(page)).toEqual([
      'Perspective Projection',
      'Orthographic Projection',
      'Display G-code Filename',
      'Hide Limits',
      'Hide Coordinate System',
      'Hide Grid Line Numbers',
      'Hide Cutting Tool',
    ]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect((await readMetrics(page)).projection).toBe('orthographic');

    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Hide Limits');
    await expect.poll(async () => (await readMetrics(page)).sceneLimitsVisible).toBe(false);
    await openOptionsMenu(page, visualizer);
    await expect(page.getByRole('menuitem', { name: 'Show Limits' })).toBeVisible();
    await clickSceneOption(page, 'Perspective Projection');
    await expect.poll(async () => (await readMetrics(page)).projection).toBe('perspective');

    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Hide Coordinate System');
    await expect.poll(async () => (await readMetrics(page)).sceneCoordinateSystemVisible).toBe(false);
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Hide Grid Line Numbers');
    await expect.poll(async () => (await readMetrics(page)).sceneGridLineNumbersVisible).toBe(false);
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Hide Cutting Tool');
    await expect.poll(async () => (await readMetrics(page)).sceneCuttingToolVisible).toBe(false);

    await openOptionsMenu(page, visualizer);
    expect(await menuTexts(page)).toEqual([
      'Perspective Projection',
      'Orthographic Projection',
      'Display G-code Filename',
      'Show Limits',
      'Show Coordinate System',
      'Show Grid Line Numbers',
      'Show Cutting Tool',
    ]);
    await clickSceneOption(page, 'Show Limits');
    await expect.poll(async () => (await readMetrics(page)).sceneLimitsVisible).toBe(true);
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Orthographic Projection');
    await expect.poll(async () => (await readMetrics(page)).projection).toBe('orthographic');
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Show Coordinate System');
    await expect.poll(async () => (await readMetrics(page)).sceneCoordinateSystemVisible).toBe(true);
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Show Grid Line Numbers');
    await expect.poll(async () => (await readMetrics(page)).sceneGridLineNumbersVisible).toBe(true);
    await openOptionsMenu(page, visualizer);
    await clickSceneOption(page, 'Show Cutting Tool');
    await expect.poll(async () => (await readMetrics(page)).sceneCuttingToolVisible).toBe(true);
    const menuBounds = await page.getByRole('menu').boundingBox();
    const triggerBounds = await visualizer.getByRole('button', { name: '3D View options', exact: true }).boundingBox();
    expect(Math.abs(menuBounds.x + menuBounds.width - triggerBounds.x - triggerBounds.width)).toBeLessThanOrEqual(1);
    await visualizer.locator('[aria-label="3D Visualizer"] canvas').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('menu')).toHaveCount(0);
    await openOptionsMenu(page, visualizer);
    await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('3D view toggle hides the scene and restores it', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const toggle = visualizer.getByRole('button', { name: '3D View', exact: true }).first();
    const renderer = visualizer.locator('[aria-label="3D Visualizer"]');
    const cameraToolbar = visualizer.getByRole('toolbar', { name: 'Visualizer camera toolbar' });

    await expect(renderer).toBeVisible();
    await expect(cameraToolbar).toBeVisible();
    await expect(toggle).toHaveAttribute('title', 'Disable 3D View');

    await toggle.click();
    await expect(toggle).toHaveAttribute('title', 'Enable 3D View');
    await expect(cameraToolbar).toHaveCount(0);
    await expect(renderer).toHaveCSS('visibility', 'hidden');
    const dashboard = visualizer.getByLabel('G-code dashboard', { exact: true });
    await expect(dashboard).toBeVisible();
    const dashboardBounds = await dashboard.boundingBox();
    const workflowBounds = await visualizer.getByRole('toolbar', { name: 'G-code workflow toolbar' }).boundingBox();
    expect(dashboardBounds.y - workflowBounds.y - workflowBounds.height).toBeLessThanOrEqual(16);
    const divider = dashboard.getByText('G-code', { exact: true });
    const panelBorder = await dashboard.evaluate(element => getComputedStyle(element).borderTopColor);
    await expect(divider).toHaveCSS('border-bottom-color', panelBorder);

    await toggle.click();
    await expect(toggle).toHaveAttribute('title', 'Disable 3D View');
    await expect(cameraToolbar).toBeVisible();
    await expect(renderer).toHaveCSS('visibility', 'visible');
    await expect(dashboard).toBeHidden();
    expect((await readMetrics(page)).liveEngineCount).toBeGreaterThan(0);
  });

  test('toolbars stay pinned with legible icons in the active color mode', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const geometry = await readToolbarGeometry(visualizer);
    const { region, header, footer, statusToolbar, workflowToolbar, cameraToolbar } = geometry;

    expect(Math.abs(header.y - region.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(header.width - region.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(footer.bottom - region.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(footer.width - region.width)).toBeLessThanOrEqual(1);
    expect(statusToolbar.y).toBeGreaterThanOrEqual(header.y - 1);
    expect(statusToolbar.bottom).toBeLessThanOrEqual(header.bottom + 1);
    expect(cameraToolbar.y).toBeGreaterThanOrEqual(footer.y - 1);
    expect(cameraToolbar.bottom).toBeLessThanOrEqual(footer.bottom + 1);

    for (const control of geometry.statusControls) {
      expect(control.box.x).toBeGreaterThanOrEqual(header.x - 1);
      expect(control.box.right).toBeLessThanOrEqual(header.right + 1);
      expect(control.box.y).toBeGreaterThanOrEqual(header.y - 1);
      expect(control.box.bottom).toBeLessThanOrEqual(header.bottom + 1);
    }
    for (let index = 0; index < geometry.statusControls.length; index += 1) {
      for (let other = index + 1; other < geometry.statusControls.length; other += 1) {
        expect(boxesOverlap(geometry.statusControls[index].box, geometry.statusControls[other].box)).toBe(false);
      }
    }
    expect(geometry.upload, 'Upload G-code button').not.toBeNull();
    expect(geometry.upload.y).toBeGreaterThanOrEqual(header.bottom - 1);
    expect(workflowToolbar, 'G-code workflow toolbar').not.toBeNull();
    expect(workflowToolbar.x).toBeGreaterThanOrEqual(region.x - 1);
    expect(workflowToolbar.right).toBeLessThanOrEqual(region.right + 1);
    expect(workflowToolbar.y).toBeGreaterThanOrEqual(header.bottom - 1);
    expect(workflowToolbar.bottom).toBeLessThanOrEqual(footer.y + 1);
    expect(geometry.canvas, 'Rendered coordinate-system canvas').not.toBeNull();
    expect(workflowToolbar.bottom).toBeLessThanOrEqual(geometry.canvas.y);
    expect(statusToolbar.bottom).toBeLessThanOrEqual(geometry.canvas.y);
    expect(geometry.canvas.bottom).toBeLessThanOrEqual(cameraToolbar.y);
    for (const control of geometry.workflowControls) {
      expect(control.box.x).toBeGreaterThanOrEqual(workflowToolbar.x - 1);
      expect(control.box.right).toBeLessThanOrEqual(workflowToolbar.right + 1);
      expect(control.box.y).toBeGreaterThanOrEqual(workflowToolbar.y - 1);
      expect(control.box.bottom).toBeLessThanOrEqual(workflowToolbar.bottom + 1);
    }
    for (let index = 0; index < geometry.workflowControls.length; index += 1) {
      for (let other = index + 1; other < geometry.workflowControls.length; other += 1) {
        expect(boxesOverlap(geometry.workflowControls[index].box, geometry.workflowControls[other].box)).toBe(false);
      }
    }
    const uploadMain = geometry.workflowControls.find(control => control.text === 'Upload G-code');
    const uploadArrow = geometry.workflowControls.find(control => control.label === 'Upload G-code options');
    expect(uploadMain).toBeTruthy();
    expect(uploadArrow).toBeTruthy();
    expect(Math.abs(uploadArrow.box.x - uploadMain.box.right)).toBeLessThanOrEqual(1);

    for (const control of geometry.cameraControls) {
      expect(control.box.x).toBeGreaterThanOrEqual(footer.x - 1);
      expect(control.box.right).toBeLessThanOrEqual(footer.right + 1);
      expect(control.box.y).toBeGreaterThanOrEqual(footer.y - 1);
      expect(control.box.bottom).toBeLessThanOrEqual(footer.bottom + 1);
    }
    for (let index = 0; index < geometry.cameraControls.length; index += 1) {
      for (let other = index + 1; other < geometry.cameraControls.length; other += 1) {
        expect(boxesOverlap(geometry.cameraControls[index].box, geometry.cameraControls[other].box)).toBe(false);
      }
    }

    const icons = await readIconContrast(visualizer);
    const expectedLabels = [
      'Top View',
      'Front View',
      'Right Side View',
      'Left Side View',
      '3D View',
      'Zoom to Fit',
      'Zoom In',
      'Zoom Out',
      'Camera mode: Pan',
    ];
    for (const label of expectedLabels) {
      const icon = icons.find(item => item.label === label);
      expect(icon, `missing icon button ${label}`).toBeTruthy();
      expect(icon.hasIcon).toBe(true);
      expect(icon.iconWidth).toBeGreaterThan(10);
      expect(icon.iconHeight).toBeGreaterThan(10);
      expect(icon.contrast, `contrast for ${label}`).toBeGreaterThan(2);
    }

    const headerBefore = header;
    const footerBefore = footer;
    await visualizer.getByRole('button', { name: 'Front View', exact: true }).click();
    await visualizer.getByRole('button', { name: 'Zoom In', exact: true }).click();
    await openCameraModeMenu(page, visualizer);
    await clickMenuItem(page, 'Rotate the camera');
    await expect.poll(async () => (await readMetrics(page)).cameraPosition).toBe('front');

    const after = await readToolbarGeometry(visualizer);
    expectBoxesClose(after.header, headerBefore);
    expectBoxesClose(after.footer, footerBefore);
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', testInfo.project.use.colorScheme);
  });

  test('camera icons inherit button colors and gain contrast on hover and keyboard focus', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const toolbar = visualizer.getByRole('toolbar', { name: 'Visualizer camera toolbar' });
    await page.mouse.move(0, 0);
    const resting = await readIconContrast(visualizer);

    for (const icon of resting) {
      const button = toolbar.getByRole('button', { name: icon.label, exact: true });
      const readColor = () => button.evaluate(element => ({
        button: getComputedStyle(element).color,
        icon: getComputedStyle(element.querySelector('[role="img"], svg')).color,
      }));
      const normal = await readColor();
      expect(normal.icon).toBe(normal.button);

      await button.hover();
      await expect.poll(async () => (await readColor()).button).not.toBe(normal.button);
      await expect.poll(async () => (
        (await readIconContrast(visualizer)).find(item => item.label === icon.label).contrast
      )).toBeGreaterThan(icon.contrast);
      const hovered = await readColor();
      expect(hovered.icon).toBe(hovered.button);

      await page.mouse.move(0, 0);
      await button.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(button).toBeFocused();
      await expect.poll(async () => (
        (await readIconContrast(visualizer)).find(item => item.label === icon.label).contrast
      )).toBeGreaterThan(icon.contrast);
      const focused = await readColor();
      expect(focused.icon).toBe(focused.button);
      await button.blur();
    }
  });

  test('workflow controls stay disabled while disconnected', async ({ page }, testInfo) => {
    const visualizer = await openVisualizer(page, testInfo);
    const wcs = visualizer.getByTitle('Work Coordinate System');
    await expect(wcs).toBeDisabled();

    await expect(visualizer.getByRole('button', { name: 'Upload G-code', exact: true })).toBeDisabled();
    await expect(visualizer.getByRole('button', { name: 'Upload G-code options', exact: true })).toBeDisabled();
    await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeDisabled();
    await expect(visualizer.getByRole('button', { name: 'Pause', exact: true })).toBeDisabled();
    await expect(visualizer.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
    await expect(visualizer.getByRole('button', { name: 'Close G-code file', exact: true })).toBeDisabled();

    await expect(visualizer.getByRole('button', { name: '3D View', exact: true }).first()).toBeEnabled();
    await expect(visualizer.getByRole('button', { name: '3D View options', exact: true })).toBeEnabled();
    await expect(visualizer.getByRole('button', { name: 'Top View', exact: true })).toBeEnabled();
    await expect(visualizer.getByRole('button', { name: 'Zoom In', exact: true })).toBeEnabled();
  });
});
