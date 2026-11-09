import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const runId = Date.now();
const name = `R6 profile ${runId}`;
const updatedName = `${name} updated`;
const initialLimits = { xmin: -100, xmax: 100, ymin: -50, ymax: 50, zmin: -25, zmax: 25 };
const updatedLimits = { xmin: -120, xmax: 125, ymin: -55, ymax: 60, zmin: -30, zmax: 35 };
const gates = [];
const api = [];
const consoleIssues = [];
const pageErrors = [];
const requestFailures = [];

page.on('request', request => {
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (!url.pathname.includes('/api/machines')) return;
  const entry = { method: request.method(), path: url.pathname };
  if (['POST', 'PUT'].includes(request.method())) {
    try { entry.body = request.postDataJSON(); } catch (_) { entry.body = '<unavailable>'; }
  }
  api.push(entry);
});
page.on('response', response => {
  let pathname;
  try { pathname = new URL(response.url()).pathname; } catch (_) { return; }
  if (pathname.includes('/api/machines')) api.push({ response: response.status(), path: pathname });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 400) });
});
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const flush = () => fs.writeFileSync(path.join(artifactDir, 'admin-machines.json'), JSON.stringify({
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
  record: { name, updatedName, initialLimits, updatedLimits, removed: true },
  gates,
  api,
  consoleIssues,
  pageErrors,
  requestFailures,
}, null, 2) + '\n');

async function gate(gateName, action) {
  const started = Date.now();
  try {
    const detail = await action();
    gates.push({ name: gateName, status: 'passed', durationMs: Date.now() - started, ...(detail || {}) });
  } catch (error) {
    gates.push({ name: gateName, status: 'failed', durationMs: Date.now() - started, error: String(error).slice(0, 1000) });
    await page.screenshot({ path: path.join(artifactDir, `admin-machines-failure-${gateName}.png`) }).catch(() => {});
  }
  flush();
}

async function fillLimits(limits) {
  const labels = { xmin: 'X min', xmax: 'X max', ymin: 'Y min', ymax: 'Y max', zmin: 'Z min', zmax: 'Z max' };
  for (const [key, value] of Object.entries(limits)) {
    const input = page.getByLabel(new RegExp(`^${labels[key]}`));
    await input.fill(String(value));
  }
}

try {
  await gate('load-machine-profiles', async () => {
    await page.goto('http://127.0.0.1:8080/#/administration/machine-profiles', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.getByRole('button', { name: 'Add', exact: true }).waitFor();
    return { route: '/administration/machine-profiles' };
  });

  await gate('create-profile', async () => {
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByText('New Machine', { exact: true }).waitFor();
    await page.getByLabel(/^Machine name:/).fill(name);
    await fillLimits(initialLimits);
    await page.getByRole('button', { name: 'Add', exact: true }).last().click();
    await page.getByRole('button', { name, exact: true }).waitFor();
    return { created: name, limits: initialLimits };
  });

  await gate('read-and-update-profile', async () => {
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByText('Machine Details', { exact: true }).waitFor();
    for (const [label, value] of Object.entries({ 'X min': -100, 'X max': 100, 'Y min': -50, 'Y max': 50, 'Z min': -25, 'Z max': 25 })) {
      if (await page.getByLabel(new RegExp(`^${label}`)).inputValue() !== String(value)) throw new Error(`Read returned wrong ${label}`);
    }
    await page.getByLabel(/^Machine name:/).fill(updatedName);
    await fillLimits(updatedLimits);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: updatedName, exact: true }).waitFor();
    return { updated: updatedName, limits: updatedLimits, readBack: true };
  });

  await gate('bulk-delete-profile', async () => {
    const profileRow = page.getByRole('row', { name: new RegExp(updatedName) });
    const rowCheckbox = profileRow.locator('input[type="checkbox"]');
    await profileRow.locator('label[data-tonic="Checkbox"]').click();
    await rowCheckbox.waitFor({ state: 'attached' });
    const checkboxLabel = await rowCheckbox.getAttribute('aria-label');
    if (!checkboxLabel?.startsWith('Select row ')) {
      throw new Error(`Profile checkbox has incorrect accessible name: ${checkboxLabel}`);
    }
    if (!(await rowCheckbox.isChecked())) throw new Error('Profile checkbox did not become checked');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: updatedName, exact: true }).waitFor({ state: 'detached' });
    return { deleted: updatedName };
  });

  await gate('cleanup-stale-r6-profiles', async () => {
    let removed = 0;
    while (await page.getByRole('row').filter({ hasText: /R6 profile/ }).count()) {
      const row = page.getByRole('row').filter({ hasText: /R6 profile/ }).first();
      const profileName = (await row.innerText()).match(/R6 profile[^\n]*/)?.[0];
      await row.locator('label[data-tonic="Checkbox"]').click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('button', { name: profileName, exact: true }).waitFor({ state: 'detached' });
      removed += 1;
    }
    return { removedTemporaryProfiles: removed };
  });

  await page.screenshot({ path: path.join(artifactDir, 'admin-machines-final.png'), fullPage: true });
} finally {
  flush();
  await browser.close();
}
