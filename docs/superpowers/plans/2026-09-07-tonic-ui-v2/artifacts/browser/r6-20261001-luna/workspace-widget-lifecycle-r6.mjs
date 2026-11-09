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
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', viewport: '1440x900', dpr: 1, camera: 'Chromium synthetic camera device' },
  gates: [],
  pageErrors: [],
  requestFailures: [],
  consoleIssues: [],
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
    const command = typeof payload === 'string' ? payload.trim().toUpperCase() : '';
    const category = ['?', '$G', '$#', '$$', '$I', '$N'].includes(command) ? 'read' : 'mutation';
    result.outgoingCommands.push({ event, name, category, transport });
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
page.on('requestfailed', request => result.requestFailures.push({ type: request.resourceType(), error: request.failure()?.errorText }));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 900) });
});

const flush = (filename = 'workspace-widget-lifecycle-r6-progress.json') => fs.writeFileSync(path.join(artifactDir, filename), JSON.stringify(result, null, 2) + '\n');
async function gate(name, action) {
  const started = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - started, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - started, error: String(error).slice(0, 1500) });
    await page.screenshot({ path: path.join(artifactDir, `widget-lifecycle-failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true }).catch(() => {});
    const dialogs = page.getByRole('dialog');
    const lastDialog = dialogs.last();
    if (await lastDialog.isVisible().catch(() => false)) {
      const cancel = lastDialog.getByRole('button', { name: 'Cancel', exact: true }).first();
      if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await lastDialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  }
  flush();
}
const region = name => page.getByRole('region', { name, exact: true });
async function connectToGrbl() {
  const connection = region('Connection widget');
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) return { alreadyConnected: true };
  const automatic = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await automatic.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  if (await connection.getByRole('button', { name: 'Grbl', exact: true }).getAttribute('data-selected') === null) {
    await connection.getByRole('button', { name: 'Grbl', exact: true }).click();
  }
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await option.waitFor({ state: 'visible', timeout: 45000 });
  const port = (await option.innerText()).trim();
  await option.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!await open.isEnabled()) throw new Error('Grbl simulator Open button remained disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  return { alreadyConnected: false, port };
}
async function openWidgetMenu(widget, action) {
  let trigger = widget.getByRole('button', { name: 'More options', exact: true });
  if (!await trigger.count()) trigger = widget.locator('button[title="More"]');
  await trigger.first().click();
  await page.getByRole('menuitem', { name: action, exact: true }).last().click();
}
async function openCustomSettings() {
  const custom = region('Custom widget');
  await openWidgetMenu(custom, 'Settings');
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByText('Settings', { exact: true }).waitFor({ state: 'visible' });
  return { custom, dialog, title: dialog.getByRole('textbox').nth(0), url: dialog.getByRole('textbox').nth(1) };
}

await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
await region('Connection widget').waitFor({ state: 'visible', timeout: 30000 });
await page.waitForTimeout(500);
await gate('connect synthetic Grbl for settings and read-only console', connectToGrbl);
await gate('ensure Custom framed widget exists', async () => {
  if (await region('Custom widget').count()) return { customActive: true };
  const manager = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
  await manager.click();
  const dialog = page.getByRole('dialog');
  const checkbox = dialog.getByRole('checkbox', { name: 'Custom Widget', exact: true });
  if (!await checkbox.isChecked()) {
    await checkbox.focus();
    await page.keyboard.press('Space');
  }
  if (!await checkbox.isChecked()) throw new Error('Custom Widget manager checkbox did not toggle by keyboard');
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await region('Custom widget').waitFor({ state: 'visible' });
  return { customActive: true, activatedThroughManager: true };
});

if (!process.env.R6_LIFECYCLE_ONLY || process.env.R6_LIFECYCLE_ONLY === 'settings') await gate('Custom settings Save, Cancel, persistence and restoration', async () => {
  let open = await openCustomSettings();
  const original = { title: await open.title.inputValue(), url: await open.url.inputValue() };
  await open.title.fill('R6 Cancelled Custom Title');
  await open.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await open.dialog.waitFor({ state: 'hidden' });

  open = await openCustomSettings();
  const afterCancel = { title: await open.title.inputValue(), url: await open.url.inputValue() };
  if (afterCancel.title !== original.title || afterCancel.url !== original.url) {
    await open.dialog.getByRole('button', { name: 'Cancel', exact: true }).click().catch(() => {});
    throw new Error(`Cancel changed stored settings: before=${JSON.stringify(original)}, after=${JSON.stringify(afterCancel)}`);
  }
  const savedTitle = `R6 Saved Custom ${Date.now()}`;
  await open.title.fill(savedTitle);
  await open.dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await open.dialog.waitFor({ state: 'hidden' });
  open = await openCustomSettings();
  const afterSave = { title: await open.title.inputValue(), url: await open.url.inputValue() };
  if (afterSave.title !== savedTitle) throw new Error(`Saved Custom title did not persist: ${JSON.stringify(afterSave)}`);
  await open.title.fill(original.title);
  await open.url.fill(original.url);
  await open.dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await open.dialog.waitFor({ state: 'hidden' });
  const restored = await openCustomSettings();
  const restoredValues = { title: await restored.title.inputValue(), url: await restored.url.inputValue() };
  await restored.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  if (restoredValues.title !== original.title || restoredValues.url !== original.url) throw new Error(`Custom settings were not restored: ${JSON.stringify({ original, restoredValues })}`);
  return { original, afterCancel, savedTitle, persistedTitle: afterSave.title, restoredValues };
});

if (!process.env.R6_LIFECYCLE_ONLY || process.env.R6_LIFECYCLE_ONLY === 'fork') await gate('fork Custom, cancel removal, confirm removal and cleanup', async () => {
  const baselineRegions = await page.getByRole('region', { name: 'Custom widget', exact: true }).count();
  if (baselineRegions !== 1) throw new Error(`Expected one baseline Custom widget, found ${baselineRegions}`);
  let custom = region('Custom widget');
  await openWidgetMenu(custom, 'Fork Widget');
  let dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByText('Fork Widget', { exact: true }).waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  if (await page.getByRole('region', { name: 'Custom widget', exact: true }).count() !== baselineRegions) throw new Error('Cancel Fork created a duplicate Custom widget');

  custom = region('Custom widget');
  await openWidgetMenu(custom, 'Fork Widget');
  dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByText('Fork Widget', { exact: true }).waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await page.waitForFunction(count => document.querySelectorAll('[role="region"][aria-label="Custom widget"]').length === count, baselineRegions + 1, { timeout: 10000 });
  const forkContainer = page.locator('[data-widget-id^="custom:"]').last();
  const forkedId = await forkContainer.getAttribute('data-widget-id');
  if (!forkedId) throw new Error('Fork operation created no user-facing custom:<id> widget container');
  const forkRegion = forkContainer.getByRole('region', { name: 'Custom widget', exact: true });
  if (!await forkRegion.isVisible()) throw new Error(`Forked Custom widget is not visible: ${forkedId}`);

  await openWidgetMenu(forkRegion, 'Remove Widget');
  dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByText('Remove Widget', { exact: true }).waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  if (!await forkRegion.isVisible()) throw new Error('Cancel Remove detached the forked widget');

  await openWidgetMenu(forkRegion, 'Remove Widget');
  dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByText('Remove Widget', { exact: true }).waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await forkContainer.waitFor({ state: 'detached', timeout: 10000 });
  const remaining = await page.getByRole('region', { name: 'Custom widget', exact: true }).count();
  if (remaining !== baselineRegions) throw new Error(`Fork removal left ${remaining} Custom widgets`);
  return { baselineRegions, canceledForkPreservedCount: baselineRegions, forkedId, canceledRemovalKeptFork: true, remainingAfterConfirmedRemoval: remaining };
});

if (!process.env.R6_LIFECYCLE_ONLY || process.env.R6_LIFECYCLE_ONLY === 'reorder') await gate('native drag reorder and restoration of primary widgets', async () => {
  const first = page.locator('[data-widget-id="connection"]');
  const second = page.locator('[data-widget-id="console"]');
  await first.waitFor({ state: 'visible' });
  await second.waitFor({ state: 'visible' });
  const sameList = await first.evaluate((node, selector) => node.parentElement === document.querySelector(selector)?.parentElement, '[data-widget-id="console"]');
  if (!sameList) throw new Error('Connection and Console are not siblings in the same sortable widget group');
  const list = first.locator('xpath=..');
  const ids = async () => list.evaluate(node => [...node.children].map(child => child.getAttribute('data-widget-id')).filter(Boolean));
  const before = await ids();
  const connectionFirst = before.indexOf('connection') < before.indexOf('console');
  const sourceWidgetId = connectionFirst ? 'console' : 'connection';
  const targetWidgetId = connectionFirst ? 'connection' : 'console';
  const sourceHandle = page.locator(`[data-widget-id="${sourceWidgetId}"] .sortable-handle`).first();
  const targetHandle = page.locator(`[data-widget-id="${targetWidgetId}"] .sortable-handle`).first();
  const commandStart = result.outgoingCommands.length;
  await sourceHandle.scrollIntoViewIfNeeded();
  await targetHandle.scrollIntoViewIfNeeded();
  await sourceHandle.scrollIntoViewIfNeeded();
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  if (!sourceBox || !targetBox) throw new Error(`Sortable handle geometry missing: source=${JSON.stringify(sourceBox)}, target=${JSON.stringify(targetBox)}`);
  if (sourceBox.y < 0 || targetBox.y < 0 || sourceBox.y + sourceBox.height > 900 || targetBox.y + targetBox.height > 900) {
    throw new Error(`Sortable handles did not scroll into the visible viewport: source=${JSON.stringify(sourceBox)}, target=${JSON.stringify(targetBox)}, scroll=${JSON.stringify(await page.evaluate(() => ({ x: scrollX, y: scrollY })))}`);
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 4, sourceBox.y + sourceBox.height / 2 + 4, { steps: 3 });
  await page.mouse.move(targetBox.x + 18, targetBox.y + 4, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(({ earlier, later }) => {
    const list = document.querySelector('[data-widget-id="connection"]')?.parentElement;
    const items = [...(list?.children || [])].map(child => child.getAttribute('data-widget-id'));
    return items.indexOf(earlier) >= 0 && items.indexOf(later) >= 0 && items.indexOf(earlier) < items.indexOf(later);
  }, { earlier: sourceWidgetId, later: targetWidgetId }, { timeout: 5000 }).catch(async () => {
    throw new Error(`Native drag did not place ${sourceWidgetId} before ${targetWidgetId}: before=${JSON.stringify(before)}, after=${JSON.stringify(await ids())}, source=${JSON.stringify(sourceBox)}, target=${JSON.stringify(targetBox)}`);
  });
  const reordered = await ids();
  if (reordered.indexOf(sourceWidgetId) >= reordered.indexOf(targetWidgetId)) throw new Error(`Native drag did not reflect the selected widget order: ${JSON.stringify(reordered)}`);
  const mutationCommands = result.outgoingCommands.slice(commandStart).filter(command => command.category !== 'read');
  if (mutationCommands.length) throw new Error(`Reorder emitted CNC mutations: ${JSON.stringify(mutationCommands)}`);

  let cleanupDrag = false;
  if (reordered.indexOf('connection') > reordered.indexOf('console')) {
    await first.locator('.sortable-handle').first().scrollIntoViewIfNeeded();
    await second.locator('.sortable-handle').first().scrollIntoViewIfNeeded();
    await first.locator('.sortable-handle').first().scrollIntoViewIfNeeded();
    const restoreSource = await first.locator('.sortable-handle').first().boundingBox();
    const restoreTarget = await second.locator('.sortable-handle').first().boundingBox();
    if (!restoreSource || !restoreTarget) throw new Error('Sortable handles unavailable for restoring canonical order');
    await page.mouse.move(restoreSource.x + restoreSource.width / 2, restoreSource.y + restoreSource.height / 2);
    await page.mouse.down();
    await page.mouse.move(restoreSource.x + restoreSource.width / 2 + 4, restoreSource.y + restoreSource.height / 2 + 4, { steps: 3 });
    await page.mouse.move(restoreTarget.x + 18, restoreTarget.y + 4, { steps: 12 });
    await page.mouse.up();
    cleanupDrag = true;
    await page.waitForFunction(() => {
      const list = document.querySelector('[data-widget-id="connection"]')?.parentElement;
      const items = [...(list?.children || [])].map(child => child.getAttribute('data-widget-id'));
      return items.indexOf('connection') >= 0 && items.indexOf('connection') < items.indexOf('console');
    }, null, { timeout: 5000 });
  }
  const restored = await ids();
  if (restored.indexOf('connection') > restored.indexOf('console')) throw new Error(`Cleanup did not restore canonical Connection-before-Console order: before=${JSON.stringify(before)}, after=${JSON.stringify(restored)}`);
  return { before, reordered, restored, initialRelativeOrderWasCanonical: connectionFirst, cleanupDrag, actualNativeDrag: true, unexpectedMutationCommands: mutationCommands.length };
});

result.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(artifactDir, 'workspace-widget-lifecycle-r6.json'), JSON.stringify(result, null, 2) + '\n');
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ gates: result.gates.map(({ name, status, error }) => ({ name, status, error })), pageErrors: result.pageErrors.length, requestFailures: result.requestFailures.length, consoleIssues: result.consoleIssues.length }, null, 2));
