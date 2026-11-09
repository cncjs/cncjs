/* Widget menus, frames and screenshots must settle between iterations. */
/* eslint-disable no-await-in-loop */
import { inflateSync } from 'node:zlib';
import {
  test,
  expect,
  openWorkspace,
  widget,
} from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const ALL_WIDGET_IDS = [
  'autolevel',
  'axes',
  'connection',
  'console',
  'custom',
  'gcode',
  'grbl',
  'laser',
  'macro',
  'marlin',
  'probe',
  'smoothie',
  'spindle',
  'tinyg',
  'tool',
  'visualizer',
  'webcam',
];

const CONTROLLER_WIDGET_IDS = ['grbl', 'marlin', 'smoothie', 'tinyg'];

const COLLAPSIBLE_WIDGET_IDS = [
  'connection',
  'console',
  'custom',
  'gcode',
  'macro',
  'autolevel',
  'probe',
  'tool',
  'spindle',
  'laser',
  'webcam',
  'axes',
];

const REGION_LABELS = {
  autolevel: 'Autolevel Widget',
  axes: 'Axes widget',
  connection: 'Connection widget',
  console: 'Console widget',
  custom: 'Custom widget',
  gcode: 'G-code widget',
  grbl: 'Grbl widget',
  laser: 'Laser widget',
  macro: 'Macro widget',
  marlin: 'Marlin widget',
  probe: 'Probe widget',
  smoothie: 'Smoothie widget',
  spindle: 'Spindle widget',
  tinyg: 'TinyG widget',
  tool: 'Tool widget',
  visualizer: '3D Visualizer widget',
  webcam: 'Webcam widget',
};

const MORE_MENUS = {
  connection: ['Enter Full Screen'],
  console: ['Refresh', 'Select All', 'Copy Selection', 'Clear Selection', 'Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  custom: ['Settings', 'Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  gcode: ['Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  macro: ['Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  autolevel: ['Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  probe: ['Full Screen', 'Fork Widget', 'Remove Widget'],
  tool: ['Enter Full Screen', 'Remove Widget'],
  spindle: ['Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  laser: ['Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  webcam: ['Settings', 'Enter Full Screen', 'Fork Widget', 'Remove Widget'],
  axes: ['Settings', 'Enter Full Screen', 'Fork Widget', 'Remove Widget'],
};

const FULLSCREEN_MENU_LABELS = {
  connection: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  console: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  custom: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  gcode: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  macro: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  autolevel: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  probe: { enter: 'Full Screen', exit: 'Full Screen' },
  tool: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  spindle: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  laser: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  webcam: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
  axes: { enter: 'Enter Full Screen', exit: 'Exit Full Screen' },
};

const readConfig = page => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('cnc') || '{}');
  const state = raw.state || {};
  return {
    settings: state.settings || {},
    workspace: state.workspace || {},
    widgets: state.widgets || {},
  };
});

const waitForAppearance = async (page, testInfo) => {
  const expected = testInfo.project.use.colorScheme;
  await expect.poll(
    () => page.evaluate(() => document.documentElement.getAttribute('data-color-scheme')),
  ).toBe(expected);
};

// `[data-widget-id]` is the layout host inside the sortable columns; the framed
// shell (role="region") lives inside it and is what moves into a fixed
// fullscreen frame.
const regionOf = (page, id) => page.locator(`[data-widget-id="${id}"] [role="region"]`).first();

const contentOf = (page, id) => widget(page, id).locator('[role="region"] > :nth-child(2)');

const moreButton = (page, id) => widget(page, id)
  .getByRole('button', { name: /^More( options)?$/ });

// Tonic focuses the menu container in a requestAnimationFrame after it opens, and
// wraps the menu content in a Collapse that clips while entering. Interacting
// before both settle makes keyboard input miss the menu and pointerup land on a
// different element than pointerdown.
const waitForMenuReady = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const openMore = async (page, id) => {
  await moreButton(page, id).click();
  await waitForMenuReady(page);
};

const menuItemTexts = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return (await menu.getByRole('menuitem').allTextContents()).map(text => text.trim());
};

const closeMenu = async page => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const clickMenuItem = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const openAllWidgets = async page => {
  await openWorkspace(page);
  for (const id of ALL_WIDGET_IDS) {
    await expect(widget(page, id)).toBeVisible();
  }
};

const collapseButton = (page, id) => widget(page, id)
  .locator('button[aria-label="Collapse"][title="Collapse"]');

const expandButton = (page, id) => widget(page, id)
  .locator('button[aria-label="Expand"][title="Expand"]');

// PNG filter reconstruction works on packed bytes, so masking and bit shifts are required.
/* eslint-disable no-bitwise */
const decodePng = buffer => {
  let position = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  const idat = [];

  while (position < buffer.length) {
    const length = buffer.readUInt32BE(position);
    const type = buffer.toString('ascii', position + 4, position + 8);
    const data = buffer.subarray(position + 8, position + 8 + length);
    position += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = Buffer.alloc(height * stride);
  let readPosition = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[readPosition];
    readPosition += 1;
    const row = raw.subarray(readPosition, readPosition + stride);
    readPosition += stride;
    const outputOffset = y * stride;
    const previous = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? data[outputOffset + x - channels] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = (previous && x >= channels) ? previous[x - channels] : 0;
      let value = row[x];

      switch (filter) {
      case 0:
        break;
      case 1:
        value = (value + left) & 0xff;
        break;
      case 2:
        value = (value + up) & 0xff;
        break;
      case 3:
        value = (value + ((left + up) >> 1)) & 0xff;
        break;
      case 4: {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let predictor = upLeft;
        if (pa <= pb && pa <= pc) {
          predictor = left;
        } else if (pb <= pc) {
          predictor = up;
        }
        value = (value + predictor) & 0xff;
        break;
      }
      default:
        throw new Error(`Unsupported PNG filter: ${filter}`);
      }

      data[outputOffset + x] = value;
    }
  }

  return { width, height, channels, data };
};
/* eslint-enable no-bitwise */

const relativeLuminance = (r, g, b) => {
  const channel = value => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b));
};

const contrastRatio = (a, b) => (
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
);

const measureSliderPixels = async slider => {
  const png = await slider.screenshot();
  const image = decodePng(png);
  const { width, height, channels, data } = image;
  const counts = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * channels;
      const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const [backgroundKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const background = backgroundKey.split(',').map(Number);
  const backgroundLuminance = relativeLuminance(...background);

  let visible = 0;
  let left = 0;
  let right = 0;
  let strong = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * channels;
      const luminance = relativeLuminance(data[offset], data[offset + 1], data[offset + 2]);
      const ratio = contrastRatio(luminance, backgroundLuminance);

      if (ratio >= 1.15) {
        visible += 1;
        if (x < width / 2) {
          left += 1;
        } else {
          right += 1;
        }
        if (ratio >= 2) {
          strong += 1;
        }
      }
    }
  }

  return {
    width,
    height,
    background: backgroundKey,
    visibleRatio: visible / (width * height),
    left,
    right,
    strong,
  };
};

const readBorderContrast = locator => locator.evaluate(element => {
  const parse = value => {
    const match = value.match(/rgba?\(([^)]+)\)/) || value.match(/color\(srgb ([^)]+)\)/);
    if (!match) {
      return null;
    }
    const raw = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const isSrgb = value.startsWith('color(');
    const parts = raw.map((part, index) => (isSrgb && index < 3 ? part * 255 : part));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
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
  const style = getComputedStyle(element);
  const border = parse(style.borderTopColor);
  const background = nearestBackground(element.parentElement || element);
  const borderLuminance = border ? luminance(border) : null;
  const backgroundLuminance = luminance(background);
  return {
    borderWidth: parseFloat(style.borderTopWidth),
    borderStyle: style.borderTopStyle,
    borderColor: style.borderTopColor,
    backgroundColor: style.backgroundColor,
    background: background,
    contrast: borderLuminance === null
      ? null
      : (Math.max(borderLuminance, backgroundLuminance) + 0.05) / (Math.min(borderLuminance, backgroundLuminance) + 0.05),
  };
});

const readIconContrast = (scope, selector) => scope.evaluate((root, selector) => {
  const parse = value => {
    const match = value.match(/rgba?\(([^)]+)\)/) || value.match(/color\(srgb ([^)]+)\)/);
    if (!match) {
      return null;
    }
    const raw = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const isSrgb = value.startsWith('color(');
    const parts = raw.map((part, index) => (isSrgb && index < 3 ? part * 255 : part));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
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
  const composite = (color, background) => ({
    r: (color.r * color.a) + (background.r * (1 - color.a)),
    g: (color.g * color.a) + (background.g * (1 - color.a)),
    b: (color.b * color.a) + (background.b * (1 - color.a)),
  });

  return [...root.querySelectorAll(selector)].map(button => {
    const icon = button.querySelector('svg, img');
    if (!icon) {
      return {
        label: button.getAttribute('aria-label'),
        hasIcon: false,
      };
    }

    const iconBox = icon.getBoundingClientRect();
    const background = nearestBackground(button);
    const backgroundLuminance = luminance(background);
    let iconColor;

    if (icon.tagName.toLowerCase() === 'svg') {
      iconColor = parse(getComputedStyle(icon).color);
    } else {
      const filters = [];
      let current = icon;
      while (current && current !== root) {
        const filter = getComputedStyle(current).filter;
        if (filter && filter !== 'none') {
          filters.unshift(filter);
        }
        current = current.parentElement;
      }
      const width = icon.naturalWidth || 20;
      const height = icon.naturalHeight || 20;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.filter = filters.join(' ') || 'none';
      context.drawImage(icon, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let total = 0;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 128) {
          continue;
        }
        total += luminance({
          r: pixels[index],
          g: pixels[index + 1],
          b: pixels[index + 2],
        });
        count += 1;
      }
      iconColor = count > 0
        ? { r: 0, g: 0, b: 0, a: 1, luminanceOverride: total / count }
        : null;
    }

    if (!iconColor) {
      return {
        label: button.getAttribute('aria-label'),
        hasIcon: false,
      };
    }

    const iconLuminance = iconColor.luminanceOverride ?? luminance(composite(iconColor, background));
    return {
      label: button.getAttribute('aria-label'),
      text: button.textContent.trim(),
      hasIcon: true,
      iconWidth: iconBox.width,
      iconHeight: iconBox.height,
      iconFilter: icon.tagName.toLowerCase() === 'img' ? getComputedStyle(icon).filter : null,
      background: getComputedStyle(button).backgroundColor,
      contrast: (Math.max(iconLuminance, backgroundLuminance) + 0.05) / (Math.min(iconLuminance, backgroundLuminance) + 0.05),
    };
  });
}, selector);

test.describe('widget registry and shell', () => {
  test('split dropdown chevrons are centered inside their button segments', async ({ page }) => {
    await openAllWidgets(page);
    for (const name of ['3D View options', 'Upload G-code options']) {
      const button = widget(page, 'visualizer').getByRole('button', { name, exact: true });
      const bounds = await button.boundingBox();
      const icon = await button.locator('[data-tonic="MenuToggleIcon"]').boundingBox();
      expect(Math.abs(icon.x + icon.width / 2 - bounds.x - bounds.width / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(icon.y + icon.height / 2 - bounds.y - bounds.height / 2)).toBeLessThanOrEqual(1);
      const group = button.locator('xpath=ancestor::*[@data-tonic="InputGroup"][1]');
      const main = await group.getByRole('button').first().boundingBox();
      expect(Math.abs(bounds.x - main.x - main.width)).toBeLessThanOrEqual(1);
      expect(bounds.y).toBe(main.y);
      expect(bounds.height).toBe(main.height);
    }
  });

  test('all 17 registry widgets render disconnected-safe content', async ({ page }, testInfo) => {
    await openAllWidgets(page);
    await waitForAppearance(page, testInfo);

    for (const id of ALL_WIDGET_IDS) {
      const region = regionOf(page, id);
      await expect(region).toHaveAttribute('aria-label', REGION_LABELS[id]);
    }

    await expect(widget(page, 'connection')).toContainText('Serial port');
    await expect(widget(page, 'connection')).toContainText('Baud rate');
    await expect(widget(page, 'console')).toContainText('No serial connection');
    await expect(widget(page, 'gcode')).toContainText('G-code');
    await expect(widget(page, 'webcam')).toContainText('Webcam is off');
    await expect(widget(page, 'custom')).toContainText('The widget is currently disabled');
    await expect(widget(page, 'macro')).toContainText('New');
    await expect(widget(page, 'autolevel')).toContainText('PROBE NEW SURFACE');
    await expect(widget(page, 'probe')).toContainText('Probe Axis');
    await expect(widget(page, 'spindle')).toContainText('Spindle Speed');
    await expect(widget(page, 'laser')).toContainText('Laser Intensity Control');
    await expect(widget(page, 'axes')).toContainText('Machine Position');
    await expect(widget(page, 'axes')).toContainText('Work Position');
    await expect(widget(page, 'visualizer')).toContainText('3D View');
    await expect(widget(page, 'visualizer').getByRole('toolbar', { name: 'Visualizer status toolbar' })).toBeVisible();

    await expect(widget(page, 'probe').getByRole('button', { name: 'Probe Axis Z', exact: true })).toBeDisabled();
    await expect(widget(page, 'spindle').getByTitle('Spindle On, CW (M3)')).toBeDisabled();
    await expect(widget(page, 'spindle').getByTitle('Spindle Off (M5)')).toBeDisabled();
    await expect(widget(page, 'laser').getByRole('button', { name: 'Laser Test', exact: true })).toBeDisabled();
    await expect(widget(page, 'laser').getByRole('button', { name: 'Laser Off', exact: true })).toBeDisabled();

    for (const id of CONTROLLER_WIDGET_IDS) {
      await expect(widget(page, id)).toContainText(id === 'tinyg' ? 'TinyG' : id.charAt(0).toUpperCase() + id.slice(1));
      await expect(contentOf(page, id)).toHaveCount(0);
      await expect(widget(page, id).getByRole('button', { name: 'Collapse', exact: true })).toHaveCount(0);
    }
  });

  test('framed widgets collapse and expand through their shell controls', async ({ page }) => {
    await openAllWidgets(page);

    for (const id of COLLAPSIBLE_WIDGET_IDS) {
      await test.step(`${id} collapses and expands`, async () => {
        const content = contentOf(page, id);
        await expect(content).toBeVisible();

        await collapseButton(page, id).click();
        await expect(expandButton(page, id)).toBeVisible();
        await expect(content).toHaveAttribute('aria-hidden', 'true');
        await expect(content).toBeHidden();

        await expandButton(page, id).click();
        await expect(collapseButton(page, id)).toBeVisible();
        await expect(content).toBeVisible();
      });
    }
  });

  test('controller widgets remain header-only until connected', async ({ page }) => {
    await openAllWidgets(page);

    for (const id of CONTROLLER_WIDGET_IDS) {
      await test.step(`${id} is header-only while disconnected`, async () => {
        await expect(contentOf(page, id)).toHaveCount(0);
        await openMore(page, id);
        expect(await menuItemTexts(page)).toEqual(['Enter Full Screen', 'Fork Widget', 'Remove Widget']);
        await expect(page.getByRole('menuitem', { name: 'Enter Full Screen' })).toHaveAttribute('aria-disabled', 'true');
        await closeMenu(page);
      });
    }
  });

  test('every framed widget exposes its documented more-options menu', async ({ page }) => {
    await openAllWidgets(page);

    for (const [id, expected] of Object.entries(MORE_MENUS)) {
      await test.step(`${id} more options`, async () => {
        await openMore(page, id);
        expect(await menuItemTexts(page)).toEqual(expected);
        for (const label of expected) {
          await expect(page.getByRole('menuitem', { name: label, exact: true })).not.toHaveAttribute('aria-disabled', 'true');
        }
        await closeMenu(page);
      });
    }

    await expect(widget(page, 'visualizer').getByRole('button', { name: /^More/ })).toHaveCount(0);
  });

  test('fork and remove entry points confirm before changing the layout', async ({ page }) => {
    await openAllWidgets(page);
    const gcodeWidgets = page.locator('[data-widget-id^="gcode"]');
    const forkedWidgets = page.locator('[data-widget-id^="gcode:"]');

    await expect(gcodeWidgets).toHaveCount(1);
    await openMore(page, 'gcode');
    await clickMenuItem(page, 'Fork Widget');
    const forkDialog = page.getByRole('dialog');
    await expect(forkDialog.getByText('Are you sure you want to fork this widget?')).toBeVisible();
    await forkDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(gcodeWidgets).toHaveCount(1);

    await openMore(page, 'gcode');
    await clickMenuItem(page, 'Fork Widget');
    await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(1);
    await expect(gcodeWidgets).toHaveCount(2);

    const forked = forkedWidgets.first();
    await forked.getByRole('button', { name: 'More options', exact: true }).click();
    await clickMenuItem(page, 'Remove Widget');
    const removeDialog = page.getByRole('dialog');
    await expect(removeDialog.getByText('Are you sure you want to remove this widget?')).toBeVisible();
    await removeDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(1);

    await forked.getByRole('button', { name: 'More options', exact: true }).click();
    await clickMenuItem(page, 'Remove Widget');
    await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(0);
    await expect(gcodeWidgets).toHaveCount(1);
  });

  test('fullscreen enters an opaque viewport-sized frame and exits back to the panel', async ({ page }, testInfo) => {
    await openAllWidgets(page);
    const viewport = page.viewportSize();

    for (const [id, labels] of Object.entries(FULLSCREEN_MENU_LABELS)) {
      await test.step(`${id} fullscreen`, async () => {
        const region = regionOf(page, id);

        await openMore(page, id);
        await clickMenuItem(page, labels.enter);
        await expect(region).toHaveCSS('position', 'fixed');
        const fullscreenBox = await region.boundingBox();
        expect(fullscreenBox.width).toBeGreaterThan(viewport.width * 0.8);
        expect(fullscreenBox.height).toBeGreaterThan(viewport.height * 0.8);
        expect(fullscreenBox.x).toBeLessThan(100);
        expect(fullscreenBox.y).toBeLessThan(100);
        await expect(region).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const content = contentOf(page, id);
        const header = region.locator(':scope > :first-child');
        const headerBox = await header.boundingBox();
        const contentBox = await content.boundingBox();
        expect(contentBox.y, `${id}: content must start below the header`).toBeCloseTo(headerBox.y + headerBox.height, 0);
        expect(contentBox.y + contentBox.height, `${id}: content must end at the frame bottom`).toBeCloseTo(fullscreenBox.y + fullscreenBox.height, 0);
        await expect(content).toHaveCSS('overflow-y', 'auto');

        await page.setViewportSize({ width: 1024, height: 700 });
        await expect.poll(async () => {
          const box = await region.boundingBox();
          return { right: Math.round(box.x + box.width), bottom: Math.round(box.y + box.height) };
        }).toEqual({ right: 1024, bottom: 700 });
        await page.setViewportSize(viewport);
        await capture(page, testInfo, `fullscreen-${id}`);

        const collapse = region.locator('button[aria-label="Collapse"][title="Collapse"]');
        if (await collapse.count()) {
          await expect(collapse).toBeDisabled();
        }

        await openMore(page, id);
        await clickMenuItem(page, labels.exit);
        await expect(region).not.toHaveCSS('position', 'fixed');
        const restoredBox = await region.boundingBox();
        expect(restoredBox.width).toBeLessThan(viewport.width * 0.5);
        expect(restoredBox.height).toBeLessThan(viewport.height);
      });
    }
  });
});

test.describe('connection and console', () => {
  test('connection switches controller and transport without opening a port', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'connection');
    const grbl = root.getByRole('button', { name: 'Grbl', exact: true });
    const marlin = root.getByRole('button', { name: 'Marlin', exact: true });
    const open = root.getByRole('button', { name: 'Open', exact: true });

    await expect(grbl).toHaveAttribute('data-selected', '');
    await marlin.click();
    await expect(marlin).toHaveAttribute('data-selected', '');
    await expect(grbl).not.toHaveAttribute('data-selected', '');
    await expect.poll(async () => (await readConfig(page)).widgets.connection.controller.type).toBe('Marlin');
    await expect(contentOf(page, 'marlin')).toHaveCount(0);
    await expect(contentOf(page, 'grbl')).toHaveCount(0);

    await grbl.click();
    await expect(grbl).toHaveAttribute('data-selected', '');

    await root.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
    const host = root.getByLabel('Host');
    const port = root.getByLabel('Port');
    await expect(host).toBeVisible();
    await expect(port).toHaveValue('23');
    await expect(open).toBeDisabled();

    await host.fill('127.0.0.1');
    await expect(open).toBeEnabled();
    await expect.poll(async () => (await readConfig(page)).widgets.connection.connection.socket.host).toBe('127.0.0.1');
    await expect.poll(async () => (await readConfig(page)).widgets.connection.connection.socket.port).toBe(23);

    await root.getByRole('button', { name: 'Serial Port', exact: true }).click();
    await expect(root.getByLabel('Serial port')).toBeVisible();
    await expect(open).toBeDisabled();

    const checkboxes = root.getByRole('checkbox');
    await expect(checkboxes.last()).not.toBeChecked();
  });

  test('console exposes clear, terminal actions and a working fullscreen toggle', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'console');
    const region = regionOf(page, 'console');
    const viewport = page.viewportSize();

    await expect(root).toContainText('No serial connection');
    await expect(root.getByRole('button', { name: 'Clear console', exact: true })).toBeVisible();

    await root.getByRole('button', { name: 'Enter full screen', exact: true }).click();
    await expect(region).toHaveCSS('position', 'fixed');
    const fullscreenBox = await region.boundingBox();
    expect(fullscreenBox.width).toBeGreaterThan(viewport.width * 0.8);
    expect(fullscreenBox.height).toBeGreaterThan(viewport.height * 0.8);
    await expect(root.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();
    await expect(collapseButton(page, 'console')).toBeDisabled();

    await root.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    await expect(region).not.toHaveCSS('position', 'fixed');
    await expect(root.getByRole('button', { name: 'Enter full screen', exact: true })).toBeVisible();
    expect((await region.boundingBox()).width).toBeLessThan(viewport.width * 0.5);

    await root.getByRole('button', { name: 'Clear console', exact: true }).click();
    await expect(root).toContainText('No serial connection');

    await openMore(page, 'console');
    expect(await menuItemTexts(page)).toEqual(MORE_MENUS.console);
    await closeMenu(page);
  });
});

test.describe('custom and webcam settings', () => {
  test('custom widget enables, saves its title, cancels edits and disables again', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'custom');

    await expect(root).toContainText('The widget is currently disabled');
    await root.getByRole('button', { name: 'Enable widget', exact: true }).click();
    await expect(root).toContainText('URL not configured');
    await expect(root.getByRole('button', { name: 'Refresh content', exact: true })).toBeEnabled();
    await expect.poll(async () => (await readConfig(page)).widgets.custom.disabled).toBe(false);

    await openMore(page, 'custom');
    await clickMenuItem(page, 'Settings');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Settings', { exact: true })).toBeVisible();
    await dialog.locator('#custom-settings-title').fill('Discarded title');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(root.getByText('Discarded title')).toHaveCount(0);

    await openMore(page, 'custom');
    await clickMenuItem(page, 'Settings');
    await page.getByRole('dialog').locator('#custom-settings-title').fill('E2E Custom');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(root.getByText('E2E Custom', { exact: true })).toBeVisible();
    await expect.poll(async () => (await readConfig(page)).widgets.custom.title).toBe('E2E Custom');

    await openMore(page, 'custom');
    await clickMenuItem(page, 'Settings');
    await page.getByRole('dialog').locator('#custom-settings-title').fill('Should Not Persist');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(root.getByText('E2E Custom', { exact: true })).toBeVisible();

    await root.getByRole('button', { name: 'Disable widget', exact: true }).click();
    await expect(root).toContainText('The widget is currently disabled');
    await expect(root.getByRole('button', { name: 'Refresh content', exact: true })).toBeDisabled();
    await expect.poll(async () => (await readConfig(page)).widgets.custom.disabled).toBe(true);
  });

  test('webcam settings switch media source without requesting camera permission', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'webcam');

    await expect(root).toContainText('Webcam is off');
    await expect(root.getByRole('button', { name: 'Refresh webcam', exact: true })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Enable Webcam', exact: true })).toBeVisible();

    await openMore(page, 'webcam');
    await clickMenuItem(page, 'Settings');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Webcam Settings')).toBeVisible();
    const radios = dialog.getByRole('radio');
    const url = dialog.getByLabel('Stream URL');
    const device = dialog.getByRole('button', { name: 'Choose a video device', exact: true });

    await expect(radios.nth(0)).toBeChecked();
    await expect(radios.nth(1)).not.toBeChecked();
    await expect(url).toBeDisabled();
    await expect(device).toBeEnabled();

    await dialog.getByText('Connect to an IP camera', { exact: true }).click();
    await expect(radios.nth(1)).toBeChecked();
    await expect(url).toBeEnabled();
    await expect(device).toBeDisabled();
    await url.fill('http://127.0.0.1:8080/?action=stream');
    await expect(url).toHaveValue('http://127.0.0.1:8080/?action=stream');

    await dialog.getByText('Use a built-in camera or a connected webcam', { exact: true }).click();
    await expect(radios.nth(0)).toBeChecked();
    await expect(url).toBeDisabled();
    await expect(device).toBeEnabled();
    await device.click();
    await waitForMenuReady(page);
    expect(await menuItemTexts(page)).toEqual(['Automatic detection']);
    await page.getByRole('menuitem', { name: 'Automatic detection' }).click();

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(root).toContainText('Webcam is off');
    await expect.poll(async () => (await readConfig(page)).widgets.webcam?.mediaSource ?? 'local').toBe('local');
    await expect.poll(async () => (await readConfig(page)).widgets.webcam?.url ?? '').toBe('');
  });
});

test.describe('axes and macro', () => {
  test('axes settings separates tabs and actions, cancels drafts and saves mocked settings', async ({ page }) => {
    const writes = [];
    await page.route(/\/api\/mdi\/?(\?.*)?$/, route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ json: { records: [] } });
      }
      writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { records: [] } });
    });
    await openAllWidgets(page);
    const openSettings = async () => {
      await openMore(page, 'axes');
      await clickMenuItem(page, 'Settings');
      return page.getByRole('dialog');
    };
    let dialog = await openSettings();
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    const save = dialog.getByRole('button', { name: 'Save Changes', exact: true });
    const cancelBox = await cancel.boundingBox();
    const saveBox = await save.boundingBox();
    expect(saveBox.x - cancelBox.x - cancelBox.width).toBe(8);
    const tabBox = await dialog.getByRole('tablist').boundingBox();
    const panelBox = await dialog.getByRole('tabpanel').boundingBox();
    expect(panelBox.y - tabBox.y - tabBox.height).toBe(8);
    await expect(dialog.getByRole('checkbox', { name: 'X-axis', exact: true })).toBeDisabled();
    await dialog.getByText('Z-axis', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).first().click();
    await dialog.getByRole('spinbutton', { name: 'Custom Jog Distance (mm) 1', exact: true }).fill('2.5');
    await dialog.getByRole('tab', { name: 'Custom Commands', exact: true }).click();
    await expect(dialog).toContainText('No data to display');
    await dialog.getByRole('tab', { name: 'ShuttleXpress', exact: true }).click();
    await expect(dialog.getByRole('slider', { name: 'Minimum feed rate', exact: true })).toBeVisible();
    await dialog.getByRole('tab', { name: 'General', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Z-axis', exact: true })).not.toBeChecked();
    await cancel.click();
    expect(writes).toEqual([]);
    dialog = await openSettings();
    await expect(dialog.getByRole('checkbox', { name: 'Z-axis', exact: true })).toBeChecked();
    await expect(dialog.getByRole('spinbutton')).toHaveCount(0);
    await dialog.getByText('Z-axis', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Add', exact: true }).first().click();
    await dialog.getByRole('spinbutton', { name: 'Custom Jog Distance (mm) 1', exact: true }).fill('2.5');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toEqual([{ records: [] }]);
    await expect.poll(async () => (await readConfig(page)).widgets.axes.axes).toEqual(['x', 'y']);
    await expect.poll(async () => (await readConfig(page)).widgets.axes.jog.metric.distances).toEqual([2.5]);
    dialog = await openSettings();
    await expect(dialog.getByRole('checkbox', { name: 'Z-axis', exact: true })).not.toBeChecked();
    await expect(dialog.getByRole('spinbutton', { name: 'Custom Jog Distance (mm) 1', exact: true })).toHaveValue('2.5');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('axes keeps table padding and visible action icons in normal and fullscreen views', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'axes');
    const table = root.locator('table').first();
    const checkLayout = async () => {
      const content = await contentOf(page, 'axes').boundingBox();
      const bounds = await table.boundingBox();
      expect(bounds.x - content.x).toBeGreaterThanOrEqual(12);
      expect(content.x + content.width - bounds.x - bounds.width).toBeGreaterThanOrEqual(12);
      expect(bounds.y - content.y).toBeGreaterThanOrEqual(8);
      const icons = await readIconContrast(table, 'button');
      expect(icons).toHaveLength(22);
      for (const icon of icons) {
        expect(icon.hasIcon, icon.label).toBe(true);
        expect(icon.iconWidth, icon.label).toBeGreaterThan(8);
        expect(icon.iconHeight, icon.label).toBeGreaterThan(8);
        expect(icon.contrast, icon.label).toBeGreaterThan(3);
      }
      for (const button of await table.getByRole('button').all()) {
        const visible = await button.evaluate(element => {
          const buttonBounds = element.getBoundingClientRect();
          const scrollBounds = element.closest('table').parentElement.getBoundingClientRect();
          return buttonBounds.left >= scrollBounds.left && buttonBounds.right <= scrollBounds.right;
        });
        expect(visible, 'Action button is fully visible inside the table viewport').toBe(true);
        await expect(button).toBeDisabled();
      }
    };
    await checkLayout();
    await openMore(page, 'axes');
    await clickMenuItem(page, 'Enter Full Screen');
    await checkLayout();
    await page.setViewportSize({ width: 1024, height: 700 });
    await checkLayout();
    await openMore(page, 'axes');
    await clickMenuItem(page, 'Exit Full Screen');
    await checkLayout();
  });

  test('axes shows positions, MDI state and settings tabs without saving', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'axes');

    await expect(root).toContainText('Machine Position');
    await expect(root).toContainText('Work Position');
    await expect(root.getByText('0.000')).toHaveCount(6);
    await expect(root).toContainText('G21 (mm)');
    await expect(root).toContainText('1mm');
    await expect(root.getByRole('button', { name: 'Toggle keypad jogging', exact: true })).toBeDisabled();

    const mdi = root.getByRole('button', { name: 'Toggle manual data input mode', exact: true });
    await expect(mdi).toHaveAttribute('aria-pressed', 'true');
    await mdi.click();
    await expect(mdi).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await readConfig(page)).widgets.axes.mdi.disabled).toBe(true);
    await mdi.click();
    await expect(mdi).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await readConfig(page)).widgets.axes.mdi.disabled).toBe(false);

    await openMore(page, 'axes');
    await clickMenuItem(page, 'Settings');
    const settingsDialog = page.getByRole('dialog').first();
    await expect(settingsDialog.getByText('Axes Settings')).toBeVisible();
    await expect(settingsDialog.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    const checkboxes = settingsDialog.getByRole('checkbox');
    await expect(checkboxes.nth(0)).toBeDisabled();
    await expect(checkboxes.nth(1)).toBeChecked();
    await expect(checkboxes.nth(2)).toBeChecked();
    await settingsDialog.getByText('Z-axis', { exact: true }).click();
    await expect(checkboxes.nth(2)).not.toBeChecked();
    await settingsDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(root.getByText('0.000')).toHaveCount(6);
    await expect.poll(async () => (await readConfig(page)).widgets.axes?.axes ?? ['x', 'y', 'z']).toEqual(['x', 'y', 'z']);

    await openMore(page, 'axes');
    await clickMenuItem(page, 'Settings');
    const secondSettingsDialog = page.getByRole('dialog').first();
    await secondSettingsDialog.getByRole('tab', { name: 'Custom Commands' }).click();
    await expect(secondSettingsDialog).toContainText('No data to display');
    await secondSettingsDialog.getByRole('button', { name: 'New', exact: true }).click();
    const createDialog = page.getByRole('dialog').last();
    await expect(createDialog.getByText('Custom Commands')).toBeVisible();
    await expect(createDialog.getByLabel('Name')).toBeVisible();
    await expect(createDialog.getByLabel('Command')).toBeVisible();
    await createDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(secondSettingsDialog.getByText('Axes Settings')).toBeVisible();
    await secondSettingsDialog.getByRole('tab', { name: 'ShuttleXpress' }).click();
    await expect(secondSettingsDialog).toContainText('Feed Rate Range');
    await secondSettingsDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('macro creates drafts and edits only in memory', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'macro');
    const editButtons = root.getByRole('button', { name: /^Edit macro:/ });
    const editCount = await editButtons.count();
    const runButtons = root.getByRole('button', { name: /^Run macro:/ });
    const loadButtons = root.getByRole('button', { name: /^Load macro:/ });
    if (await runButtons.count()) {
      await expect(runButtons.first()).toBeDisabled();
      await expect(loadButtons.first()).toBeDisabled();
    }

    await root.getByRole('button', { name: 'New macro', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Macro')).toBeVisible();
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(2);
    await expect(dialog).toBeVisible();

    await dialog.locator('input').first().fill('E2E Macro');
    await dialog.locator('textarea').fill('G0 X0 Y0');
    await dialog.getByRole('button', { name: 'Macro Variables', exact: true }).click();
    await waitForMenuReady(page);
    const variables = await menuItemTexts(page);
    expect(variables.length).toBeGreaterThan(10);
    await page.getByRole('menuitem', { name: variables[0], exact: true }).click();
    await expect(dialog.locator('textarea')).toHaveValue(/G0 X0 Y0[\s\S]*%wait/);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(editButtons).toHaveCount(editCount);

    if (editCount > 0) {
      await editButtons.first().click();
      const editDialog = page.getByRole('dialog');
      await expect(editDialog.getByText('Edit Macro')).toBeVisible();
      await expect(editDialog.locator('input').first()).not.toHaveValue('');
      await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(editButtons).toHaveCount(editCount);
    }
  });
});

test.describe('autolevel and probe', () => {
  test('autolevel diagrams keep labels legible and surfaces themed', async ({ page }, testInfo) => {
    await openAllWidgets(page);
    const root = widget(page, 'autolevel');
    await root.getByRole('button', { name: 'Start New Probe', exact: true }).click();
    for (const name of ['Z-axis probe diagram', 'Probe area diagram']) {
      const diagram = root.getByRole('img', { name, exact: true });
      await expect(diagram).toBeVisible();
      const paints = await diagram.evaluate(svg => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d');
        const paint = (color, background = 'white') => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = background;
          context.fillRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const luminance = rgb => rgb.map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        let surface = svg.parentElement;
        while (surface.parentElement && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') {
          surface = surface.parentElement;
        }
        const background = getComputedStyle(surface).backgroundColor;
        const rectFill = getComputedStyle(svg.querySelector('rect')).fill;
        return {
          areaLuminance: luminance(paint(rectFill, background)),
          labels: [...svg.querySelectorAll('text')].map(text => {
            const backdrop = text.textContent === 'Workpiece' ? `rgb(${paint(rectFill, background).join(',')})` : background;
            const a = luminance(paint(getComputedStyle(text).fill, backdrop));
            const b = luminance(paint(backdrop));
            return { text: text.textContent, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
          }),
        };
      });
      for (const label of paints.labels) {
        expect(label.contrast, `${name}: ${label.text}`).toBeGreaterThan(3);
      }
      if (name === 'Probe area diagram') {
        if (testInfo.project.name === 'dark') {
          expect(paints.areaLuminance).toBeLessThan(0.2);
        } else {
          expect(paints.areaLuminance).toBeGreaterThan(0.7);
        }
      }
      await capture(diagram, testInfo, name);
    }
  });

  test('autolevel landing, setup validation and probe-file apply view', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'autolevel');

    const landing = await root.evaluate(element => {
      const parse = value => {
        const match = value.match(/rgba?\(([^)]+)\)/) || value.match(/color\(srgb ([^)]+)\)/);
        if (!match) {
          return null;
        }
        const raw = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        const isSrgb = value.startsWith('color(');
        const parts = raw.map((part, index) => (isSrgb && index < 3 ? part * 255 : part));
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
      };
      const luminance = color => {
        const channel = value => {
          const v = value / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
      };
      const background = parse(getComputedStyle(element.querySelector('[class*="path-card"]') || element).backgroundColor) ||
        { r: 255, g: 255, b: 255, a: 1 };
      const backgroundLuminance = luminance(background);
      return [...element.querySelectorAll('button')]
        .filter(button => ['Start New Probe', 'Load Probe Data'].includes(button.textContent.trim()))
        .map(button => {
          const style = getComputedStyle(button);
          const border = parse(style.borderTopColor);
          const borderLuminance = border ? luminance(border) : null;
          return {
            label: button.textContent.trim(),
            borderWidth: parseFloat(style.borderTopWidth),
            borderStyle: style.borderTopStyle,
            borderColor: style.borderTopColor,
            contrast: borderLuminance === null
              ? null
              : (Math.max(borderLuminance, backgroundLuminance) + 0.05) / (Math.min(borderLuminance, backgroundLuminance) + 0.05),
          };
        });
    });

    expect(landing.map(item => item.label)).toEqual(['Start New Probe', 'Load Probe Data']);
    for (const item of landing) {
      expect(item.borderWidth).toBeGreaterThanOrEqual(1);
      expect(item.borderStyle).toBe('solid');
      expect(item.contrast).toBeGreaterThan(1.05);
    }

    await root.getByRole('button', { name: 'Start New Probe', exact: true }).click();
    await expect(root).toContainText('PROBE NEW SURFACE');
    await expect(root.getByLabel('Start Z')).toHaveValue('5');
    await expect(root.getByLabel('End Z')).toHaveValue('-10');
    await expect(root.getByLabel('Step X')).toHaveValue('5');
    await expect(root.getByRole('button', { name: 'Test Probe', exact: true })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Start Probing', exact: true })).toBeDisabled();

    const stepX = root.getByLabel('Step X');
    await stepX.fill('');
    await expect(root).toContainText('Must be a number');
    await stepX.fill('0');
    await expect(root).toContainText('Must be greater than zero');
    await stepX.fill('5');
    await expect(root).not.toContainText('Must be greater than zero');

    const clearanceZ = root.getByLabel('Clearance Z');
    await clearanceZ.fill('1');
    await expect(root).toContainText('Clearance Z must be above Start Z');
    await clearanceZ.fill('10');
    await expect(root).not.toContainText('Clearance Z must be above Start Z');

    await root.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(root).toContainText('PROBE NEW SURFACE');

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      root.getByRole('button', { name: 'Load Probe Data', exact: true }).click(),
    ]);
    await chooser.setFiles({
      name: 'grid.probe',
      mimeType: 'text/plain',
      buffer: Buffer.from('0 0 -1\n10 0 -2\n0 10 -1.5\n10 10 -2.5\n'),
    });

    await expect(root).toContainText('APPLY COMPENSATION');
    await expect(root).toContainText('Points probed:');
    await expect(root).toContainText('4');
    await expect(root).toContainText('Load G-code file');
    await expect(root.getByRole('button', { name: 'Export Probe Data', exact: true })).toBeEnabled();

    await root.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(root).toContainText('PROBE NEW SURFACE');
  });

  test('probe selects axis and command, edits numeric settings and blocks the action', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'probe');

    await expect(root.getByText('Probe Axis Z')).toBeVisible();
    await root.getByTitle('Probe X axis').click();
    await expect(root.getByText('Probe Axis X')).toBeVisible();
    await expect(root.getByTitle('Probe X axis')).toHaveAttribute('data-selected', '');
    // Tonic marks the selected ButtonGroup button with pointer-events: none, so
    // switching axes must go through a button that is not selected.
    await root.getByTitle('Probe Z axis').click();
    await expect(root.getByText('Probe Axis Z')).toBeVisible();
    await root.getByTitle('Probe X axis').click();
    await expect(root.getByText('Probe Axis X')).toBeVisible();

    await expect(root.getByText('Probe Command: G38.2')).toBeVisible();
    await root.getByTitle(/^G38\.4/).click();
    await expect(root.getByText('Probe Command: G38.4')).toBeVisible();
    await expect(root.getByTitle(/^G38\.4/)).toHaveAttribute('data-selected', '');

    const depth = root.getByLabel('Probe Depth');
    await depth.fill('12');
    await expect(depth).toHaveValue('12');
    await expect(root.getByRole('button', { name: 'Probe Axis X', exact: true })).toBeDisabled();

    await openMore(page, 'probe');
    expect(await menuItemTexts(page)).toEqual(MORE_MENUS.probe);
    await closeMenu(page);
  });
});

test.describe('tool, spindle and laser', () => {
  test('tool shows policy options and refreshes without changing configuration', async ({ page }) => {
    await page.route('**/api/tool*', route => route.fulfill({ json: {
      toolChangePolicy: 0,
      toolChangeX: 0,
      toolChangeY: 0,
      toolChangeZ: 0,
      toolProbeX: 0,
      toolProbeY: 0,
      toolProbeZ: 0,
      toolProbeCommand: 'G38.2',
      toolProbeDistance: 1,
      toolProbeFeedrate: 10,
      touchPlateHeight: 0,
    } }));
    await openAllWidgets(page);
    const root = widget(page, 'tool');

    const policyButton = root.getByRole('button', { name: 'Tool Change Policy', exact: true });
    const initialPolicy = (await policyButton.innerText()).trim();
    expect([
      'Ignore M6 commands (Default)',
      'Send M6 commands',
      'Manual Tool Change (WCS)',
      'Manual Tool Change (TLO)',
      'Manual Tool Change (Custom Probing)',
    ]).toContain(initialPolicy);
    await expect(root.getByRole('button', { name: 'Refresh tool configuration', exact: true })).toBeVisible();

    await policyButton.click();
    await waitForMenuReady(page);
    expect(await menuItemTexts(page)).toEqual([
      'Ignore M6 commands (Default)',
      'Send M6 commands',
      'Manual Tool Change (WCS)',
      'Manual Tool Change (TLO)',
      'Manual Tool Change (Custom Probing)',
    ]);
    await closeMenu(page);

    await root.getByRole('button', { name: 'Refresh tool configuration', exact: true }).click();
    await expect(policyButton).toHaveText(initialPolicy);
  });

  test('tool custom probe editor is reachable from a read-only configuration', async ({ page }) => {
    await page.route('**/api/tool*', route => {
      if (route.request().method() !== 'GET') {
        return route.abort();
      }
      return route.fulfill({
        json: {
          toolChangePolicy: 4,
          toolChangeX: 0,
          toolChangeY: 0,
          toolChangeZ: 0,
          toolProbeX: 0,
          toolProbeY: 0,
          toolProbeZ: 0,
          toolProbeCustomCommands: '',
          toolProbeCommand: 'G38.2',
          toolProbeDistance: 1,
          toolProbeFeedrate: 10,
          touchPlateHeight: 0,
        },
      });
    });

    await openAllWidgets(page);
    const root = widget(page, 'tool');

    await expect(root).toContainText('Manual Tool Change (Custom Probing)');
    await expect(root.getByLabel('Tool Change X')).toBeVisible();
    await expect(root.getByLabel('Tool Probe Z')).toBeVisible();
    await expect(root).toContainText('Warning: No custom tool probe commands are defined');
    await expect(root.getByRole('button', { name: 'Use machine X position', exact: true })).toBeDisabled();
    for (const prefix of ['Tool Change', 'Tool Probe']) {
      for (const axis of ['X', 'Y', 'Z']) {
        const field = root.getByLabel(`${prefix} ${axis}`, { exact: true });
        const group = field.locator('xpath=ancestor::*[@data-tonic="InputGroup"][1]');
        const segments = await group.evaluate(element => [...element.children].map(child => child.getBoundingClientRect().toJSON()));
        for (let index = 1; index < segments.length; index += 1) {
          expect(segments[index].left - segments[index - 1].right).toBeGreaterThanOrEqual(-2);
          expect(segments[index].left - segments[index - 1].right).toBeLessThanOrEqual(1);
        }
        await expect(group.getByText(axis, { exact: true })).toBeVisible();
        await expect(group.getByText('mm', { exact: true })).toBeVisible();
      }
    }

    await root.getByRole('button', { name: 'Edit custom tool probe commands', exact: true }).click();
    const textarea = root.getByRole('textbox', { name: 'Custom Tool Probe Commands', exact: true });
    await expect(textarea).toBeVisible();
    await root.getByRole('button', { name: 'Insert variable', exact: true }).click();
    await waitForMenuReady(page);
    const variables = await menuItemTexts(page);
    expect(variables).toContain('[tool_change_x]');
    await page.getByRole('menuitem', { name: '[tool_change_x]', exact: true }).click();
    await expect(textarea).toHaveValue(/\[tool_change_x\]/);
    await root.getByRole('button', { name: 'Cancel custom tool probe commands', exact: true }).click();
    await expect(root).toContainText('Warning: No custom tool probe commands are defined');
  });

  test('spindle speed persists and coolant/spindle actions stay disabled', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'spindle');

    for (const title of [
      'Mist Coolant On (M7)',
      'Flood Coolant On (M8)',
      'Coolant Off (M9)',
      'Spindle On, CW (M3)',
      'Spindle On, CCW (M4)',
      'Spindle Off (M5)',
    ]) {
      await expect(root.getByTitle(title)).toBeDisabled();
    }

    const speed = root.getByLabel('Spindle Speed');
    await expect(speed).toHaveValue('1000');
    await speed.fill('12000');
    await expect(speed).toHaveValue('12000');
    await expect.poll(async () => (await readConfig(page)).widgets.spindle.speed).toBe(12000);

    const icons = await readIconContrast(root, 'button');
    const coolantIcons = icons.filter(icon => ['M7', 'M8'].includes(icon.text));
    expect(coolantIcons).toHaveLength(2);
    for (const icon of coolantIcons) {
      expect(icon.hasIcon).toBe(true);
      expect(icon.iconWidth).toBeGreaterThan(8);
      expect(icon.iconHeight).toBeGreaterThan(8);
      expect(icon.contrast).toBeGreaterThan(1.3);
    }
  });

  test('laser readout, panel, slider and numeric settings remain usable while disconnected', async ({ page }) => {
    await openAllWidgets(page);
    const root = widget(page, 'laser');

    const readout = root.getByRole('slider', { name: 'Laser power' }).locator('..').locator('output');
    await expect(readout).toContainText('0%');
    const intensity = root.getByRole('status', { name: 'Laser Intensity Control' });
    await expect(intensity).toHaveText('0%');
    const intensityStyle = await readBorderContrast(intensity);
    expect(intensityStyle.borderWidth).toBeGreaterThanOrEqual(1);
    expect(intensityStyle.contrast).toBeGreaterThan(1.05);

    const powerLabel = root.getByText('Power (%)');
    const panelToggle = root.locator('button[aria-label="Collapse"]').last();
    await panelToggle.click();
    await expect(powerLabel).toBeHidden();
    await root.locator('button[aria-label="Expand"]').last().click();
    await expect(powerLabel).toBeVisible();

    const slider = root.getByRole('slider', { name: 'Laser power' });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('type', 'range');
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '100');

    const sliderPixels = await measureSliderPixels(slider);
    expect(sliderPixels.visibleRatio).toBeGreaterThan(0.04);
    expect(sliderPixels.left).toBeGreaterThan(0);
    expect(sliderPixels.right).toBeGreaterThan(0);
    expect(sliderPixels.strong).toBeGreaterThan(20);

    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue('100');
    await expect(readout).toContainText('100%');
    await expect.poll(async () => (await readConfig(page)).widgets.laser.test.power).toBe(100);

    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('0');
    await expect.poll(async () => (await readConfig(page)).widgets.laser.test.power).toBe(0);

    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('1');
    await expect(readout).toContainText('1%');
    await expect.poll(async () => (await readConfig(page)).widgets.laser.test.power).toBe(1);

    const duration = root.getByLabel('Test duration in milliseconds');
    await duration.fill('500');
    await expect.poll(async () => (await readConfig(page)).widgets.laser.test.duration).toBe(500);
    const maxS = root.getByLabel('Maximum S value');
    await maxS.fill('2000');
    await expect.poll(async () => (await readConfig(page)).widgets.laser.test.maxS).toBe(2000);

    await expect(root.getByRole('button', { name: 'Laser Test', exact: true })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Laser Off', exact: true })).toBeDisabled();
  });
});
