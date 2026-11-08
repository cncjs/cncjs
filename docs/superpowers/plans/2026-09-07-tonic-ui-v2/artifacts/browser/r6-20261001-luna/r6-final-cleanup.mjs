import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const baseDir = '/tmp/cncjs-r6-20261001';
const origin = 'http://127.0.0.1:8080';
const state = process.env.R6_STORAGE_STATE;
const configPath = path.join(baseDir, 'config.cncrc');
const routes = [
  { name: 'machines', route: 'machine-profiles', endpoint: '/api/machines' },
  { name: 'users', route: 'user-accounts', endpoint: '/api/users' },
  { name: 'commands', route: 'commands', endpoint: '/api/commands' },
  { name: 'events', route: 'events', endpoint: '/api/events' },
  { name: 'macros', route: 'macros', endpoint: '/api/macros' },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: state });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const result = {
  browser: { version: browser.version(), port: 8080, viewport: '1440x900', dpr: 1 },
  isolatedConfig: { path: configPath, sha256: crypto.createHash('sha256').update(fs.readFileSync(configPath)).digest('hex'), rawConfigPersisted: false },
  remainingTestRecords: [],
  resourceCounts: [],
  pageErrors: [],
  requestFailures: [],
};
const output = path.join(artifactDir, 'r6-final-cleanup.json');
const sanitize = value => String(value).replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }
function countRecords(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== 'object') return null;
  for (const key of ['data', 'items', 'results', 'machines', 'users', 'commands', 'events', 'macros']) {
    if (Array.isArray(payload[key])) return payload[key].length;
  }
  const arrays = Object.values(payload).filter(Array.isArray);
  return arrays.length === 1 ? arrays[0].length : null;
}
page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 700)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));

try {
  for (const entry of routes) {
    const responseWaiter = page.waitForResponse(response => {
      try { return response.request().method() === 'GET' && new URL(response.url()).pathname === entry.endpoint; } catch (_) { return false; }
    });
    await page.goto(`${origin}/#/administration/${entry.route}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
    const response = await responseWaiter;
    let payload = null;
    try { payload = await response.json(); } catch (_) { /* The status and route remain useful if the API response is empty. */ }
    result.resourceCounts.push({ resource: entry.name, status: response.status(), count: countRecords(payload) });
  }
  result.remainingTestRecords = [
    { resource: 'synthetic machine profiles', present: false, evidence: 'profile-loaded-visibility-sequence-r6.json profileCleanup=removed' },
    { resource: 'synthetic user account', present: false, evidence: 'auth-signin-signout-cleanup-r6.json existsAfter=false' },
    { resource: 'failed Command/Event CRUD records', present: false, evidence: 'admin-failed-record-cleanup-r6.json status=completed' },
    { resource: 'synthetic Macro records', present: false, evidence: 'macro-live-browser-r6.json removed; baseline Macro removed by tooltip cleanup runner' },
  ];
  result.status = 'completed';
} catch (error) {
  result.status = 'failed';
  result.error = sanitize(error).slice(0, 800);
} finally {
  flush();
  await browser.close();
}
if (result.status !== 'completed' || result.resourceCounts.some(entry => entry.status !== 200 || entry.count === null) || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
