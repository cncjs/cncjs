import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: process.env.R6_STORAGE_STATE });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const runId = Date.now();
const name = `R6 keyboard macro ${runId}`;
const updatedName = `${name} updated`;
const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', viewport: '1440x900', dpr: 1 },
  fixture: { name, updatedName, actionBytes: Buffer.byteLength('G90\n%wait'), actionSha256: crypto.createHash('sha256').update('G90\n%wait').digest('hex') },
  gates: [],
  api: [],
  consoleIssues: [],
  pageErrors: [],
  requestFailures: [],
};
const resultPath = path.join(artifactDir, 'macro-live-browser-r6.json');
const safe = value => String(value).replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`); }
page.on('request', request => {
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (url.pathname.startsWith('/api/macros')) result.api.push({ method: request.method(), path: url.pathname });
});
page.on('response', response => {
  let url;
  try { url = new URL(response.url()); } catch (_) { return; }
  if (url.pathname.startsWith('/api/macros')) result.api.push({ status: response.status(), path: url.pathname });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: safe(message.text()).slice(0, 700) });
});
page.on('pageerror', error => result.pageErrors.push(safe(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: safe(request.failure()?.errorText || '') }));

async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: safe(error).slice(0, 1000) });
    await page.screenshot({ path: path.join(artifactDir, `macro-live-browser-failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true }).catch(() => {});
  }
  flush();
}

async function openVariableMenuAndInsert(textarea) {
  await textarea.fill('G90\n');
  await textarea.focus();
  await textarea.press('End');
  const toggle = page.getByRole('button', { name: 'Select variables', exact: true });
  const dom = await toggle.evaluate(button => ({ tag: button.tagName, nestedButtonCount: button.querySelectorAll('button').length, inLabel: Boolean(button.closest('label')) }));
  if (dom.tag !== 'BUTTON' || dom.nestedButtonCount !== 0) throw new Error(`Variable menu toggle has invalid nested-button DOM: ${JSON.stringify(dom)}`);
  await toggle.click();
  const variable = page.getByRole('menuitem', { name: '%wait', exact: true });
  await variable.waitFor({ state: 'visible' });
  await variable.focus();
  await variable.press('Enter');
  const value = await textarea.inputValue();
  if (value !== 'G90\n%wait') throw new Error(`Keyboard Enter did not insert %wait at the textarea caret: ${JSON.stringify(value)}`);
  return { toggleDom: dom, keyboard: 'Enter', insertedBytes: Buffer.byteLength(value), insertedSha256: crypto.createHash('sha256').update(value).digest('hex') };
}

async function deleteRow(rowName) {
  const row = page.getByRole('row').filter({ hasText: rowName }).first();
  await row.locator('label[data-tonic="Checkbox"]').click();
  if (!(await row.getByRole('checkbox').isChecked())) throw new Error('Macro cleanup row did not become selected');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
}

let created = false;
try {
  await page.goto(`${origin}/#/administration/macros`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  await gate('Macro Create drawer valid toggle DOM and keyboard variable insertion', async () => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByText('New Macro', { exact: true }).waitFor();
    await page.getByLabel(/^Macro name:/).fill(name);
    const detail = await openVariableMenuAndInsert(page.getByLabel(/^G-code commands:/));
    await page.getByRole('button', { name: 'Add', exact: true }).last().click();
    await page.getByRole('button', { name, exact: true }).waitFor({ state: 'visible' });
    created = true;
    return { ...detail, created: true };
  });
  await gate('Macro Update drawer valid toggle DOM and keyboard variable insertion', async () => {
    const initialRow = page.getByRole('button', { name, exact: true });
    await initialRow.click();
    await page.getByText('Macro Details', { exact: true }).waitFor();
    const detail = await openVariableMenuAndInsert(page.getByLabel(/^G-code commands:/));
    await page.getByLabel(/^Macro name:/).fill(updatedName);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: updatedName, exact: true }).waitFor({ state: 'visible' });
    await deleteRow(updatedName);
    created = false;
    return { ...detail, updated: true, removed: true };
  });
  await page.screenshot({ path: path.join(artifactDir, 'macro-live-browser-r6.png'), fullPage: true });
} finally {
  if (created) {
    try {
      await page.goto(`${origin}/#/administration/macros`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
      const updatedRow = page.getByRole('button', { name: updatedName, exact: true });
      const initialRow = page.getByRole('button', { name, exact: true });
      if (await updatedRow.count()) await deleteRow(updatedName);
      else if (await initialRow.count()) await deleteRow(name);
      created = false;
    } catch (error) {
      result.cleanupError = safe(error).slice(0, 500);
    }
  }
  flush();
  await browser.close();
}
if (result.gates.some(gateResult => gateResult.status === 'failed') || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
