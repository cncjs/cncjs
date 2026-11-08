import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.R6_BASELINE_PORT || '8082';
const origin = `http://127.0.0.1:${port}`;
const storage = JSON.parse(fs.readFileSync(process.env.R6_STORAGE_STATE, 'utf8'));
storage.origins = (storage.origins || []).map(entry => ({
  ...entry,
  origin: entry.origin.replace(/:\d+$/, `:${port}`),
}));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: storage });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const result = {
  browser: { version: browser.version(), port, route: '/#/administration/macros', viewport: '1440x900', dpr: 1 },
  api: [],
  tooltipWarnings: [],
  pageErrors: [],
  requestFailures: [],
};
const output = path.join(artifactDir, 'macro-tooltip-baseline-r6.json');
const sanitize = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }

page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname === '/api/macros') result.api.push({ status: response.status(), path: url.pathname });
});
page.on('console', message => {
  if (!['warning', 'error'].includes(message.type())) return;
  const text = sanitize(message.text());
  if (/TooltipTrigger|\bref\b|OverflowTooltip/i.test(text)) result.tooltipWarnings.push({ type: message.type(), text: text.slice(0, 1000) });
});
page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));

try {
  await page.goto(`${origin}/#/administration/macros`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  result.status = 'completed';
} catch (error) {
  result.status = 'failed';
  result.error = sanitize(error).slice(0, 700);
} finally {
  flush();
  await browser.close();
}
if (result.status !== 'completed' || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
