import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const dir = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.env.V3_SCRATCH || '/tmp/cncjs-v3-guide-20261006-luna-0e46609d';
const out = path.join(dir, 'guide-file-drop-connected-v3.json');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDiffSha256 = createHash('sha256').update(execFileSync('git', ['diff', '--', 'package.json', 'yarn.lock', 'src/app'])).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  task: 'V3-GV connected and disconnected Workspace file-drop prompt states in light/dark',
  revision,
  sourceDiffSha256,
  expectedSourceDiffSha256: 'f2d53df88181497311cbe2d154d32bf33bc7df23b787fb7c2e759c821f8401e9',
  model: { name: 'gpt-6-luna', reasoningEffort: 'xhigh', basis: 'user-selected active task/session assignment' },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true, viewport: '1440x900', deviceScaleFactor: 1 },
  runnerPid: process.pid,
  states: [],
  screenshots: [],
  events: { pageErrors: [], requestFailures: [], httpErrors: [], apiWrites: [] },
  fixture: { name: 'visual-drag-fixture.gcode', content: '; visual drag fixture only\n', commentOnly: true, dropEventFired: false, fileUploaded: false },
  connection: { opened: false, controller: 'Grbl', configuredPort: path.join(scratch, 'ttyGRBL'), commandsInstrumented: false, commandButtonsClicked: false }
};
const redact = text => String(text).replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]');
page.on('pageerror', e => result.events.pageErrors.push({ message: redact(e.message), stack: redact(e.stack || '') }));
page.on('requestfailed', r => result.events.requestFailures.push({ method: r.method(), url: redact(r.url()).split('?')[0], error: redact(r.failure()?.errorText || '') }));
page.on('response', r => { if (r.status() >= 400) result.events.httpErrors.push({ status: r.status(), url: redact(r.url()).split('?')[0] }); });
page.on('request', r => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) {
    let pathname = ''; try { pathname = new URL(r.url()).pathname; } catch (_) {}
    if (pathname.startsWith('/api/')) result.events.apiWrites.push({ method: r.method(), path: pathname });
  }
});
function flush() { fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`); }
async function setTheme(theme) {
  const toggle = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  await page.getByText(theme === 'light' ? 'Light theme' : 'Dark theme', { exact: true }).last().click();
  await page.waitForTimeout(180);
}
async function captureDrop(connected, theme) {
  await setTheme(theme);
  const target = page.locator('[aria-label="3D Visualizer widget"]').first();
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(['; visual drag fixture only\n'], 'visual-drag-fixture.gcode', { type: 'text/plain' }));
    return data;
  });
  await target.dispatchEvent('dragenter', { dataTransfer: transfer });
  const expected = connected ? 'Drop file here' : 'You cannot upload files to the workspace when the connection is not established.';
  const text = page.getByText(expected, { exact: true });
  await text.waitFor({ state: 'visible', timeout: 5000 });
  const overlay = await text.evaluate(el => {
    let node = el;
    while (node && getComputedStyle(node).position !== 'fixed') node = node.parentElement;
    if (!node) return { found: false };
    const s = getComputedStyle(node); const r = node.getBoundingClientRect(); const textStyle = getComputedStyle(el);
    const icon = node.querySelector('svg');
    return {
      found: true,
      text: (node.innerText || '').replace(/\s+/g, ' ').slice(0, 180),
      background: s.backgroundColor,
      border: s.borderColor,
      borderWidth: s.borderTopWidth,
      textColor: textStyle.color,
      iconColor: icon ? getComputedStyle(icon).color : null,
      iconFill: icon ? getComputedStyle(icon).fill : null,
      rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
    };
  });
  const state = { connected, theme, expectedText: expected, overlay };
  if (!overlay.found || !overlay.background || !overlay.border || !overlay.textColor || !overlay.rect.width || !overlay.rect.height) throw new Error(`Drop prompt styles did not resolve for ${connected ? 'connected' : 'disconnected'} ${theme}: ${JSON.stringify(state)}`);
  const screenshot = `screenshots/guide-file-drop-${connected ? 'connected' : 'disconnected'}-${theme}-1440x900.png`;
  await page.screenshot({ path: path.join(dir, screenshot), animations: 'disabled', caret: 'hide', timeout: 5000 });
  result.screenshots.push(screenshot);
  state.screenshot = screenshot;
  result.states.push(state);
  flush();
  await target.dispatchEvent('dragleave', { dataTransfer: transfer });
  await page.waitForTimeout(120);
  await transfer.dispose();
  return state;
}

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 20000 });
  await captureDrop(false, 'light');
  await captureDrop(false, 'dark');
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: new RegExp(result.connection.configuredPort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await port.waitFor({ state: 'visible', timeout: 20000 });
  const selectedPort = (await port.innerText()).trim();
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  if (!(await open.isEnabled())) throw new Error('Synthetic Grbl port is not selectable');
  await open.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  result.connection = { ...result.connection, opened: true, selectedPort, lifecycleOnly: true };
  await captureDrop(true, 'light');
  await captureDrop(true, 'dark');
  await connection.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await connection.getByRole('button', { name: 'Open', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  result.connection.closed = true;
  result.status = result.states.length === 4 && result.states.every(state => state.overlay.found) && !result.events.pageErrors.length && !result.events.requestFailures.length && !result.events.httpErrors.length ? 'passed' : 'partial-failures';
} catch (e) {
  result.fatal = redact(e.stack || e.message || e);
  result.status = 'partial-failures';
} finally {
  result.completedAt = new Date().toISOString();
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  result.browserClosed = true;
  flush();
}
