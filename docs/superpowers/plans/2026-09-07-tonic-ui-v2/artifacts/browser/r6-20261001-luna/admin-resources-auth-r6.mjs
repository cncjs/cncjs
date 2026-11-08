import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(10000);

const runId = Date.now();
const fixtures = {
  command: { route: 'commands', initial: `R6 command ${runId}`, updated: `R6 command ${runId} updated`, fields: { 'Command name:': `R6 command ${runId}`, 'Command action:': 'printf r6-synthetic-command' }, updatedFields: { 'Command name:': `R6 command ${runId} updated`, 'Command action:': 'printf r6-synthetic-command-updated' }, title: 'Command', endpoint: '/api/commands' },
  event: { route: 'events', initial: `R6 event ${runId}`, updated: `R6 event ${runId} updated`, fields: { 'Event name:': `R6 event ${runId}`, 'Event trigger:': 'synthetic R6 browser regression', 'Event action:': 'G21' }, updatedFields: { 'Event name:': `R6 event ${runId} updated`, 'Event trigger:': 'synthetic R6 browser regression updated', 'Event action:': 'G20' }, title: 'Event', endpoint: '/api/events' },
  macro: { route: 'macros', initial: `R6 macro ${runId}`, updated: `R6 macro ${runId} updated`, fields: { 'Macro name:': `R6 macro ${runId}`, 'G-code commands:': 'G21\nG90\nG0 X1 Y1' }, updatedFields: { 'Macro name:': `R6 macro ${runId} updated`, 'G-code commands:': 'G20\nG90\nG0 X2 Y2' }, title: 'Macro', endpoint: '/api/macros' },
};
const user = { route: 'user-accounts', initial: `r6-user-${runId}`, updated: `r6-user-${runId}-updated`, password: `R6-only-${runId}-synthetic!` };
const gates = [];
const api = [];
const consoleIssues = [];
const pageErrors = [];
const requestFailures = [];
let userCreated = false;
let userAuthenticated = false;

page.on('request', request => {
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (!/^\/api\/(commands|events|macros|users|signin|signout)/.test(url.pathname)) return;
  const entry = { method: request.method(), path: url.pathname };
  if (['POST', 'PUT'].includes(request.method()) && !url.pathname.endsWith('/signin')) {
    try {
      const body = request.postDataJSON();
      entry.bodyKeys = Object.keys(body || {}).sort();
    } catch (_) {
      entry.bodyKeys = [];
    }
  }
  api.push(entry);
});
page.on('response', response => {
  let pathname;
  try { pathname = new URL(response.url()).pathname; } catch (_) { return; }
  if (/^\/api\/(commands|events|macros|users|signin|signout)/.test(pathname)) api.push({ status: response.status(), path: pathname });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 300) });
});
page.on('pageerror', error => pageErrors.push(String(error).slice(0, 600)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const resultPath = path.join(artifactDir, 'admin-resources-auth-r6.json');
function flush() {
  fs.writeFileSync(resultPath, JSON.stringify({
    browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
    fixtures: {
      commands: { name: fixtures.command.initial, updatedName: fixtures.command.updated },
      events: { name: fixtures.event.initial, updatedName: fixtures.event.updated },
      macros: { name: fixtures.macro.initial, updatedName: fixtures.macro.updated },
      user: { name: user.initial, updatedName: user.updated, passwordStored: false },
    },
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
    await page.screenshot({ path: path.join(artifactDir, `admin-resources-auth-failure-${name}.png`) }).catch(() => {});
  }
  flush();
}

async function openRoute(route) {
  await page.goto(`http://127.0.0.1:8080/#/administration/${route}`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
}

async function fillFields(fields) {
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).fill(value);
  }
}

async function cleanupRecord(resource, name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  if (!(await row.count())) return false;
  await row.locator('label[data-tonic="Checkbox"]').click();
  const checkbox = row.getByRole('checkbox');
  if (!(await checkbox.isChecked())) throw new Error(`Cleanup selection failed for ${resource} ${name}`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return true;
}

async function exerciseCrud(resource) {
  const def = fixtures[resource];
  const short = def.title;
  await openRoute(def.route);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText(`New ${short}`, { exact: true }).waitFor();
  await fillFields(def.fields);
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  const createdRow = page.getByRole('row').filter({ hasText: def.initial });
  await createdRow.waitFor();
  const created = await page.getByRole('button', { name: def.initial, exact: true }).count();
  if (created !== 1) throw new Error(`${resource} create was not visible in the table`);

  await page.getByRole('button', { name: def.initial, exact: true }).click();
  await page.getByText(`${short} Details`, { exact: true }).waitFor();
  for (const [label, value] of Object.entries(def.fields)) {
    if (await page.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).inputValue() !== value) {
      throw new Error(`${resource} read returned wrong ${label}`);
    }
  }
  await fillFields(def.updatedFields);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: def.updated, exact: true }).waitFor();
  const deleted = await cleanupRecord(resource, def.updated);
  if (!deleted) throw new Error(`${resource} cleanup could not find updated record`);
  return { created: def.initial, readBack: true, updated: def.updated, removed: true };
}

try {
  for (const resource of ['command', 'event', 'macro']) {
    await gate(`${resource}-create-read-update-delete`, () => exerciseCrud(resource));
  }

  await gate('create-update-user', async () => {
    await openRoute(user.route);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByText('New User', { exact: true }).waitFor();
    await page.getByLabel(/^User name:/).fill(user.initial);
    await page.getByLabel(/^Password:/).fill(user.password);
    await page.getByRole('button', { name: 'Add', exact: true }).last().click();
    await page.getByRole('button', { name: user.initial, exact: true }).waitFor();
    userCreated = true;
    await page.getByRole('button', { name: user.initial, exact: true }).click();
    await page.getByText('User Details', { exact: true }).waitFor();
    if (await page.getByLabel(/^User name:/).inputValue() !== user.initial) throw new Error('User read returned wrong name');
    await page.getByLabel(/^User name:/).fill(user.updated);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: user.updated, exact: true }).waitFor();
    user.initial = user.updated;
    return { created: user.updated, readBack: true, passwordRecorded: false };
  });

  await gate('sign-in-with-created-user', async () => {
    await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor();
    await page.getByLabel('Username', { exact: true }).fill(user.updated);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 30000 });
    userAuthenticated = true;
    return { authenticatedAsSyntheticUser: true, credentialValuesRecorded: false };
  });

  await gate('sign-out-through-header-menu', async () => {
    const header = page.locator('header[aria-label="Application header"]');
    await header.locator('button').last().click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).waitFor();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor({ timeout: 15000 });
    userAuthenticated = false;
    return { signOutReturnedToLogin: true, tokenValueRecorded: false };
  });

  await gate('cleanup-user-account', async () => {
    await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor();
    await page.getByLabel('Username', { exact: true }).fill(user.updated);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 30000 });
    userAuthenticated = true;
    await openRoute(user.route);
    const deleted = await cleanupRecord('user', user.updated);
    if (!deleted) throw new Error('Could not remove temporary user account');
    userCreated = false;
    return { removed: true, credentialsRecorded: false };
  });

  if (userAuthenticated) {
    await page.locator('header[aria-label="Application header"]').locator('button').last().click();
    const signout = page.getByRole('menuitem', { name: 'Sign out', exact: true });
    if (await signout.isVisible().catch(() => false)) await signout.click();
    userAuthenticated = false;
  }
  await page.screenshot({ path: path.join(artifactDir, 'admin-resources-auth-r6-final.png'), fullPage: true });
} finally {
  if (userCreated) {
    try {
      if (!userAuthenticated) {
        await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor({ timeout: 5000 });
        await page.getByLabel('Username', { exact: true }).fill(user.updated);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In', exact: true }).click();
        await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 15000 });
        userAuthenticated = true;
      }
      await openRoute(user.route);
      await cleanupRecord('user', user.updated);
      userCreated = false;
    } catch (_) {
      gates.push({ name: 'cleanup-user-account-finally', status: 'failed', error: 'Temporary user record may remain; inspect the isolated browser config and remove the synthetic record after restoring sign-in.' });
    }
  }
  flush();
  await browser.close();
}
