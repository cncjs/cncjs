import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: process.env.R6_STORAGE_STATE,
});
const page = await context.newPage();
page.setDefaultTimeout(10000);

const runId = Date.now();
const resources = [
  {
    key: 'commands',
    noun: 'Command',
    route: 'commands',
    endpoint: '/api/commands',
    fields: { 'Command name:': `R6 command ${runId}`, 'Command action:': 'printf r6-synthetic-command' },
    updatedFields: { 'Command name:': `R6 command ${runId} updated`, 'Command action:': 'printf r6-synthetic-command-updated' },
  },
  {
    key: 'events',
    noun: 'Event',
    route: 'events',
    endpoint: '/api/events',
    fields: { 'Event name:': `R6 event ${runId}`, 'Event trigger:': 'synthetic R6 browser regression', 'Event action:': 'G21' },
    updatedFields: { 'Event name:': `R6 event ${runId} updated`, 'Event trigger:': 'synthetic R6 browser regression updated', 'Event action:': 'G20' },
  },
  {
    key: 'macros',
    noun: 'Macro',
    route: 'macros',
    endpoint: '/api/macros',
    fields: { 'Macro name:': `R6 macro ${runId}`, 'G-code commands:': 'G21\nG90\nG0 X1 Y1' },
    updatedFields: { 'Macro name:': `R6 macro ${runId} updated`, 'G-code commands:': 'G20\nG90\nG0 X2 Y2' },
  },
];
const gates = [];
const api = [];
const consoleIssues = [];
const pageErrors = [];
const requestFailures = [];

page.on('request', request => {
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (!/^\/api\/(commands|events|macros)/.test(url.pathname)) return;
  const entry = { method: request.method(), path: url.pathname };
  if (['POST', 'PUT'].includes(request.method())) {
    try { entry.bodyKeys = Object.keys(request.postDataJSON() || {}).sort(); } catch (_) { entry.bodyKeys = []; }
  }
  api.push(entry);
});
page.on('response', response => {
  let pathname;
  try { pathname = new URL(response.url()).pathname; } catch (_) { return; }
  if (/^\/api\/(commands|events|macros)/.test(pathname)) api.push({ status: response.status(), path: pathname });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 350) });
});
page.on('pageerror', error => pageErrors.push(String(error).slice(0, 600)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const outPath = path.join(artifactDir, 'admin-resource-crud-r6.json');
function flush() {
  fs.writeFileSync(outPath, JSON.stringify({
    browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
    fixtureRunId: runId,
    credentialsRecorded: false,
    gates,
    api,
    consoleIssues,
    pageErrors,
    requestFailures,
  }, null, 2) + '\n');
}

async function gate(name, action) {
  const started = Date.now();
  try {
    const detail = await action();
    gates.push({ name, status: 'passed', durationMs: Date.now() - started, ...(detail || {}) });
  } catch (error) {
    gates.push({ name, status: 'failed', durationMs: Date.now() - started, error: String(error).slice(0, 900) });
    await page.screenshot({ path: path.join(artifactDir, `admin-resource-crud-failure-${name}.png`) }).catch(() => {});
  }
  flush();
}

async function fillFields(fields) {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await input.fill(value);
  }
}

async function waitForValue(input, expected) {
  const started = Date.now();
  while (Date.now() - started < 12000) {
    if (await input.inputValue().catch(() => null) === expected) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`Read query did not populate ${await input.getAttribute('aria-label').catch(() => '') || 'the expected field'}`);
}

async function removeRow(name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  if (!(await row.count())) return false;
  await row.locator('label[data-tonic="Checkbox"]').click();
  if (!(await row.getByRole('checkbox').isChecked())) throw new Error(`Could not select row ${name}`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return true;
}

async function exercise(resource) {
  const initialName = Object.values(resource.fields)[0];
  const updatedName = Object.values(resource.updatedFields)[0];
  await page.goto(`http://127.0.0.1:8080/#/administration/${resource.route}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  try {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByText(`New ${resource.noun}`, { exact: true }).waitFor();
    await fillFields(resource.fields);
    await page.getByRole('button', { name: 'Add', exact: true }).last().click();
    await page.getByRole('row').filter({ hasText: initialName }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: initialName, exact: true }).click();
    await page.getByText(`${resource.noun} Details`, { exact: true }).waitFor();
    for (const [label, value] of Object.entries(resource.fields)) {
      await waitForValue(page.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)), value);
    }
    await fillFields(resource.updatedFields);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: updatedName, exact: true }).waitFor({ state: 'visible' });
    if (!(await removeRow(updatedName))) throw new Error(`Could not delete updated ${resource.noun.toLowerCase()}`);
    return { created: initialName, readBack: true, updated: updatedName, removed: true };
  } catch (error) {
    await page.goto(`http://127.0.0.1:8080/#/administration/${resource.route}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' }).catch(() => {});
    await removeRow(updatedName).catch(() => false);
    await removeRow(initialName).catch(() => false);
    throw error;
  }
}

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 30000 });
  for (const resource of resources) {
    await gate(`${resource.key}-create-read-update-delete`, () => exercise(resource));
  }
  await page.screenshot({ path: path.join(artifactDir, 'admin-resource-crud-r6-final.png'), fullPage: true });
} finally {
  flush();
  await browser.close();
}
