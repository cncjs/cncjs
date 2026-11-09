import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:8080';
const auth = JSON.parse(fs.readFileSync(path.join(artifactDir, 'admin-resources-auth-r6.json'), 'utf8'));
const records = [
  { route: 'commands', resource: 'command', names: [auth.fixtures.commands.name, auth.fixtures.commands.updatedName] },
  { route: 'events', resource: 'event', names: [auth.fixtures.events.name, auth.fixtures.events.updatedName] },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: process.env.R6_STORAGE_STATE });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const result = { browser: { version: browser.version(), viewport: '1440x900', dpr: 1 }, cleanup: [], pageErrors: [], requestFailures: [] };
const output = path.join(artifactDir, 'admin-failed-record-cleanup-r6.json');
const sanitize = value => String(value).replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }
page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 700)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));

async function removeRecord(name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  if (!(await row.count())) return { name, wasPresent: false, removed: false };
  await row.locator('label[data-tonic="Checkbox"]').click();
  if (!(await row.getByRole('checkbox').isChecked())) throw new Error(`Failed to select synthetic ${name}`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return { name, wasPresent: true, removed: true };
}

try {
  for (const group of records) {
    await page.goto(`${origin}/#/administration/${group.route}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
    const rows = [];
    for (const name of group.names) rows.push(await removeRecord(name));
    result.cleanup.push({ resource: group.resource, rows });
  }
  result.status = 'completed';
} catch (error) {
  result.status = 'failed';
  result.error = sanitize(error).slice(0, 800);
} finally {
  flush();
  await browser.close();
}
if (result.status !== 'completed' || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
