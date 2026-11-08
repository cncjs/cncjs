import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  storageState: process.env.R6_STORAGE_STATE,
});
await context.grantPermissions(['camera'], { origin: 'http://127.0.0.1:8080' });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8080' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', viewport: '1440x900', dpr: 1, camera: 'Chromium synthetic camera device' },
  gates: [], pageErrors: [], requestFailures: [], consoleIssues: [], outgoingCommands: [],
};
let currentStage = '';

const decodePayload = (payload = '') => {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const length = Number(payload.slice(cursor, colon));
      const packet = payload.slice(colon + 1, colon + 1 + length);
      if (packet.length !== length) break;
      packets.push(packet);
      cursor = colon + 1 + length;
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
    const command = typeof payload === 'string' ? payload.trim().toUpperCase() : '';
    const commandPayload = event === 'command' && name === 'gcode' ? command : (typeof args[2] === 'string' && event !== 'command' ? args[2].trim().toUpperCase() : command);
    result.outgoingCommands.push({ event, name, category: ['?', '$G', '$#', '$$', '$I', '$N'].includes(commandPayload) ? 'read' : 'mutation', command: commandPayload.slice(0, 80), transport });
  } catch (_) { /* Ignore unrelated Socket.IO packets. */ }
}
page.on('request', request => {
  if (request.method() === 'POST' && request.url().includes('/socket.io/')) {
    for (const packet of decodePayload(request.postData() || '')) recordPacket(packet, 'polling');
  }
});
page.on('websocket', socket => socket.on('framesent', frame => {
  if (typeof frame.payload === 'string') recordPacket(frame.payload, 'websocket');
}));
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 900)));
page.on('requestfailed', request => result.requestFailures.push({ type: request.resourceType(), error: request.failure()?.errorText, url: request.url().slice(0, 200) }));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 900) });
});

function save(name = 'workspace-console-webcam-r6-progress.json') {
  fs.writeFileSync(path.join(artifactDir, name), JSON.stringify(result, null, 2) + '\n');
}
async function gate(name, action) {
  const started = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - started, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - started, stage: currentStage, error: String(error).slice(0, 1500) });
    await page.screenshot({ path: path.join(artifactDir, `console-webcam-failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true }).catch(() => {});
    const dialog = page.getByRole('dialog').last();
    if (await dialog.isVisible().catch(() => false)) {
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  }
  save();
}
const region = name => page.getByRole('region', { name, exact: true });
async function menuAction(widget, name) {
  await widget.getByRole('button', { name: 'More options', exact: true }).click();
  await page.getByRole('menuitem', { name, exact: true }).last().click();
}
async function setWebcamScale(webcam, video, value) {
  const track = webcam.locator('.rc-slider').first();
  const box = await track.boundingBox();
  if (!box) throw new Error('Webcam scale slider track has no pointer geometry');
  const x = box.x + ((value - 0.1) / (10 - 0.1)) * box.width;
  await page.mouse.click(x, box.y + box.height / 2);
  const slider = webcam.getByRole('slider', { name: 'Image scale', exact: true });
  await page.waitForFunction(({ node, target }) => Math.abs(Number(node.getAttribute('aria-valuenow')) - target) < 0.06, { node: await slider.elementHandle(), target: value });
  return await video.evaluate(node => getComputedStyle(node).width);
}

await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
await region('Connection widget').waitFor({ state: 'visible', timeout: 30000 });
await region('Webcam widget').waitFor({ state: 'visible', timeout: 10000 });
await region('Console widget').waitFor({ state: 'visible' });
await page.waitForTimeout(300);
const connection = region('Connection widget');
if (!await connection.getByRole('button', { name: 'Close', exact: true }).isVisible().catch(() => false)) {
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await port.waitFor({ state: 'visible', timeout: 45000 });
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!await open.isEnabled()) throw new Error('Synthetic Grbl Open button disabled');
  await open.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
}

await gate('Webcam settings Save Cancel and restore without external camera', async () => {
  currentStage = 'open live fake camera';
  const webcam = region('Webcam widget');
  const originalDisabled = await webcam.getByRole('button', { name: /Webcam/ }).getAttribute('aria-label');
  if (originalDisabled === 'Enable Webcam') await webcam.getByRole('button', { name: 'Enable Webcam', exact: true }).click();
  const video = webcam.locator('video').first();
  await video.waitFor({ state: 'attached' });
  await page.waitForFunction(node => node.readyState >= 1 && node.videoWidth > 0 && node.videoHeight > 0, await video.elementHandle(), { timeout: 10000 });
  const cameraBefore = await video.evaluate(node => ({ width: node.videoWidth, height: node.videoHeight, hasStream: Boolean(node.srcObject) }));
  if (!cameraBefore.hasStream || cameraBefore.width < 1 || cameraBefore.height < 1) throw new Error(`Synthetic camera did not deliver video: ${JSON.stringify(cameraBefore)}`);

  currentStage = 'open Tonic settings dialog';
  await menuAction(webcam, 'Settings');
  let dialog = page.getByRole('dialog').last();
  await dialog.getByText('Webcam Settings', { exact: true }).waitFor({ state: 'visible' });
  const local = dialog.getByRole('radio', { name: 'Use a built-in camera or a connected webcam', exact: true });
  const stream = dialog.getByRole('radio', { name: 'Connect to an IP camera', exact: true });
  const url = dialog.getByRole('textbox', { name: 'Stream URL', exact: true });
  const prior = { local: await local.isChecked(), stream: await stream.isChecked(), url: await url.inputValue() };
  currentStage = 'cancel stream draft and verify no saved changes';
  await dialog.locator('label').filter({ hasText: 'Connect to an IP camera' }).click();
  if (!await stream.isChecked()) throw new Error('IP camera radio did not switch through its visible label');
  const dataUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2220%22%3E%3Crect width=%2240%22 height=%2220%22 fill=%22%2300aa88%22/%3E%3C/svg%3E';
  await url.fill(dataUrl);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await menuAction(webcam, 'Settings');
  dialog = page.getByRole('dialog').last();
  await dialog.getByText('Webcam Settings', { exact: true }).waitFor({ state: 'visible' });
  const afterCancel = {
    local: await dialog.getByRole('radio', { name: 'Use a built-in camera or a connected webcam', exact: true }).isChecked(),
    stream: await dialog.getByRole('radio', { name: 'Connect to an IP camera', exact: true }).isChecked(),
    url: await dialog.getByRole('textbox', { name: 'Stream URL', exact: true }).inputValue(),
  };
  if (JSON.stringify(prior) !== JSON.stringify(afterCancel)) throw new Error(`Cancelled webcam settings changed persisted values: prior=${JSON.stringify(prior)} current=${JSON.stringify(afterCancel)}`);
  await dialog.locator('label').filter({ hasText: 'Connect to an IP camera' }).click();
  await url.fill(dataUrl);
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(expected => [...document.querySelectorAll('[role="region"][aria-label="Webcam widget"] img')].some(node => node.getAttribute('src') === expected), dataUrl, { timeout: 5000 });
  await menuAction(webcam, 'Settings');
  dialog = page.getByRole('dialog').last();
  await dialog.getByText('Webcam Settings', { exact: true }).waitFor({ state: 'visible' });
  const persistedStream = {
    local: await dialog.getByRole('radio', { name: 'Use a built-in camera or a connected webcam', exact: true }).isChecked(),
    stream: await dialog.getByRole('radio', { name: 'Connect to an IP camera', exact: true }).isChecked(),
    url: await dialog.getByRole('textbox', { name: 'Stream URL', exact: true }).inputValue(),
  };
  if (!persistedStream.stream || persistedStream.url !== dataUrl) throw new Error(`Saved stream settings did not persist: ${JSON.stringify(persistedStream)}`);
  await url.fill(prior.url);
  currentStage = 'save local camera settings and await live stream';
  await dialog.locator('label').filter({ hasText: 'Use a built-in camera or a connected webcam' }).click();
  if (!await dialog.getByRole('radio', { name: 'Use a built-in camera or a connected webcam', exact: true }).isChecked()) throw new Error('Built-in camera radio did not switch through its visible label');
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(node => node.srcObject && node.readyState >= 1, await video.elementHandle(), { timeout: 10000 });
  const afterSave = await video.evaluate(node => ({ width: node.videoWidth, height: node.videoHeight, hasStream: Boolean(node.srcObject) }));
  if (!afterSave.hasStream || afterSave.width < 1 || afterSave.height < 1) throw new Error(`Saved local camera settings did not restore live camera: ${JSON.stringify(afterSave)}`);
  return { cameraBefore, originalDisabled, prior, afterCancel, persistedStream, savedLocalCamera: afterSave, externalCameraUsed: false };
});

await gate('Webcam size and transform controls respond to pointer; fullscreen enters and exits', async () => {
  currentStage = 'move over video and expose controls';
  const webcam = region('Webcam widget');
  const video = webcam.locator('video').first();
  await video.waitFor({ state: 'visible' });
  await video.scrollIntoViewIfNeeded();
  const videoBox = await video.boundingBox();
  if (!videoBox) throw new Error('Synthetic webcam video has no visible geometry');
  await page.mouse.move(videoBox.x + 12, videoBox.y + 12);
  const controlBar = webcam.locator('.webcam-control-bar');
  await page.waitForFunction(node => Number(getComputedStyle(node).opacity) > 0, await controlBar.elementHandle());
  const scale = webcam.getByRole('slider', { name: 'Image scale', exact: true });
  await scale.waitFor({ state: 'visible' });
  currentStage = 'increase webcam scale by native pointer';
  const initialScale = await scale.getAttribute('aria-valuenow');
  const targetValue = Math.min(9.8, Number(initialScale) + 0.3);
  await setWebcamScale(webcam, video, targetValue);
  const nextScale = await scale.getAttribute('aria-valuenow');
  if (!(Number(nextScale) > Number(initialScale))) throw new Error(`Webcam scale did not increase: ${initialScale} -> ${nextScale}`);
  currentStage = 'rotate webcam via pointer';
  const rotate = webcam.getByRole('button', { name: 'Rotate Right', exact: true });
  const normalizeRotation = async () => {
    const rotations = [];
    for (let index = 0; index < 4; index += 1) {
      const matrix = await video.evaluate(node => getComputedStyle(node).transform);
      const values = matrix.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(value => Number(value.trim())) || [];
      if (values.length === 6 && values[0] > 0.99 && Math.abs(values[1]) < 0.01 && Math.abs(values[2]) < 0.01 && values[3] > 0.99) return rotations;
      await rotate.click();
      rotations.push(matrix);
    }
    throw new Error(`Unable to normalize webcam rotation to 0 degrees: ${JSON.stringify(rotations)}`);
  };
  const normalizedPriorRotations = await normalizeRotation();
  const transformBefore = await video.evaluate(node => getComputedStyle(node).transform);
  await rotate.click();
  await page.waitForFunction(({ node, previous }) => getComputedStyle(node).transform !== previous, { node: await video.elementHandle(), previous: transformBefore });
  const transformed = await video.evaluate(node => ({ transform: getComputedStyle(node).transform, width: getComputedStyle(node).width }));
  const close = webcam.getByRole('button', { name: 'Collapse', exact: true });
  if (await close.isVisible()) {
    // Keep widget in the visible grid; test the documented menu fullscreen action below.
  }
  currentStage = 'enter webcam fullscreen and measure geometry';
  await menuAction(webcam, 'Enter Full Screen');
  await page.waitForFunction(node => getComputedStyle(node).position === 'fixed', await webcam.elementHandle());
  const fullscreen = await webcam.evaluate(node => ({ box: node.getBoundingClientRect().toJSON(), classes: node.className }));
  const exit = webcam.getByRole('button', { name: 'Exit Full Screen', exact: true });
  if (await exit.count()) await exit.click();
  else await menuAction(webcam, 'Exit Full Screen');
  await page.waitForFunction(node => getComputedStyle(node).position !== 'fixed', await webcam.elementHandle());
  currentStage = 'restore synthetic webcam size, rotation and disabled state';
  await webcam.getByRole('button', { name: 'Rotate Left', exact: true }).click();
  await setWebcamScale(webcam, video, 1.0);
  const restoredScale = await scale.getAttribute('aria-valuenow');
  const restoredRotation = await video.evaluate(node => getComputedStyle(node).transform);
  const disable = webcam.getByRole('button', { name: 'Disable Webcam', exact: true });
  if (await disable.isVisible().catch(() => false)) await disable.click();
  await video.waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(artifactDir, 'webcam-controls-r6.png') });
  return { videoBox, initialScale, nextScale, transformed, normalizedPriorRotations, restoredScale, restoredRotation, restoredDisabled: true, fullscreen, restoredNormal: true, controlBarVisibleOnHover: true };
});

await gate('Console displays streamed status output, scrolls, clears, and changes fullscreen geometry', async () => {
  currentStage = 'locate connected Console terminal';
  const consoleWidget = region('Console widget');
  const output = consoleWidget.getByRole('log', { name: 'Console output', exact: true });
  await output.waitFor({ state: 'visible' });
  const terminal = output.locator('.xterm');
  await terminal.waitFor({ state: 'visible' });
  const beforeLines = await output.locator('.xterm-rows > div').count();
  await terminal.click();
  const queryStart = result.outgoingCommands.filter(command => command.command === '$G').length;
  const grbl = region('Grbl widget');
  currentStage = 'send 45 read-only Grbl parser queries from the native controller menu';
  for (let index = 0; index < 45; index += 1) {
    await grbl.getByRole('button', { name: 'Grbl commands', exact: true }).click();
    await page.getByRole('menuitem', { name: 'View G-code Parser State ($G)', exact: true }).click();
    await page.waitForTimeout(80);
  }
  currentStage = 'wait for streamed response and long-output rendering';
  await page.waitForTimeout(2500);
  const afterLines = await output.locator('.xterm-rows > div').count();
  const scrollRows = await output.locator('.xterm-viewport').evaluate(node => ({ top: node.scrollTop, height: node.clientHeight, full: node.scrollHeight }));
  await menuAction(consoleWidget, 'Select All');
  await menuAction(consoleWidget, 'Copy Selection');
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  const parserReplyCount = (clipboardText.match(/\[GC:/g) || []).length;
  if (parserReplyCount < 30) throw new Error(`Expected at least 30 real read-only parser replies in terminal selection, copied ${parserReplyCount}; viewport=${JSON.stringify(scrollRows)}, text=${JSON.stringify(clipboardText.slice(-1200))}`);
  const viewport = output.locator('.xterm-viewport');
  const beforeScroll = await viewport.evaluate(node => ({ top: node.scrollTop, height: node.clientHeight, full: node.scrollHeight }));
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error('Console scroll viewport has no pointer geometry');
  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(250);
  const afterScroll = await viewport.evaluate(node => ({ top: node.scrollTop, height: node.clientHeight, full: node.scrollHeight }));
  if (afterScroll.top >= beforeScroll.top && beforeScroll.full > beforeScroll.height) throw new Error(`Native wheel did not move Console scrollback upward: before=${JSON.stringify(beforeScroll)}, after=${JSON.stringify(afterScroll)}`);
  const beforeFull = await consoleWidget.boundingBox();
  currentStage = 'enter Console fullscreen and measure terminal size';
  await consoleWidget.getByRole('button', { name: 'Enter full screen', exact: true }).click();
  await page.waitForFunction(node => getComputedStyle(node).position === 'fixed', await consoleWidget.elementHandle());
  const fullscreenBox = await consoleWidget.boundingBox();
  if (!fullscreenBox || !beforeFull || fullscreenBox.height <= beforeFull.height) throw new Error(`Console did not grow in full screen: before=${JSON.stringify(beforeFull)}, after=${JSON.stringify(fullscreenBox)}`);
  currentStage = 'exit Console fullscreen and clear streamed output';
  await consoleWidget.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await page.waitForFunction(node => getComputedStyle(node).position !== 'fixed', await consoleWidget.elementHandle());
  await consoleWidget.getByRole('button', { name: 'Clear console', exact: true }).click();
  await page.waitForTimeout(150);
  const afterClearText = await output.innerText();
  const afterClearScroll = await viewport.evaluate(node => ({ top: node.scrollTop, height: node.clientHeight, full: node.scrollHeight }));
  if (afterClearText.includes('<Idle') || afterClearText.includes('MPos:') || afterClearScroll.full > afterClearScroll.height + 1) throw new Error(`Clear console left old rows in terminal buffer: text=${JSON.stringify(afterClearText)}, scroll=${JSON.stringify(afterClearScroll)}`);
  const commandsSince = result.outgoingCommands.filter(command => command.command === '$G').length - queryStart;
  if (commandsSince < 45) throw new Error(`Expected all read-only parser queries to reach the controller, only observed ${commandsSince}`);
  await page.screenshot({ path: path.join(artifactDir, 'console-long-output-cleared-r6.png') });
  return { beforeLines, afterLines, parserReplyCount, clipboardBytes: Buffer.byteLength(clipboardText), beforeScroll, afterScroll, afterClearScroll, scrollRows, beforeFullscreen: beforeFull, fullscreen: fullscreenBox, cleared: true, observedQueryCount: commandsSince };
});

result.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(artifactDir, 'workspace-console-webcam-r6.json'), JSON.stringify(result, null, 2) + '\n');
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ gates: result.gates.map(({ name, status, error }) => ({ name, status, error })), pageErrors: result.pageErrors.length, requestFailures: result.requestFailures.length, consoleIssues: result.consoleIssues.length }, null, 2));
