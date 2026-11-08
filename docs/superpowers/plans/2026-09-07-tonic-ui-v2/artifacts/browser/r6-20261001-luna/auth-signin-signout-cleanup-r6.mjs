import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:8080';
const userId = process.env.R6_SYNTHETIC_USER_ID;
if (!/^\d{10,}$/.test(userId || '')) throw new Error('Set R6_SYNTHETIC_USER_ID to the recorded synthetic account run ID.');
const userName = `r6-user-${userId}-updated`;
const password = `R6-only-${userId}-synthetic!`;
const storagePath = process.env.R6_STORAGE_STATE;
if (!storagePath) throw new Error('Set R6_STORAGE_STATE to the isolated admin browser state.');
const storage = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: storage });
const userContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const adminPage = await adminContext.newPage();
const userPage = await userContext.newPage();
for (const page of [adminPage, userPage]) page.setDefaultTimeout(15000);
const result = {
  browser: { version: browser.version(), viewport: '1440x900', dpr: 1 },
  account: { synthetic: true, passwordPersisted: false, accountNamePersisted: false },
  gates: [],
  api: [],
  pageErrors: [],
  requestFailures: [],
};
const output = path.join(artifactDir, 'auth-signin-signout-cleanup-r6.json');
const sanitize = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }
for (const page of [adminPage, userPage]) {
  page.on('response', response => {
    const url = new URL(response.url());
    if (/^\/api\/(signin|signout|users)$/.test(url.pathname)) result.api.push({ method: response.request().method(), path: url.pathname, status: response.status() });
  });
  page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 800)));
  page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));
}
async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: sanitize(error).slice(0, 700) });
  }
  flush();
}
async function openAccountMenu(page) {
  const header = page.locator('header').first();
  await header.locator('button').last().click();
  const signOut = page.getByRole('menuitem', { name: 'Sign out', exact: true });
  await signOut.waitFor({ state: 'visible' });
  await signOut.click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor({ state: 'visible' });
}
async function signIn(page) {
  await page.goto(`${origin}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor({ state: 'visible' });
  await page.getByLabel('Username', { exact: true }).fill(userName);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ state: 'visible', timeout: 25000 });
}
async function removeSyntheticUser() {
  await adminPage.goto(`${origin}/#/administration/user-accounts`, { waitUntil: 'domcontentloaded' });
  await adminPage.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  const rowButton = adminPage.getByRole('button', { name: userName, exact: true });
  if (!(await rowButton.count())) return false;
  const row = adminPage.getByRole('row').filter({ hasText: userName }).first();
  await row.locator('label[data-tonic="Checkbox"]').click();
  if (!(await row.getByRole('checkbox').isChecked())) throw new Error('Synthetic user row was not selected for cleanup');
  await adminPage.getByRole('button', { name: 'Delete', exact: true }).click();
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return true;
}

try {
  await adminPage.goto(`${origin}/#/administration/user-accounts`, { waitUntil: 'domcontentloaded' });
  await adminPage.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  const accountExists = await adminPage.getByRole('button', { name: userName, exact: true }).count();
  result.account.existsBefore = accountExists > 0;
  await gate('sign-in synthetic user through login UI', async () => {
    await signIn(userPage);
    return { loginRouteAccepted: true, workspaceMounted: true, credentialValuesPersisted: false };
  });
  await gate('sign-out synthetic user through header menu', async () => {
    await openAccountMenu(userPage);
    return { returnedToSignIn: true, tokenPersisted: false };
  });
  await gate('sign-in again after sign-out through login UI', async () => {
    await signIn(userPage);
    return { workspaceMounted: true, credentialValuesPersisted: false };
  });
  await gate('sign-out second synthetic session', async () => {
    await openAccountMenu(userPage);
    return { returnedToSignIn: true, tokenPersisted: false };
  });
  await gate('remove synthetic account with isolated admin UI', async () => {
    const removed = await removeSyntheticUser();
    if (accountExists && !removed) throw new Error('Synthetic user was absent from the admin table during cleanup');
    result.account.existsAfter = await adminPage.getByRole('button', { name: userName, exact: true }).count() > 0;
    if (result.account.existsAfter) throw new Error('Synthetic user remains after confirmed Delete action');
    return { removed, absentAfterCleanup: true };
  });
} finally {
  flush();
  await browser.close();
}
if (result.gates.some(gate => gate.status !== 'passed') || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
