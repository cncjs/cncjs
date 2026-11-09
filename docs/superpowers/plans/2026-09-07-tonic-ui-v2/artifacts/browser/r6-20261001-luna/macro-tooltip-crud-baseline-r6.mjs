import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.R6_BASELINE_PORT || '8082';
const origin = `http://127.0.0.1:${port}`;
const storage = JSON.parse(fs.readFileSync(process.env.R6_STORAGE_STATE, 'utf8'));
storage.origins = (storage.origins || []).map(entry => ({ ...entry, origin: entry.origin.replace(/:\d+$/, `:${port}`) }));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: storage });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const name = `R6 baseline tooltip ${Date.now()}`;
const result = {
  browser: { version: browser.version(), port, viewport: '1440x900', dpr: 1 },
  gate: null,
  matchedWarnings: [],
  api: [],
  pageErrors: [],
  requestFailures: [],
};
const output = path.join(artifactDir, 'macro-tooltip-crud-baseline-r6.json');
const sanitize = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }
page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname === '/api/macros' || /^\/api\/macros\//.test(url.pathname)) result.api.push({ method: response.request().method(), status: response.status(), path: url.pathname });
});
page.on('console', message => {
  const text = sanitize(message.text());
  if (/TooltipTrigger|ref is not a prop|Trying to access this ref|OverflowTooltip/i.test(text)) result.matchedWarnings.push({ type: message.type(), text: text.slice(0, 1200) });
});
page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));
async function removeRow() {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  if (!(await row.count())) return false;
  await row.locator('label[data-tonic="Checkbox"]').click();
  if (!(await row.getByRole('checkbox').isChecked())) throw new Error('Baseline Macro cleanup row did not become selected');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return true;
}

let created = false;
try {
  await page.goto(`${origin}/#/administration/macros`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('New Macro', { exact: true }).waitFor();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="name"]').fill(name);
  await dialog.locator('textarea[name="action"]').fill('G21\nG90');
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  await page.getByRole('button', { name, exact: true }).waitFor({ state: 'visible' });
  created = true;
  await page.waitForTimeout(500);
  result.gate = { status: 'passed', macroCreated: true, matchingTooltipWarningObserved: result.matchedWarnings.length > 0, warningCount: result.matchedWarnings.length };
} catch (error) {
  result.gate = { status: 'failed', error: sanitize(error).slice(0, 800), warningCount: result.matchedWarnings.length };
} finally {
  if (created) {
    try {
      result.cleanup = { removed: await removeRow() };
    } catch (error) {
      result.cleanup = { removed: false, error: sanitize(error).slice(0, 500) };
    }
  }
  flush();
  await browser.close();
}
if (result.gate?.status !== 'passed' || !result.gate.matchingTooltipWarningObserved || result.cleanup?.removed === false || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
