import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test, expect, openWorkspace } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

async function isolatedEvents(socketGuard) {
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
  return {
    client: () => client,
    emit: (...args) => client.emit(...args),
    close: () => new Promise(resolve => {
      io.close(resolve);
    }),
  };
}

test('workspace runtime modals show feeder pause, error and wait states without dismissing safety prompts on Escape', async ({ page, socketGuard }, testInfo) => {
  const events = await isolatedEvents(socketGuard);
  try {
    await openWorkspace(page);
    await expect.poll(() => Boolean(events.client())).toBe(true);
    events.emit('feeder:status', { hold: true, holdReason: { data: 'M6', msg: 'Isolated fixture tool change' } });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('M6 Tool Change');
    await expect(dialog).toContainText('Isolated fixture tool change');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
    await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    events.emit('feeder:status', { hold: true, holdReason: { err: true, msg: 'Isolated fixture feeder failure' } });
    await expect(dialog).toContainText('Isolated fixture feeder failure');
    await expect(dialog).toContainText('Error');
    events.emit('feeder:status', { hold: true, holdReason: { data: '%wait', msg: 'Fixture planner drain' } });
    await expect(dialog).toContainText('Waiting for the planner to empty...');
    await expect(dialog.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    events.emit('feeder:status', { hold: true, holdReason: { data: '%wait', msg: 'Fixture planner drain' } });
    await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    events.emit('feeder:status', { hold: false });
    await expect(dialog).toHaveCount(0);
  } finally {
    await capture(page, testInfo, 'final-page', { fullPage: true });
    await page.close();
    await events.close();
  }
});

test('workspace server-disconnected modal requires Reload and reconnects only to the isolated event server', async ({ page, socketGuard }, testInfo) => {
  const events = await isolatedEvents(socketGuard);
  try {
    await openWorkspace(page);
    await expect.poll(() => Boolean(events.client())).toBe(true);
    events.client().disconnect(true);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Server has stopped working');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
    const navigation = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Reload', exact: true }).click();
    await navigation;
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-widget-id="connection"]')).toBeVisible();
  } finally {
    await capture(page, testInfo, 'final-page', { fullPage: true });
    await page.close();
    await events.close();
  }
});
