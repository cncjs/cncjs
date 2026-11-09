import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
page.setDefaultTimeout(6000);
page.setDefaultNavigationTimeout(12000);
const results = [];
const events = { console: [], pageErrors: [], unhandledRejections: [], requestFailures: [], httpErrors: [] };
await page.addInitScript(() => {
  window.addEventListener('unhandledrejection', event => {
    window.__r6UnhandledRejections ||= [];
    window.__r6UnhandledRejections.push(String(event.reason));
  });
});
page.on('console', message => events.console.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => events.pageErrors.push(String(error)));
page.on('requestfailed', request => events.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
page.on('response', response => {
  if (response.status() >= 400) events.httpErrors.push({ status: response.status(), url: response.url() });
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'passed', detail: detail ?? null });
  } catch (error) {
    results.push({ name, status: 'failed', error: String(error) });
  }
  fs.writeFileSync(path.join(artifactDir, 'workspace-gates-progress.json'), JSON.stringify({ browserVersion: browser.version(), results }, null, 2) + '\n');
}

await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText('Connection', { exact: true }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

await check('Widget Manager modal focus trap/return', async () => {
  const trigger = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await page.waitForTimeout(150);
  let title = '';
  let focusInside = false;
  let tabStayedInside = false;
  let focusReturned = false;
  try {
    title = await dialog.innerText();
    focusInside = await dialog.evaluate(node => node.contains(document.activeElement));
    await page.keyboard.press('Tab');
    tabStayedInside = await dialog.evaluate(node => node.contains(document.activeElement));
  } finally {
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }
  focusReturned = await trigger.evaluate(node => node === document.activeElement);
  if (!focusInside) throw new Error('Modal did not move focus inside on open');
  if (!tabStayedInside) throw new Error('Tab escaped the open modal');
  if (!focusReturned) throw new Error('Escape close did not return focus to opener');
  return { title: title.slice(0, 160), focusInside, tabStayedInside, focusReturned };
});

await check('enable inactive Custom Widget to render all 16 framed widgets', async () => {
  const trigger = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  let saved = false;
  try {
    const custom = dialog.getByRole('checkbox', { name: 'Custom Widget' });
    if (!await custom.isChecked()) await custom.locator('xpath=..').click();
    if (!await custom.isChecked()) throw new Error('Clicking the visible Custom Widget checkbox did not select it');
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    saved = true;
  } finally {
    if (!saved && await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }
  await page.getByRole('region', { name: 'Custom widget' }).waitFor({ state: 'visible', timeout: 5000 });
  return { customVisible: true, inactiveCountLabel: await page.getByRole('button', { name: /Manage Widgets \(/ }).first().getAttribute('aria-label') };
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }]) {
  await check(`workspace ${viewport.width}x${viewport.height} DPR1`, async () => {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      dpr: devicePixelRatio,
      widgetRegions: [...document.querySelectorAll('[role="region"][aria-label]')]
        .map(node => node.getAttribute('aria-label'))
        .filter(label => /widget/i.test(label)),
      canvasCount: document.querySelectorAll('canvas').length,
      overflowX: document.documentElement.scrollWidth > innerWidth,
      mainRect: (() => {
        const rect = document.querySelector('main')?.getBoundingClientRect();
        return rect ? { x: rect.x, width: rect.width, right: rect.right } : null;
      })(),
      visualizerWidgetRect: (() => {
        const node = document.querySelector('[aria-label="3D Visualizer widget"]');
        const rect = node?.getBoundingClientRect();
        return rect ? { x: rect.x, width: rect.width, right: rect.right } : null;
      })(),
      visualizerHostRect: (() => {
        const node = document.querySelector('[aria-label="3D Visualizer"]');
        const rect = node?.getBoundingClientRect();
        return rect ? { x: rect.x, width: rect.width, right: rect.right, clientWidth: node.clientWidth } : null;
      })(),
      canvasRect: (() => {
        const rect = document.querySelector('canvas')?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null;
      })(),
      keyWidgetRects: Object.fromEntries(['Connection widget', 'Console widget', 'Webcam widget', 'Custom widget', 'Axes widget']
        .map(label => {
          const node = [...document.querySelectorAll('[role="region"][aria-label]')]
            .find(element => element.getAttribute('aria-label').toLowerCase() === label.toLowerCase());
          if (!node) return [label, null];
          const rect = node.getBoundingClientRect();
          return [label, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }];
        })),
      panelActions: [...document.querySelectorAll('main button[aria-label^="Manage Widgets"]')].map(node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, right: rect.right, width: rect.width, label: node.getAttribute('aria-label') };
      }),
    }));
    await page.screenshot({ path: path.join(artifactDir, `workspace-${viewport.width}x${viewport.height}.png`) });
    if (state.dpr !== 1) throw new Error(`DPR was ${state.dpr}`);
    const visualizer = state.widgetRegions.find(label => /visualizer/i.test(label));
    const framedCount = state.widgetRegions.filter(label => !/visualizer/i.test(label)).length;
    if (framedCount !== 16 || !visualizer) throw new Error(`Expected 16 framed widgets plus Visualizer, got ${framedCount} frame regions and ${visualizer ? 'a' : 'no'} Visualizer region`);
    if (state.canvasCount !== 1) throw new Error(`Expected one WebGL canvas, got ${state.canvasCount}`);
    if (state.overflowX) throw new Error(`Document width exceeds viewport ${viewport.width}px`);
    if (state.mainRect.x < 0 || state.mainRect.right > viewport.width) throw new Error(`Workspace main is outside the viewport: ${JSON.stringify(state.mainRect)}`);
    if (state.panelActions.length !== 2 || state.panelActions.some(rect => rect.x < 0 || rect.right > viewport.width)) {
      throw new Error(`Panel manager controls are not reachable in the viewport: ${JSON.stringify(state.panelActions)}`);
    }
    for (const label of ['Connection widget', 'Axes widget']) {
      const rect = state.keyWidgetRects[label];
      if (!rect || rect.x < 0 || rect.right > viewport.width) throw new Error(`${label} is outside the viewport: ${JSON.stringify(rect)}`);
    }
    if (!state.visualizerHostRect || Math.abs(state.visualizerHostRect.width - state.visualizerHostRect.clientWidth) > 1) {
      throw new Error(`Visualizer host width is inconsistent: ${JSON.stringify(state.visualizerHostRect)}`);
    }
    if (Math.abs(state.canvasRect.width - state.visualizerHostRect.clientWidth) > 1) {
      throw new Error(`WebGL canvas does not follow its host width: ${JSON.stringify({ canvas: state.canvasRect, host: state.visualizerHostRect })}`);
    }
    if (viewport.width === 768) {
      const axes = page.getByRole('region', { name: 'Axes widget' });
      const action = axes.getByRole('button', { name: 'Z axis actions' });
      const rightScroll = await action.evaluate(node => {
        let container = node.parentElement;
        while (container && (!['auto', 'scroll'].includes(getComputedStyle(container).overflowX) || container.scrollWidth <= container.clientWidth)) {
          container = container.parentElement;
        }
        const rect = container?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      });
      if (!rightScroll) throw new Error('Axes did not have a horizontal scroll container');
      await page.mouse.move(rightScroll.x + 40, rightScroll.y + 90);
      await page.mouse.wheel(600, 0);
      await page.waitForTimeout(100);
      const reachable = await action.evaluate(node => {
        let container = node.parentElement;
        while (container && (!['auto', 'scroll'].includes(getComputedStyle(container).overflowX) || container.scrollWidth <= container.clientWidth)) {
          container = container.parentElement;
        }
        const rect = node.getBoundingClientRect();
        const containerRect = container?.getBoundingClientRect();
        return {
          disabled: node.matches(':disabled'),
          scrollLeft: container?.scrollLeft ?? 0,
          containerRight: containerRect?.right ?? null,
          x: rect.x,
          right: rect.right,
        };
      });
      if (reachable.scrollLeft <= 0 || reachable.x < 0 || reachable.right > viewport.width || reachable.right > reachable.containerRight) {
        throw new Error(`Narrow Axes actions are not horizontally reachable: ${JSON.stringify(reachable)}`);
      }
      state.axesActionReachability = reachable;

      const smoothie = page.getByRole('button', { name: 'Smoothie', exact: true });
      const leftScroll = await smoothie.evaluate(node => {
        let container = node.parentElement;
        while (container && (!['auto', 'scroll'].includes(getComputedStyle(container).overflowX) || container.scrollWidth <= container.clientWidth)) {
          container = container.parentElement;
        }
        const rect = container?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      });
      if (!leftScroll) throw new Error('Connection did not have a horizontal scroll container');
      await page.mouse.move(leftScroll.x + 40, leftScroll.y + 90);
      await page.mouse.wheel(600, 0);
      await page.waitForTimeout(100);
      await smoothie.focus();
      const leftTabReachability = await smoothie.evaluate(node => {
        let container = node.parentElement;
        while (container && (!['auto', 'scroll'].includes(getComputedStyle(container).overflowX) || container.scrollWidth <= container.clientWidth)) {
          container = container.parentElement;
        }
        const rect = node.getBoundingClientRect();
        return { focused: node === document.activeElement, scrollLeft: container?.scrollLeft ?? 0, x: rect.x, right: rect.right };
      });
      if (!leftTabReachability.focused || leftTabReachability.x < 0 || leftTabReachability.right > viewport.width) {
        throw new Error(`Keyboard could not reach the compact Smoothie tab: ${JSON.stringify(leftTabReachability)}`);
      }
      await smoothie.press('Enter');
      if (await smoothie.getAttribute('data-selected') === null) throw new Error('Keyboard could not activate the horizontally scrolled Smoothie tab');
      state.leftTabReachability = leftTabReachability;
    }
    return state;
  });
}

await page.setViewportSize({ width: 1440, height: 900 });
await check('appearance device/dark/light menu choices at both viewports', async () => {
  const menuToggle = page.locator('header button[aria-haspopup="menu"]').last();
  const states = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    const choices = ['Dark theme', 'Light theme', 'Use device theme'];
    let darkColors;
    let lightColors;
    try {
      for (const choice of choices) {
        await menuToggle.click();
        await page.getByRole('menuitem', { name: /Appearance:/ }).click();
        await page.getByText(choice, { exact: true }).last().click();
        await page.waitForTimeout(200);
        const colors = await page.evaluate(() => {
          const parseColor = value => {
            const match = value.match(/rgba?\(([^)]+)\)/);
            if (!match) return null;
            const channels = match[1].split(',').map(Number);
            return { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 };
          };
          const composite = (front, back) => ({
            r: front.r * front.a + back.r * (1 - front.a),
            g: front.g * front.a + back.g * (1 - front.a),
            b: front.b * front.a + back.b * (1 - front.a),
            a: 1,
          });
          const backgroundFor = node => {
            let background = { r: 255, g: 255, b: 255, a: 1 };
            for (let current = node; current; current = current.parentElement) {
              const color = parseColor(getComputedStyle(current).backgroundColor);
              if (color && color.a > 0) {
                background = composite(color, background);
                if (color.a === 1) break;
              }
            }
            return background;
          };
          const luminance = ({ r, g, b }) => {
            const linear = value => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
          };
          const contrast = (foreground, background) => {
            const fg = composite(foreground, background);
            const [lighter, darker] = [luminance(fg), luminance(background)].sort((a, b) => b - a);
            return (lighter + 0.05) / (darker + 0.05);
          };
          const samples = {};
          const findLeaf = (region, predicate) => [...region.querySelectorAll('*')]
            .find(node => predicate(node.textContent.trim()) && node.getClientRects().length);
          for (const [label, tests] of Object.entries({
            'Connection widget': [text => text === 'Connection', text => text.toLowerCase() === 'serial port'],
            'Axes widget': [text => text === 'Axes', text => text === 'Axis'],
            'Autolevel Widget': [text => text.toUpperCase().includes('PROBE NEW SURFACE'), text => text.startsWith('Set up the probe area')],
          })) {
            const region = [...document.querySelectorAll('[role="region"][aria-label]')]
              .find(node => node.getAttribute('aria-label').toLowerCase() === label.toLowerCase());
            if (!region) throw new Error(`Missing theme sample region ${label}`);
            samples[label] = tests.map(predicate => {
              const node = findLeaf(region, predicate);
              if (!node) throw new Error(`Missing theme sample text in ${label}`);
              const foreground = parseColor(getComputedStyle(node).color);
              const background = backgroundFor(node);
              return { text: node.textContent.trim().slice(0, 48), foreground, background, contrast: contrast(foreground, background) };
            });
          }
          const selectors = ['body', 'header', 'nav', 'main', '[aria-label="Application header"]'];
          return { selectors: Object.fromEntries(selectors.map(selector => {
            const node = document.querySelector(selector);
            if (!node) return [selector, null];
            const style = getComputedStyle(node);
            return [selector, { background: style.backgroundColor, color: style.color }];
          })), samples };
        });
        states.push({ viewport, choice, colors });
        if (choice === 'Dark theme') darkColors = colors;
        if (choice === 'Light theme') lightColors = colors;
        await page.screenshot({ path: path.join(artifactDir, `workspace-theme-${choice === 'Use device theme' ? 'auto' : choice === 'Dark theme' ? 'dark' : 'light'}-${viewport.width}x${viewport.height}.png`) });
      }
    } finally {
      await page.keyboard.press('Escape');
      if (await menuToggle.getAttribute('aria-expanded') === 'true') await menuToggle.click();
    }
    const changed = JSON.stringify(darkColors?.samples) !== JSON.stringify(lightColors?.samples);
    if (!changed) throw new Error(`Dark and light theme did not change sampled visible colors at ${viewport.width}x${viewport.height}`);
    for (const mode of [darkColors, lightColors]) {
      for (const [label, samples] of Object.entries(mode.samples)) {
        for (const sample of samples) {
          if (sample.contrast < 4.5) throw new Error(`${label} text contrast is ${sample.contrast.toFixed(2)}:1 for ${JSON.stringify(sample)}`);
        }
      }
    }
    const autoColors = states.at(-1)?.colors;
    if (JSON.stringify(autoColors?.samples) !== JSON.stringify(lightColors?.samples)) throw new Error(`Auto theme under light device preference did not restore light colors at ${viewport.width}x${viewport.height}`);
  }
  return states;
});

await check('keyboard navigation menu open and Escape close', async () => {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(350);
    const marginBefore = await page.locator('main').evaluate(node => getComputedStyle(node).marginLeft);
    await toggle.focus();
    if (!await toggle.evaluate(node => node === document.activeElement)) throw new Error('Navigation toggle did not receive keyboard focus');
    await toggle.press('Enter');
    await page.waitForFunction(before => getComputedStyle(document.querySelector('main')).marginLeft !== before, marginBefore, { timeout: 3000 });
    const marginExpanded = await page.locator('main').evaluate(node => getComputedStyle(node).marginLeft);
    await toggle.press('Enter');
    await page.waitForFunction(expanded => getComputedStyle(document.querySelector('main')).marginLeft !== expanded, marginExpanded, { timeout: 3000 });
  const marginRestored = await page.locator('main').evaluate(node => getComputedStyle(node).marginLeft);
  if (marginBefore === marginExpanded || marginBefore !== marginRestored) throw new Error(`Keyboard toggle margins did not expand and restore (${marginBefore}, ${marginExpanded}, ${marginRestored})`);
  return { marginBefore, marginExpanded, marginRestored };
});

await check('bulk and single widget collapse/expand', async () => {
  const collapse = page.getByRole('button', { name: 'Collapse all left panel widgets' });
  await collapse.click();
  const expand = page.getByRole('button', { name: 'Expand all left panel widgets' });
  const expandCount = await expand.count();
  const connectionRegion = page.getByRole('region', { name: 'Connection widget' });
  const connectionCollapsed = await connectionRegion.getByRole('button', { name: 'Expand' }).count();
  if (!expandCount || !connectionCollapsed) throw new Error('Bulk collapse did not expose expand state for panel and widget');
  await expand.click();
  const connectionRestored = await connectionRegion.getByRole('button', { name: 'Collapse' }).count();
  if (!connectionRestored) throw new Error('Bulk expand did not restore widget content');
  const consoleRegion = page.getByRole('region', { name: 'Console widget' });
  await consoleRegion.getByRole('button', { name: 'Collapse' }).click();
  const singleCollapsed = await consoleRegion.getByRole('button', { name: 'Expand' }).count();
  if (!singleCollapsed) throw new Error('Single widget collapse did not expose expand control');
  await consoleRegion.getByRole('button', { name: 'Expand' }).click();
  const restored = await consoleRegion.getByRole('button', { name: 'Collapse' }).count();
  if (!restored) throw new Error('Single widget expand did not restore collapse control');
  return { expandCount, connectionCollapsed, connectionRestored, singleCollapsed, restored };
});

await check('Console fullscreen enter and exit', async () => {
  const consoleRegion = page.getByRole('region', { name: 'Console widget' });
  await consoleRegion.getByRole('button', { name: 'Enter full screen' }).click();
  const exitCount = await page.getByRole('region', { name: 'Console widget' }).getByRole('button', { name: 'Exit full screen' }).count();
  if (exitCount !== 1) throw new Error(`Fullscreen did not expose exit control (count ${exitCount})`);
  await page.getByRole('region', { name: 'Console widget' }).getByRole('button', { name: 'Exit full screen' }).click();
  const restored = await page.getByRole('region', { name: 'Console widget' }).getByRole('button', { name: 'Enter full screen' }).count();
  if (restored !== 1) throw new Error('Fullscreen exit did not restore entry control');
  return { exitCount, restored };
});

await check('Connection controller tabs switch', async () => {
  const connection = page.getByRole('region', { name: 'Connection widget' });
  const selected = [];
  for (const tab of ['Grbl', 'Marlin', 'Smoothie', 'TinyG']) {
    const button = connection.getByRole('button', { name: tab, exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    const isSelected = await button.getAttribute('data-selected') !== null;
    selected.push({ tab, isSelected, ariaPressed: await button.getAttribute('aria-pressed'), ariaSelected: await button.getAttribute('aria-selected') });
    if (!isSelected) throw new Error(`Keyboard selection did not activate ${tab}`);
  }
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  await grbl.focus();
  await page.keyboard.press('Enter');
  if (await grbl.getAttribute('data-selected') === null) throw new Error('Keyboard selection did not restore Grbl');
  const snapshot = await connection.ariaSnapshot();
  for (const tab of ['Grbl', 'Marlin', 'Smoothie', 'TinyG']) {
    if (!snapshot.includes(`button "${tab}"`)) throw new Error(`Controller tab ${tab} disappeared after selection`);
  }
  return selected;
});

events.unhandledRejections = await page.evaluate(() => window.__r6UnhandledRejections || []);
fs.writeFileSync(path.join(artifactDir, 'workspace-gates.json'), JSON.stringify({ browserVersion: browser.version(), viewport: { width: 1440, height: 900 }, dpr: 1, results, events }, null, 2) + '\n');
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ results, eventCounts: Object.fromEntries(Object.entries(events).map(([key, value]) => [key, value.length])) }, null, 2));
