import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const expectedFrames = [
  'Autolevel Widget', 'Axes widget', 'Connection widget', 'Console widget', 'Custom widget', 'G-code widget',
  'Grbl widget', 'Laser widget', 'Macro widget', 'Marlin widget', 'Probe widget', 'Smoothie widget',
  'Spindle widget', 'TinyG widget', 'Tool widget', 'Webcam widget',
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  storageState: process.env.R6_STORAGE_STATE,
});
await context.grantPermissions(['camera'], { origin: 'http://127.0.0.1:8080' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', headless: true, viewportInitial: '1440x900', dpr: 1, renderer: 'SwiftShader WebGL', camera: 'Chromium synthetic camera device' },
  gates: [],
  expectedFrameNames: expectedFrames,
  screenshots: [],
  consoleIssues: [],
  pageErrors: [],
  requestFailures: [],
  outgoingCommands: [],
};
const decodePayload = (payload = '') => {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const length = Number(payload.slice(cursor, colon));
      const start = colon + 1;
      const packet = payload.slice(start, start + length);
      if (packet.length !== length) break;
      packets.push(packet);
      cursor = start + length;
    } else {
      const separator = payload.indexOf('\x1e', cursor);
      packets.push(payload.slice(cursor, separator < 0 ? payload.length : separator));
      if (separator < 0) break;
      cursor = separator + 1;
    }
  }
  return packets;
};
function recordPacket(packet, transport) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (!['command', 'write', 'writeln'].includes(event)) return;
    const name = event === 'command' ? String(args[1] || '') : event;
    const payload = event === 'command' ? args[2] : args[1];
    const normalized = typeof payload === 'string' ? payload.trim().split(/\s+/, 1)[0].toUpperCase() : '';
    const category = (event === 'command' && name === 'gcode' && ['?', '$G', '$#', '$$', '$I', '$N'].includes(String(payload || '').trim().toUpperCase()))
      || (['write', 'writeln'].includes(event) && ['?', '$G', '$#', '$$', '$I', '$N'].includes(String(payload || '').trim().toUpperCase()))
      ? 'read'
      : (event === 'command' && name === 'gcode' && ['G20', 'G21', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G90', 'G91'].includes(normalized))
        ? 'setup'
        : 'mutation';
    result.outgoingCommands.push({ event, name, category, transport });
  } catch (_) { /* Ignore unrelated Socket.IO packets. */ }
}
page.on('request', request => {
  if (request.method() !== 'POST' || !request.url().includes('/socket.io/')) return;
  for (const packet of decodePayload(request.postData() || '')) recordPacket(packet, 'polling');
});
page.on('websocket', socket => socket.on('framesent', frame => {
  if (typeof frame.payload === 'string') recordPacket(frame.payload, 'websocket');
}));
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 900)));
page.on('requestfailed', request => result.requestFailures.push({ type: request.resourceType(), error: request.failure()?.errorText }));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 1200) });
});

const flush = () => fs.writeFileSync(path.join(artifactDir, 'workspace-widget-views-r6-progress.json'), JSON.stringify(result, null, 2) + '\n');
async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: String(error).slice(0, 1200), ...(result.themeTrace ? { themeTrace: result.themeTrace } : {}) });
    const screenshot = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await page.screenshot({ path: path.join(artifactDir, `workspace-widget-view-failure-${screenshot}`), fullPage: true }).catch(() => {});
  }
  flush();
}
async function connectedToGrbl() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) return { alreadyConnected: true };
  const automatic = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await automatic.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await option.waitFor({ state: 'visible', timeout: 45000 });
  const port = (await option.innerText()).trim();
  await option.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!(await open.isEnabled())) throw new Error('Grbl simulator Open button remained disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  return { alreadyConnected: false, port };
}
async function enableCustom() {
  const custom = page.getByRole('region', { name: 'Custom widget', exact: true });
  if (await custom.count()) return { alreadyActive: true };
  const trigger = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  try {
    const checkbox = dialog.getByRole('checkbox', { name: 'Custom Widget', exact: true });
    if (!await checkbox.isChecked()) {
      await checkbox.focus();
      await page.keyboard.press('Space');
    }
    if (!await checkbox.isChecked()) throw new Error('Custom Widget checkbox did not select via its visible label');
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await custom.waitFor({ state: 'visible', timeout: 10000 });
    return { alreadyActive: false, enabledThroughManager: true };
  } catch (error) {
    if (await dialog.isVisible().catch(() => false)) await page.keyboard.press('Escape').catch(() => {});
    throw error;
  }
}
function regionByName(name) { return page.getByRole('region', { name, exact: true }); }
async function widgetMore(region) {
  let button = region.getByRole('button', { name: 'More options', exact: true });
  if (!(await button.count())) button = region.locator('button[title="More"]');
  await button.first().click();
}
async function widgetFrameViewCase(name) {
  const region = regionByName(name);
  await region.waitFor({ state: 'visible' });
  const headerControls = region.getByRole('toolbar', { name: 'Widget controls', exact: true }).first();
  const collapse = headerControls.getByRole('button', { name: 'Collapse', exact: true }).first();
  await collapse.waitFor({ state: 'visible' });
  const commandsBefore = result.outgoingCommands.length;
  await collapse.click();
  const expand = headerControls.getByRole('button', { name: 'Expand', exact: true }).first();
  await expand.waitFor({ state: 'visible' });
  const collapsed = await expand.getAttribute('aria-expanded');
  const contentState = await region.evaluate(node => {
    const content = [...node.children].find(child => child.hasAttribute('data-widget-content') ||
      (child.hasAttribute('aria-hidden') && !['SVG', 'I'].includes(child.tagName)));
    if (!content) return { found: false };
    const rect = content.getBoundingClientRect();
    return {
      found: true,
      ariaHidden: content.getAttribute('aria-hidden'),
      display: getComputedStyle(content).display,
      height: rect.height,
      className: typeof content.className === 'string' ? content.className : '',
    };
  });
  const contentHidden = contentState.found && contentState.ariaHidden === 'true' && (contentState.display === 'none' || contentState.height === 0);
  if (collapsed !== 'false' || !contentHidden) throw new Error(`Collapse did not hide its widget content: expanded=${collapsed}, content=${JSON.stringify(contentState)}`);
  await expand.click();
  const expandedControl = headerControls.getByRole('button', { name: 'Collapse', exact: true }).first();
  await expandedControl.waitFor({ state: 'visible' });
  const expanded = await expandedControl.getAttribute('aria-expanded');
  const restoredContent = await region.evaluate(node => {
    const content = [...node.children].find(child => child.hasAttribute('data-widget-content') ||
      (child.hasAttribute('aria-hidden') && !['SVG', 'I'].includes(child.tagName)));
    if (!content) return { found: false };
    const rect = content.getBoundingClientRect();
    return { found: true, ariaHidden: content.getAttribute('aria-hidden'), display: getComputedStyle(content).display, height: rect.height };
  });
  if (expanded !== 'true' || !restoredContent.found || restoredContent.ariaHidden === 'true' || restoredContent.display === 'none' || restoredContent.height <= 0) {
    throw new Error(`Expand did not restore widget content: aria-expanded=${expanded}, content=${JSON.stringify(restoredContent)}`);
  }

  await widgetMore(region);
  const enter = page.getByRole('menuitem', { name: /^(Enter Full Screen|Full Screen)$/ }).last();
  const enterLabel = (await enter.innerText()).trim();
  await enter.waitFor({ state: 'visible' });
  if (!(await enter.isEnabled())) throw new Error(`Fullscreen is disabled for ${name}`);
  await enter.click();
  await page.waitForFunction(label => {
    const node = [...document.querySelectorAll('[role="region"][aria-label]')].find(item => item.getAttribute('aria-label') === label);
    return node && getComputedStyle(node).position === 'fixed';
  }, name, { timeout: 5000 });
  const fullscreenRect = await region.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { position: getComputedStyle(node).position, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
  });
  if (fullscreenRect.position !== 'fixed' || fullscreenRect.top < 0 || fullscreenRect.bottom < 800) throw new Error(`Fullscreen geometry is not viewport-sized: ${JSON.stringify(fullscreenRect)}`);
  await widgetMore(region);
  const exit = page.getByRole('menuitem', { name: /^(Exit Full Screen|Full Screen)$/ }).last();
  const exitLabel = (await exit.innerText()).trim();
  await exit.waitFor({ state: 'visible' });
  await exit.click();
  await page.waitForFunction(label => {
    const node = [...document.querySelectorAll('[role="region"][aria-label]')].find(item => item.getAttribute('aria-label') === label);
    return node && getComputedStyle(node).position !== 'fixed';
  }, name, { timeout: 5000 });
  const unexpectedCommands = result.outgoingCommands.slice(commandsBefore).filter(command => command.category !== 'read');
  if (unexpectedCommands.length) throw new Error(`View actions emitted CNC mutations: ${JSON.stringify(unexpectedCommands)}`);
  return { collapsed: true, contentHidden, expanded: true, fullscreenRect, fullscreenExited: true, fullscreenMenuLabels: { enter: enterLabel, exit: exitLabel }, unexpectedMutationCommands: unexpectedCommands.length };
}
async function appearance(choice) {
  const toggle = page.locator('header button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  await page.getByText(choice, { exact: true }).last().click();
  await page.waitForTimeout(250);
}
async function visualizerThemeSample() {
  const visualizer = regionByName('3D Visualizer widget');
  return visualizer.evaluate(node => {
    const header = node.firstElementChild;
    const toggle = node.querySelector('button[aria-label="3D View"]');
    const canvas = node.querySelector('canvas');
    if (!header || !toggle) throw new Error('Visualizer header or 3D View control is missing');
    const parse = value => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const channels = match[1].split(',').map(Number);
      return { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 };
    };
    const composite = (front, back) => ({ r: front.r * front.a + back.r * (1 - front.a), g: front.g * front.a + back.g * (1 - front.a), b: front.b * front.a + back.b * (1 - front.a), a: 1 });
    const base = { r: 255, g: 255, b: 255, a: 1 };
    const layers = [];
    for (let current = toggle; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      layers.push({
        tag: current.tagName,
        role: current.getAttribute('role'),
        label: current.getAttribute('aria-label'),
        className: typeof current.className === 'string' ? current.className : '',
        background: style.backgroundColor,
        opacity: Number(style.opacity),
      });
      if (current === node) break;
    }
    let background = base;
    let inheritedOpacity = 1;
    for (const layer of layers.reverse()) {
      inheritedOpacity *= layer.opacity;
      const color = parse(layer.background);
      if (color && color.a > 0) background = composite({ ...color, a: color.a * inheritedOpacity }, background);
    }
    const effectiveOpacity = layers.reduce((opacity, layer) => opacity * layer.opacity, 1);
    const luminance = ({ r, g, b }) => {
      const channel = value => { const normalized = value / 255; return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const foreground = parse(getComputedStyle(toggle).color);
    const blendedForeground = composite({ ...foreground, a: foreground.a * effectiveOpacity }, background);
    const [lighter, darker] = [luminance(blendedForeground), luminance(background)].sort((a, b) => b - a);
    const rect = canvas?.getBoundingClientRect();
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      headerBackground: getComputedStyle(header).backgroundColor,
      headerColor: getComputedStyle(header).color,
      controlColor: getComputedStyle(toggle).color,
      controlBackground: getComputedStyle(toggle).backgroundColor,
      controlDisabled: toggle.matches(':disabled') || toggle.getAttribute('aria-disabled') === 'true',
      controlText: toggle.innerText.trim(),
      backgroundStack: layers,
      backgroundSample: background,
      controlTextContrast: (lighter + 0.05) / (darker + 0.05),
      canvas: rect ? { width: rect.width, height: rect.height, drawingWidth: canvas.width, drawingHeight: canvas.height } : null,
      webgl: gl ? { version: gl.getParameter(gl.VERSION), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'masked' } : null,
    };
  });
}
async function engineCameraPosition() {
  return page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__?.engines.find(engine => engine.canvasAttached)?.cameraPosition || null);
}
async function waitForThemeBackground(expected, phase) {
  try {
    await page.waitForFunction(color => {
      const header = document.querySelector('[aria-label="3D Visualizer widget"]')?.firstElementChild;
      return header && getComputedStyle(header).backgroundColor === color;
    }, expected, { timeout: 5000 });
  } catch (_) {
    const actual = await visualizerThemeSample();
    const media = await page.evaluate(() => ({ dark: matchMedia('(prefers-color-scheme: dark)').matches, light: matchMedia('(prefers-color-scheme: light)').matches }));
    throw new Error(`${phase} theme color mismatch: expected=${expected}, actual=${actual.headerBackground}, media=${JSON.stringify(media)}`);
  }
}
async function settleThemeTransition() {
  return page.evaluate(async () => {
    const button = document.querySelector('[aria-label="3D Visualizer widget"] button[aria-label="3D View"]');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!button) throw new Error('3D View text button was not available for theme transition settling');
    const animations = button.getAnimations({ subtree: true });
    await Promise.race([
      Promise.all(animations.map(animation => animation.finished.catch(() => {}))),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]);
    return {
      animationCount: animations.length,
      color: getComputedStyle(button).color,
      background: getComputedStyle(button).backgroundColor,
      disabled: button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true',
    };
  });
}
async function exerciseThemeCamera() {
  const actionPositions = {
    'Top View': 'top',
    'Front View': 'front',
    'Right Side View': 'right',
    'Left Side View': 'left',
  };
  const before = await engineCameraPosition();
  const label = Object.keys(actionPositions).find(action => actionPositions[action] !== before);
  if (!label) throw new Error(`No non-selected Visualizer camera action found from ${before}`);
  const expectedPosition = actionPositions[label];
  const cameraButton = regionByName('3D Visualizer widget').getByRole('button', { name: label, exact: true }).last();
  await cameraButton.click();
  try {
    await page.waitForFunction(expected => window.__CNCJS_VISUALIZER_METRICS__?.engines.some(engine => engine.canvasAttached && engine.cameraPosition === expected), expectedPosition, { timeout: 5000 });
  } catch (_) {
    throw new Error(`${label} did not update the camera metric: before=${before}, after=${await engineCameraPosition()}, expected=${expectedPosition}`);
  }
  const after = await engineCameraPosition();
  if (after !== expectedPosition || after === before) throw new Error(`${label} did not change live Visualizer camera: before=${before}, after=${after}, expected=${expectedPosition}`);
  return { label, before, after };
}

await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
await regionByName('Connection widget').waitFor({ state: 'visible', timeout: 30000 });
await page.waitForTimeout(600);
await gate('ensure synthetic Grbl connection', connectedToGrbl);
await gate('activate Custom and verify 16 framed widgets plus no-frame Visualizer', async () => {
  const custom = await enableCustom();
  for (const name of expectedFrames) await regionByName(name).waitFor({ state: 'visible', timeout: 12000 });
  const names = await page.locator('[role="region"][aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  const frameCount = expectedFrames.filter(name => names.includes(name)).length;
  if (frameCount !== 16) throw new Error(`Expected 16 named framed widget regions, got ${frameCount}: ${JSON.stringify(names)}`);
  const visualizer = regionByName('3D Visualizer widget');
  const noFrameShell = await visualizer.evaluate(node => !node.querySelector('.widget-sortable') && !node.querySelector('button[aria-label="Collapse"]') && !node.querySelector('button[aria-label="More options"]'));
  if (!noFrameShell) throw new Error('Visualizer incorrectly rendered a generic frame shell');
  return { custom, frameCount, regionNames: names, visualizerHasNoFrame: noFrameShell };
});

const commonWidgetNames = expectedFrames.filter(name => !['Marlin widget', 'Smoothie widget', 'TinyG widget'].includes(name));
const selectedWidgets = process.env.R6_WIDGET_ONLY?.split('|').filter(Boolean);
const selectedWidgetNames = selectedWidgets ? commonWidgetNames.filter(name => selectedWidgets.includes(name)) : commonWidgetNames;
for (const name of selectedWidgetNames) await gate(`${name} collapse and fullscreen view contract`, () => widgetFrameViewCase(name));

if (process.env.R6_SKIP_THEME !== '1') await gate('Workspace and live Visualizer light/dark/auto at both R6 viewports', async () => {
  const states = [];
  const allViewports = [{ width: 1440, height: 900 }, { width: 768, height: 900 }];
  const viewports = process.env.R6_THEME_VIEWPORT ? allViewports.filter(viewport => viewport.width === Number(process.env.R6_THEME_VIEWPORT)) : allViewports;
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(350);
    const host = await regionByName('3D Visualizer widget').locator('canvas').evaluate(canvas => ({ width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height, drawingWidth: canvas.width, drawingHeight: canvas.height }));
    if (host.width < 1 || host.height < 1 || host.drawingWidth < 1 || host.drawingHeight < 1) throw new Error(`Visualizer canvas is hidden at ${viewport.width}: ${JSON.stringify(host)}`);
    await page.emulateMedia({ colorScheme: 'light' });
    await appearance('Light theme');
    const lightCamera = await exerciseThemeCamera();
    const lightSettled = await settleThemeTransition();
    const light = await visualizerThemeSample();
    result.themeTrace = [...(result.themeTrace || []), { viewport: viewport.width, phase: 'light', expected: light.headerBackground, actual: light.headerBackground, camera: lightCamera, settled: lightSettled, sample: light }];
    await page.screenshot({ path: path.join(artifactDir, `workspace-visualizer-theme-light-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark' });
    await appearance('Dark theme');
    const darkCamera = await exerciseThemeCamera();
    const darkSettled = await settleThemeTransition();
    const dark = await visualizerThemeSample();
    result.themeTrace = [...result.themeTrace, { viewport: viewport.width, phase: 'dark', expected: dark.headerBackground, actual: dark.headerBackground, camera: darkCamera, settled: darkSettled, sample: dark }];
    await page.screenshot({ path: path.join(artifactDir, `workspace-visualizer-theme-dark-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.emulateMedia({ colorScheme: 'light' });
    await appearance('Use device theme');
    await waitForThemeBackground(light.headerBackground, `auto-light/${viewport.width}`);
    const autoLightCamera = await exerciseThemeCamera();
    const autoLightSettled = await settleThemeTransition();
    const autoLight = await visualizerThemeSample();
    result.themeTrace = [...result.themeTrace, { viewport: viewport.width, phase: 'auto-light', expected: light.headerBackground, actual: autoLight.headerBackground, camera: autoLightCamera, settled: autoLightSettled, sample: autoLight }];
    await page.screenshot({ path: path.join(artifactDir, `workspace-visualizer-theme-auto-light-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark' });
    await waitForThemeBackground(dark.headerBackground, `auto-dark/${viewport.width}`);
    const autoDarkCamera = await exerciseThemeCamera();
    const autoDarkSettled = await settleThemeTransition();
    const autoDark = await visualizerThemeSample();
    result.themeTrace = [...result.themeTrace, { viewport: viewport.width, phase: 'auto-dark', expected: dark.headerBackground, actual: autoDark.headerBackground, camera: autoDarkCamera, settled: autoDarkSettled, sample: autoDark }];
    await page.screenshot({ path: path.join(artifactDir, `workspace-visualizer-theme-auto-dark-${viewport.width}x${viewport.height}.png`), fullPage: true });
    if (light.headerBackground === dark.headerBackground) throw new Error(`Visualizer header did not change in light/dark at ${viewport.width}: ${JSON.stringify({ light: light.headerBackground, dark: dark.headerBackground })}`);
    if (light.controlTextContrast < 4.5 || dark.controlTextContrast < 4.5 || autoLight.controlTextContrast < 4.5 || autoDark.controlTextContrast < 4.5) {
      throw new Error(`Visualizer toolbar contrast below 4.5:1 at ${viewport.width}: ${JSON.stringify({ light: light.controlTextContrast, dark: dark.controlTextContrast, autoLight: autoLight.controlTextContrast, autoDark: autoDark.controlTextContrast })}`);
    }
    if (autoLight.headerBackground !== light.headerBackground || autoDark.headerBackground !== dark.headerBackground) throw new Error(`Auto theme did not follow emulated device scheme at ${viewport.width}`);
    states.push({ viewport, host, light: { sample: light, camera: lightCamera }, dark: { sample: dark, camera: darkCamera }, autoLight: { sample: autoLight, camera: autoLightCamera }, autoDark: { sample: autoDark, camera: autoDarkCamera } });
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await appearance('Use device theme');
  return { viewports: states, mediaPreferenceFollowed: true, screenshotCount: states.length * 4 };
});

result.finishedAt = new Date().toISOString();
const finalPath = path.join(artifactDir, 'workspace-widget-views-r6.json');
fs.writeFileSync(finalPath, JSON.stringify(result, null, 2) + '\n');
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ browser: result.browser, gates: result.gates.map(({ name, status, error }) => ({ name, status, error })), pageErrors: result.pageErrors.length, requestFailures: result.requestFailures.length, consoleIssues: result.consoleIssues.length }, null, 2));
