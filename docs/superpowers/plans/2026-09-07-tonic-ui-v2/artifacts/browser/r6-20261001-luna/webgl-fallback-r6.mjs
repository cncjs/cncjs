import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = '/tmp/cncjs-r6-20261001/webgl-fallback-e4.gcode';
const fixture = 'G21\nG90\nG0 X0 Y0 Z0\nG1 X2 Y3 Z-1 F100\n';
fs.writeFileSync(fixturePath, fixture, 'ascii');
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-webgl', '--disable-webgl2', '--disable-3d-apis'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: process.env.R6_STORAGE_STATE,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const result = {
  browser: { version: browser.version(), viewport: '1440x900', dpr: 1, headless: true, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] },
  gates: [],
  fixture: { name: path.basename(fixturePath), bytes: Buffer.byteLength(fixture), sha256: crypto.createHash('sha256').update(fixture).digest('hex') },
  setup: {},
  commandNamesAfterLoadStart: [],
  pageErrors: [],
  requestFailures: [],
  consoleIssues: [],
};
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 1000)));
page.on('requestfailed', request => result.requestFailures.push({ resourceType: request.resourceType(), error: request.failure()?.errorText }));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 1000) });
});
const decodeSocketPayload = (payload = '') => {
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
let websocketTransportActive = false;
const recordPacket = packet => {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (event === 'command' && typeof args[1] === 'string') result.commandNamesAfterLoadStart.push(args[1]);
  } catch (_) { /* Ignore non-command Socket.IO packets. */ }
};
page.on('request', request => {
  if (websocketTransportActive || request.method() !== 'POST' || !request.url().includes('/socket.io/')) return;
  for (const packet of decodeSocketPayload(request.postData() || '')) recordPacket(packet);
});
page.on('websocket', socket => socket.on('framesent', frame => {
  websocketTransportActive = true;
  if (typeof frame.payload === 'string') recordPacket(frame.payload);
}));

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  await visualizer.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const capability = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    let context = null;
    try { context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); } catch (_) {}
    return {
      webglContextAvailable: Boolean(context),
      webglConstructorAvailable: Boolean(window.WebGLRenderingContext),
      pageCanvasCount: document.querySelectorAll('canvas').length,
      configDisabled: Object.keys(localStorage).some(key => key.includes('visualizer')),
    };
  });
  if (capability.webglContextAvailable) throw new Error(`Fallback setup did not disable WebGL: ${JSON.stringify(capability)}`);
  const toolbar = visualizer.getByRole('button', { name: '3D View', exact: true });
  const enableTitle = await toolbar.getAttribute('title');
  if (enableTitle !== 'Enable 3D View') throw new Error(`Expected unavailable 3D toggle title, got ${enableTitle}`);
  await visualizer.getByRole('button', { name: '3D View options', exact: true }).click();
  const webglStatus = await visualizer.getByText('Disabled', { exact: true }).innerText();
  const perspective = visualizer.getByRole('menuitem', { name: /Perspective Projection/ });
  const perspectiveDisabled = await perspective.isDisabled();
  const screenshot = path.join(artifactDir, 'webgl-fallback-r6.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  result.gates.push({ name: 'real WebGL-unavailable fallback keeps workspace usable and disables 3D controls', status: 'passed', capability, enableTitle, webglStatus, perspectiveDisabled, screenshot: path.basename(screenshot) });
  if (webglStatus !== 'Disabled' || !perspectiveDisabled) throw new Error(`Unavailable controls were not disabled: ${JSON.stringify({ webglStatus, perspectiveDisabled })}`);

  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const closeConnection = connection.getByRole('button', { name: 'Close', exact: true });
  if (!(await closeConnection.isVisible().catch(() => false))) {
    const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
    if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
    const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
    if (await grbl.getAttribute('data-selected') === null) await grbl.click();
    await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
    const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
    await option.waitFor({ state: 'visible', timeout: 45000 });
    result.setup.port = (await option.innerText()).trim();
    await option.click();
    const open = connection.getByRole('button', { name: 'Open', exact: true });
    await open.waitFor({ state: 'visible' });
    if (!(await open.isEnabled())) throw new Error('Open is disabled after selecting the synthetic Grbl port');
    await open.click();
    await closeConnection.waitFor({ state: 'visible', timeout: 20000 });
    result.setup.connectedSimulator = true;
  } else {
    result.setup.connectedSimulator = true;
    result.setup.alreadyConnected = true;
  }

  const closeGcode = visualizer.getByRole('button', { name: 'Close G-code file', exact: true });
  if (await closeGcode.isEnabled().catch(() => false)) {
    await closeGcode.click();
    await page.waitForFunction(() => !document.querySelector('[role="region"][aria-label="3D Visualizer widget"]')?.innerText.includes('Loading'));
  }
  const commandStart = result.commandNamesAfterLoadStart.length;
  const upload = visualizer.getByRole('button', { name: 'Upload G-code', exact: true });
  if (!(await upload.isEnabled())) throw new Error('Upload G-code is disabled before engine-unavailable fixture load');
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(fixturePath);
  else await visualizer.locator('input[type="file"]').first().setInputFiles(fixturePath);
  const run = visualizer.getByRole('button', { name: 'Run', exact: true });
  await run.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const root = document.querySelector('[role="region"][aria-label="3D Visualizer widget"]');
    if (!root) return false;
    const runButton = [...root.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Run');
    const closeButton = [...root.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Close G-code file');
    return runButton && !runButton.disabled && closeButton && !closeButton.disabled && !root.innerText.includes('Loading') && !root.innerText.includes('Rendering');
  }, null, { timeout: 20000 });
  const loadedScreenshot = path.join(artifactDir, 'webgl-fallback-gcode-loaded-r6.png');
  await page.screenshot({ path: loadedScreenshot, fullPage: true });
  const loadCommands = result.commandNamesAfterLoadStart.slice(commandStart);
  const loadingState = {
    runEnabled: await run.isEnabled(),
    closeEnabled: await closeGcode.isEnabled(),
    loadingIndicator: await visualizer.getByText('Loading', { exact: true }).count(),
    renderingIndicator: await visualizer.getByText('Rendering', { exact: true }).count(),
    canvasCount: await visualizer.locator('canvas').count(),
    commandNames: loadCommands,
    screenshot: path.basename(loadedScreenshot),
  };
  if (!loadingState.runEnabled || !loadingState.closeEnabled || loadingState.loadingIndicator !== 0 || loadingState.renderingIndicator !== 0 || loadCommands.filter(name => name === 'sender_load').length !== 1) {
    throw new Error(`Engine-unavailable G-code load did not settle correctly: ${JSON.stringify(loadingState)}`);
  }
  result.gates.push({ name: 'G-code upload completes without a WebGL engine', status: 'passed', ...loadingState });

  await closeGcode.click();
  await page.waitForFunction(() => {
    const root = document.querySelector('[role="region"][aria-label="3D Visualizer widget"]');
    if (!root) return false;
    const runButton = [...root.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Run');
    const closeButton = [...root.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Close G-code file');
    return runButton?.disabled && closeButton?.disabled && !root.innerText.includes('Loading') && !root.innerText.includes('Rendering');
  }, null, { timeout: 15000 });
  const unloadCommands = result.commandNamesAfterLoadStart.slice(commandStart);
  const unloadedScreenshot = path.join(artifactDir, 'webgl-fallback-gcode-unloaded-r6.png');
  await page.screenshot({ path: unloadedScreenshot, fullPage: true });
  if (unloadCommands.filter(name => name === 'sender_load').length !== 1 || unloadCommands.filter(name => name === 'sender_unload').length !== 1 || unloadCommands.some(name => !['sender_load', 'sender_unload'].includes(name))) {
    throw new Error(`Engine-unavailable upload/unload emitted unexpected command sequence: ${JSON.stringify(unloadCommands)}`);
  }
  result.gates.push({ name: 'G-code unload clears unavailable-engine UI state', status: 'passed', runDisabled: await run.isDisabled(), closeDisabled: await closeGcode.isDisabled(), commandNames: unloadCommands, screenshot: path.basename(unloadedScreenshot) });
  result.gates[0].status = 'passed';
} catch (error) {
  result.gates.push({ name: 'real WebGL-unavailable fallback keeps workspace usable and disables 3D controls', status: 'failed', error: String(error).slice(0, 1400) });
  await page.screenshot({ path: path.join(artifactDir, 'webgl-fallback-r6-failure.png'), fullPage: true }).catch(() => {});
} finally {
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'webgl-fallback-r6-complete.json'), JSON.stringify(result, null, 2) + '\n');
  await context.close();
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
