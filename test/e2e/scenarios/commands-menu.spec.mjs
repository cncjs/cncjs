/* Task lifecycle ordering is intentionally sequential across loop iterations. */
/* eslint-disable no-await-in-loop, no-loop-func */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test, expect, openWorkspace } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

const records = [
  { id: 'enabled', name: 'Inspect machine', action: 'mock-inspect', enabled: true, mtime: 1792886400000 },
  { id: 'fallback', name: '', action: 'mock-fallback', enabled: true, mtime: 1792886400000 },
  { id: 'disabled', name: 'Hidden command', action: 'mock-hidden', enabled: false, mtime: 1792886400000 },
];
async function mockCommands(page, initial = records) {
  let current = initial;
  await page.route(/\/api\/commands(\?.*)?$/, route => route.fulfill({
    json: { records: current, pagination: { totalRecords: current.length } },
  }));
  return value => {
    current = value;
  };
}
async function openMenu(page) {
  await page.locator('header').getByRole('button', { name: 'Commands', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

test('custom commands menu filters enabled records and links to management while disconnected', async ({ page }) => {
  await mockCommands(page);
  await openWorkspace(page);
  await openMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Inspect machine', exact: true })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: 'mock-fallback', exact: true })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: 'Hidden command', exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Manage Commands', exact: true }).click();
  await expect(page).toHaveURL(/#\/administration\/commands$/);
});

test('custom commands menu activates a command with Enter exactly once', async ({ page }) => {
  await mockCommands(page);
  const requests = [];
  await page.route('**/api/commands/enabled/run', route => {
    requests.push(route.request().postData());
    return route.fulfill({ json: { taskId: 'keyboard-task' } });
  });
  await openWorkspace(page);
  await openMenu(page);
  const item = page.getByRole('menuitem', { name: 'Inspect machine', exact: true });
  await item.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('custom commands menu shows an empty state and HTTP execution failures', async ({ page }) => {
  const update = await mockCommands(page, []);
  await openWorkspace(page);
  await openMenu(page);
  await expect(page.getByText('No commands available', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  update(records);
  await page.reload();
  await page.route('**/api/commands/enabled/run', route => route.fulfill({ status: 500, json: { msg: 'Mock failure' } }));
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Inspect machine', exact: true }).click();
  await expect(page.getByText(/Inspect machine.*encountered an error/)).toBeVisible();
  await openMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Inspect machine', exact: true })).toBeEnabled();
});

test('custom commands menu tracks task completion before HTTP responses and refreshes changed configuration', async ({ page, socketGuard }, testInfo) => {
  const update = await mockCommands(page);
  const server = createServer();
  const io = socketIO(server, { transports: ['polling'], allowUpgrades: false });
  let client;
  io.on('connection', socket => {
    client = socket;
    socket.emit('startup', { availableControllers: ['Grbl'] });
  });
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  socketGuard.usePollingProxy(server);
  let pending;
  let requests = 0;
  await page.route('**/api/commands/enabled/run', route => {
    requests += 1; pending = route;
  });
  try {
    await openWorkspace(page);
    await expect.poll(() => Boolean(client)).toBe(true);
    for (const [task, code] of [['success', 0], ['failure', 7]]) {
      await openMenu(page);
      await page.getByRole('menuitem', { name: 'Inspect machine', exact: true }).click();
      await expect.poll(() => Boolean(pending)).toBe(true);
      client.emit('task:start', task, { id: 'enabled', name: 'Inspect machine' });
      await openMenu(page);
      await expect(page.getByRole('menuitem', { name: 'Inspect machine', exact: true })).toBeDisabled();
      client.emit('task:end', task, code);
      await expect(page.getByText(`The command "Inspect machine" has completed with exit code ${code}.`, { exact: true })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Inspect machine', exact: true })).toBeEnabled();
      await pending.fulfill({ json: { taskId: task } });
      pending = null;
      await page.keyboard.press('Escape');
    }
    expect(requests).toBe(2);
    update([{ ...records[0], name: 'Updated command' }]);
    client.emit('config:change');
    await openMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Updated command', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Inspect machine', exact: true })).toHaveCount(0);
  } finally {
    await capture(page, testInfo, 'final-page', { fullPage: true });
    await page.close();
    await new Promise(resolve => {
      io.close(resolve);
    });
  }
});
