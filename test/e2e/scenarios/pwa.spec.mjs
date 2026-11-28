import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, openWorkspace } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';
import { installSocketGuard } from '../support/socket-guard.mjs';
import { installApiGuard } from '../support/api-guard.mjs';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(import.meta.url);
const socketIO = require('socket.io');
const port = 18081;
const baseURL = `http://127.0.0.1:${port}`;

// This file alone enables the real worker. The worker does not handle API or
// Socket.IO requests; the existing fail-closed guards still inspect that traffic.
test.use({ baseURL, serviceWorkers: 'allow' });
test.setTimeout(150_000);

let directory;
let child;
let logs;

async function start() {
  child = spawn(process.execPath, [
    path.join(root, 'bin/cncjs'), '--host', '127.0.0.1', '--port', String(port),
    '--config', path.join(directory, 'cncrc'), '--watch-directory', path.join(directory, 'watch'),
  ], { cwd: root, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
  logs = '';
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  await expect.poll(async () => {
    if (child.exitCode !== null) {
      throw new Error(`Isolated CNCjs exited: ${logs}`);
    }
    try {
      return (await fetch(baseURL)).ok;
    } catch {
      return false;
    }
  }, { timeout: 20_000 }).toBe(true);
}

async function stop() {
  const running = child;
  child = null;
  if (running && running.exitCode === null && running.signalCode === null) {
    const exited = once(running, 'exit');
    running.kill('SIGTERM');
    await exited;
  }
}

async function controlled(page) {
  await openWorkspace(page);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test.beforeEach(async ({}, testInfo) => {
  // Refuse to stop or reuse another task's server at the reserved test address.
  const occupied = await fetch(baseURL).then(() => true, () => false);
  if (occupied) {
    throw new Error(`${baseURL} is already in use; no existing process was changed.`);
  }
  directory = await mkdtemp(path.join(tmpdir(), 'cncjs-pwa-'));
  await mkdir(path.join(directory, 'watch'));
  const config = {
    users: [], events: [], commands: [], macros: [], ports: [], mountPoints: [],
    state: { checkForUpdates: false, allowAnonymousUsageDataCollection: false },
  };
  if (testInfo.title.includes('enabled')) {
    config.connectionRecovery = { offlineFallback: true };
  }
  await writeFile(path.join(directory, 'cncrc'), JSON.stringify(config));
  await start();
});

test.afterEach(async () => {
  await stop();
  await rm(directory, { recursive: true, force: true });
});

test('PWA manifest, initial navigation, controlled offline reload and actual server recovery', async ({ page, context }, testInfo) => {
  await controlled(page);
  expect(await page.locator('#cncjs-config').textContent()).toBe('{"connectionRecovery":{"offlineFallback":false}}');
  const manifestURL = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(new URL(manifestURL, baseURL).href)).json();
  expect(manifest).toMatchObject({ start_url: './', scope: './', display: 'fullscreen' });
  for (const icon of manifest.icons) {
    expect((await page.request.get(new URL(icon.src, baseURL).href)).ok()).toBe(true);
  }
  const cdp = await context.newCDPSession(page);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  // The standard fixture is incognito. Prove installability separately in a
  // disposable persistent profile, with the same API and Socket.IO guards.
  expect(installability.installabilityErrors.map(error => error.errorId)).toEqual(['in-incognito']);
  const persistent = await chromium.launchPersistentContext(path.join(directory, 'profile'), {
    executablePath: process.env.E2E_BROWSER_PATH,
    headless: true,
    serviceWorkers: 'allow',
  });
  const guard = await installSocketGuard(persistent, baseURL);
  const forbidden = await installApiGuard(persistent, baseURL, { ident: null });
  try {
    await persistent.addInitScript(() => {
      localStorage.setItem('cnc', JSON.stringify({ state: {
        widgets: { connection: { autoReconnect: false } },
        settings: { language: 'en', appearance: 'light' },
      } }));
      Object.defineProperty(navigator, 'mediaDevices', { value: {
        enumerateDevices: () => Promise.resolve([]),
        getUserMedia: () => Promise.reject(new Error('Camera disabled for PWA verification')),
      } });
    });
    const persistentPage = persistent.pages()[0];
    await persistentPage.goto(`${baseURL}/#/workspace`);
    await expect.poll(() => persistentPage.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const diagnostics = await persistent.newCDPSession(persistentPage);
    expect((await diagnostics.send('Page.getAppManifest')).errors).toEqual([]);
    expect((await diagnostics.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
    expect(forbidden).toEqual([]);
    guard.assertSafe();
  } finally {
    await persistent.close();
  }
  await page.goto('/#/about');
  await expect(page).not.toHaveTitle('CNCjs is offline');
  await page.goto('/#/workspace');
  await capture(page, testInfo, 'installed-worker-online', { fullPage: true });
  await stop();
  await page.reload();
  await expect(page).toHaveTitle('CNCjs is offline');
  await expect(page.getByRole('heading', { name: 'CNCjs is offline' })).toBeVisible();
  await capture(page, testInfo, 'offline-fallback', { fullPage: true });
  await start();
  await expect(page.locator('[data-widget-id="connection"]')).toBeVisible({ timeout: 20_000 });
  await capture(page, testInfo, 'server-recovered', { fullPage: true });
});

test('default-off keeps a disconnected workspace through a prolonged actual outage', async ({ page }, testInfo) => {
  await controlled(page);
  await stop();
  await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
  // Real elapsed time is essential: do not accelerate the fixed recovery interval.
  await page.waitForTimeout(40_000);
  await expect(page).not.toHaveTitle('CNCjs is offline');
  await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
  await capture(page, testInfo, 'default-off-disconnected', { fullPage: true });
  await start();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
});

test('enabled fallback tolerates a short actual outage and returns without navigation', async ({ page }) => {
  await controlled(page);
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1; });
  await stop();
  await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
  await page.waitForTimeout(10_000);
  await expect(page).not.toHaveTitle('CNCjs is offline');
  await start();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  expect(navigations).toBe(0);
});

test('enabled fallback transitions after continuous HTTP failure and recovers after an actual restart', async ({ page }, testInfo) => {
  await controlled(page);
  const began = Date.now();
  await stop();
  await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
  await expect(page).toHaveTitle('CNCjs is offline', { timeout: 55_000 });
  expect(Date.now() - began).toBeGreaterThanOrEqual(30_000);
  await capture(page, testInfo, 'automatic-offline-fallback', { fullPage: true });
  await start();
  await expect(page.locator('[data-widget-id="connection"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a fresh profile without a worker cannot load CNCjs during an actual outage', async ({ page }) => {
  await stop();
  await expect(page.goto(baseURL)).rejects.toThrow();
  expect(await page.title()).not.toBe('CNCjs is offline');
});

test('enabled fallback resets its HTTP failure timer after transient actual server recovery', async ({ page, socketGuard }) => {
  // Keep transport disconnected using the existing private polling-fixture
  // contract while the real CNCjs HTTP server recovers independently.
  const server = createServer();
  const io = socketIO(server, { transports: ['polling'], allowUpgrades: false });
  let client;
  io.on('connection', socket => {
    client = socket;
    socket.emit('startup', { availableControllers: ['Grbl'] });
  });
  await new Promise(resolve => { server.listen(0, '127.0.0.1', resolve); });
  socketGuard.usePollingProxy(server);
  try {
    await controlled(page);
    await expect.poll(() => Boolean(client)).toBe(true);
    client.disconnect(true);
    await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
    await stop();
    await page.waitForTimeout(20_000);
    await expect(page).not.toHaveTitle('CNCjs is offline');
    const reached = page.waitForResponse(response => response.request().method() === 'HEAD' && response.status() === 200);
    await start();
    await reached;
    await stop();
    await page.waitForTimeout(20_000);
    await expect(page).not.toHaveTitle('CNCjs is offline');
    await expect(page.getByRole('dialog')).toContainText('Server has stopped working');
    await expect(page).toHaveTitle('CNCjs is offline', { timeout: 25_000 });
    await start();
    await expect(page.locator('[data-widget-id="connection"]')).toBeVisible({ timeout: 20_000 });
  } finally {
    await page.close();
    await new Promise(resolve => { io.close(resolve); });
  }
});
