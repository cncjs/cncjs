import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import {
  test as base,
  expect,
  openWorkspace,
  widget,
} from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

const IDENT = 'e2e-widget-modal';
const WATCH_GCODE = 'G21\nG90\nG1 X10 Y5 F600\n';
const TOOL_CHANGE_GCODE = 'G21\nG90\nM6 T1\nG1 X10 Y5 F600\n';

const readConfig = page => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('cnc') || '{}');
  return (raw.state || {}).widgets || {};
});

// Tonic focuses the menu container in a requestAnimationFrame after it opens and
// wraps its content in a Collapse that clips while entering. Interacting before
// both settle makes pointerup land on a different item than pointerdown.
const waitForMenuReady = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const moreButton = (page, id) => widget(page, id)
  .getByRole('button', { name: /^More( options)?$/ });

const openMore = async (page, id) => {
  await moreButton(page, id).click();
  await waitForMenuReady(page);
};

const menuItemTexts = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return (await menu.getByRole('menuitem').allTextContents()).map(text => text.trim());
};

const clickMenuItem = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
};

// Tonic renders its checkbox input inside a label and keeps the input visually
// hidden, so toggle through the label instead of the native input.
const setChecked = async (checkbox, checked) => {
  if ((await checkbox.isChecked()) !== checked) {
    await checkbox.locator('xpath=ancestor::label[1]').click();
  }
  await expect(checkbox).toBeChecked({ checked });
};

/**
 * Local read-only Socket.IO snapshot. It publishes Grbl state on demand and
 * acknowledges the commands emitted by the widget surfaces under test without
 * touching a controller, the file system, or the application server.
 */
const test = base.extend({
  mockController: async ({ page, context, baseURL, socketGuard }, use, testInfo) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
      throw new Error('Widget modal scenarios require a local CNCjs application.');
    }
    const server = createServer();
    const io = socketIO(server, { transports: ['polling'], allowUpgrades: false });
    const commands = [];
    const closes = [];
    let client;

    io.on('connection', socket => {
      client = socket;
      socket.emit('startup', { availableControllers: ['Grbl', 'Marlin', 'Smoothie', 'TinyG'] });
      socket.on('command', (ident, cmd, ...args) => {
        const callback = args.find(arg => typeof arg === 'function');
        commands.push({ cmd, args: args.filter(arg => typeof arg !== 'function') });
        if (cmd === 'autolevel:getProbeState') {
          callback?.(null, {
            state: {
              probedPositions: [],
              probePoints: [],
              minZ: null,
              maxZ: null,
              config: null,
            },
          });
          return;
        }
        if (cmd === 'watchdir_load') {
          const [file] = args;
          socket.emit('sender:load', { name: file, content: WATCH_GCODE }, {});
          socket.emit('sender:status', {
            loaded: true,
            hold: false,
            holdReason: null,
            name: file,
            size: WATCH_GCODE.length,
            total: 4,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
          });
          callback?.(null, {});
          return;
        }
        if (cmd === 'sender_load') {
          const [meta = {}] = args;
          const content = String(meta.content ?? '');
          socket.emit('sender:load', { name: meta.name, content }, {});
          socket.emit('sender:status', {
            loaded: true,
            hold: false,
            holdReason: null,
            name: meta.name,
            size: content.length,
            total: content.split('\n').filter(Boolean).length,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,
          });
          callback?.(null, {});
          return;
        }
        callback?.(null, {});
      });
      socket.on('close', (ident, callback) => {
        closes.push(ident);
        socket.emit('connection:close', {
          type: 'socket',
          ident,
          options: { host: '127.0.0.1', port: 23 },
        });
        callback?.();
      });
      socket.on('open', (controllerType, connectionType, options, callback) => {
        callback?.(null, { ident: IDENT });
      });
      socket.on('getPorts', callback => callback?.(null, []));
      socket.on('getBaudRates', callback => callback?.(null, []));
    });

    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });
    socketGuard.usePollingProxy(server);
    try {
      await use({
        commands,
        closes,
        ready: async () => {
          await expect.poll(() => Boolean(client)).toBe(true);
        },
        emit: (event, ...args) => client.emit(event, ...args),
        connect: () => {
          client.emit('connection:open', {
            type: 'socket',
            ident: IDENT,
            options: { host: '127.0.0.1', port: 23 },
          });
          client.emit('controller:settings', 'Grbl', {
            $13: 0,
            $100: 250,
            $101: 250,
            $102: 250,
            $110: 1000,
            $111: 1000,
            $112: 1000,
            $120: 100,
            $121: 100,
            $122: 100,
            $130: 200,
            $131: 200,
            $132: 200,
          });
          client.emit('controller:state', 'Grbl', {
            status: {
              machineState: 'Idle',
              mpos: { x: 0, y: 0, z: 0 },
              wpos: { x: 0, y: 0, z: 0 },
            },
            parserstate: {
              modal: {
                motion: 'G0',
                wcs: 'G54',
                plane: 'G17',
                units: 'G21',
                distance: 'G90',
                feedrate: 'G94',
                program: 'M0',
                spindle: 'M5',
                coolant: 'M9',
              },
            },
          });
          client.emit('workflow:state', 'idle');
        },
      });
    } finally {
      await capture(page, testInfo, 'final-page', { fullPage: true });
      await page.close();
      await context.unrouteAll({ behavior: 'wait' });
      await new Promise(resolve => {
        io.close(resolve);
      });
    }
  },
});

test.describe('connection close confirmation', () => {
  test('connection close confirmation cancels and then closes the mocked connection', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const connection = widget(page, 'connection');
    const close = connection.getByRole('button', { name: 'Close', exact: true });
    await expect(close).toBeEnabled();

    await close.click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Are you sure you want to close the connection?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(close).toBeEnabled();
    expect(mockController.closes).toEqual([]);

    await close.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Are you sure you want to close the connection?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(connection.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
    await expect(connection.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
    expect(mockController.closes).toEqual([IDENT]);
  });
});

test.describe('custom and webcam settings', () => {
  test('custom settings closes on escape and saves title and URL', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();

    const root = widget(page, 'custom');
    const openSettings = async () => {
      await openMore(page, 'custom');
      await clickMenuItem(page, 'Settings');
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Settings', { exact: true })).toBeVisible();
      return dialog;
    };

    let dialog = await openSettings();
    await expect(dialog.locator('#custom-settings-title')).toHaveValue('');
    await expect(dialog.locator('#custom-settings-url')).toHaveValue('');
    await dialog.locator('#custom-settings-title').fill('Discarded Custom');
    await dialog.locator('#custom-settings-url').fill('/widget/discarded');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await readConfig(page)).custom?.title ?? '').toBe('');

    dialog = await openSettings();
    await dialog.locator('#custom-settings-title').fill('E2E Custom URL');
    await dialog.locator('#custom-settings-url').fill('/widget/e2e');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await readConfig(page)).custom).toMatchObject({
      title: 'E2E Custom URL',
      url: '/widget/e2e',
    });
    await expect(root).toContainText('The widget is currently disabled');

    dialog = await openSettings();
    await expect(dialog.locator('#custom-settings-title')).toHaveValue('E2E Custom URL');
    await expect(dialog.locator('#custom-settings-url')).toHaveValue('/widget/e2e');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('webcam settings exercises its device dropdown and saves an IP camera stream', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();

    const root = widget(page, 'webcam');
    await openMore(page, 'webcam');
    await clickMenuItem(page, 'Settings');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Webcam Settings', { exact: true })).toBeVisible();

    const local = dialog.getByRole('radio').nth(0);
    const stream = dialog.getByRole('radio').nth(1);
    const device = dialog.getByRole('button', { name: 'Choose a video device', exact: true });
    const url = dialog.getByLabel('Stream URL');
    await expect(local).toBeChecked();
    await expect(url).toBeDisabled();

    await device.click();
    await waitForMenuReady(page);
    await expect(page.getByRole('menuitem', { name: 'Automatic detection', exact: true })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      return Boolean(menu && menu.contains(document.activeElement) && document.activeElement !== menu);
    })).toBe(true);
    await page.getByRole('menuitem', { name: 'Automatic detection', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(device).toHaveText('Automatic detection');

    await dialog.getByText('Connect to an IP camera', { exact: true }).click();
    await expect(stream).toBeChecked();
    await expect(device).toBeDisabled();
    await expect(url).toBeEnabled();
    await url.fill('http://127.0.0.1:8080/?action=stream');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await readConfig(page)).webcam).toMatchObject({
      mediaSource: 'stream',
      url: 'http://127.0.0.1:8080/?action=stream',
    });
    await expect(root).toContainText('Webcam is off');

    await openMore(page, 'webcam');
    await clickMenuItem(page, 'Settings');
    const reopened = page.getByRole('dialog');
    await expect(reopened.getByRole('radio').nth(1)).toBeChecked();
    await expect(reopened.getByLabel('Stream URL')).toHaveValue('http://127.0.0.1:8080/?action=stream');
    await reopened.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('macro modals', () => {
  const records = [
    {
      id: 'e2e-macro-1',
      mtime: Date.UTC(2026, 0, 1),
      name: 'Fixture Macro',
      content: 'G0 X0 Y0',
    },
  ];

  test('macro new, edit, delete, load and run surfaces use mocked records', async ({ page, mockController }) => {
    const writes = [];
    let failCreate = true;
    await page.route('**/api/macros**', async route => {
      const request = route.request();
      const method = request.method();
      if (method === 'GET') {
        await route.fulfill({ json: { records } });
        return;
      }
      writes.push({
        method,
        path: new URL(request.url()).pathname,
        body: request.postDataJSON(),
      });
      if (method === 'POST' && failCreate) {
        failCreate = false;
        await route.fulfill({ status: 500, json: { msg: 'E2E create failure' } });
        return;
      }
      await route.fulfill({ json: { err: null } });
    });
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const root = widget(page, 'macro');
    await expect(root.getByText('Fixture Macro', { exact: true })).toBeVisible();

    await root.getByRole('button', { name: 'New macro', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Macro', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(dialog.getByText('This field is required.')).toHaveCount(2);
    await dialog.locator('input').first().fill('E2E New Macro');
    await dialog.locator('textarea').fill('G0 X1 Y1');
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Request failed with status code 500');
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => writes.filter(write => write.method === 'POST').map(write => write.body)).toEqual([
      { name: 'E2E New Macro', content: 'G0 X1 Y1' },
      { name: 'E2E New Macro', content: 'G0 X1 Y1' },
    ]);

    const edit = root.getByRole('button', { name: 'Edit macro: Fixture Macro', exact: true });
    await edit.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit Macro', { exact: true })).toBeVisible();
    await expect(dialog.locator('input').first()).toHaveValue('Fixture Macro');
    await expect(dialog.locator('textarea')).toHaveValue('G0 X0 Y0');

    const variablesButton = dialog.getByRole('button', { name: 'Macro Variables', exact: true });
    await variablesButton.click();
    await waitForMenuReady(page);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      return Boolean(menu && menu.contains(document.activeElement) && document.activeElement !== menu);
    })).toBe(true);
    const variables = await menuItemTexts(page);
    expect(variables.length).toBeGreaterThan(10);
    await page.getByRole('menuitem', { name: variables[0], exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(dialog.locator('textarea')).toHaveValue(/%wait/);

    await dialog.locator('input').first().fill('Renamed Macro');
    await dialog.locator('textarea').fill('G1 X2 Y2');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => writes.filter(write => write.method === 'PUT').map(write => ({
      path: write.path,
      body: write.body,
    }))).toEqual([{
      path: '/api/macros/e2e-macro-1',
      body: { name: 'Renamed Macro', content: 'G1 X2 Y2' },
    }]);

    await edit.click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    let confirm = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete this macro?' });
    await expect(confirm.getByText('Delete Macro', { exact: true })).toBeVisible();
    await expect(confirm.getByText('Are you sure you want to delete this macro?', { exact: true })).toBeVisible();
    await expect(confirm.getByText('Fixture Macro', { exact: true })).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(1);
    expect(writes.filter(write => write.method === 'DELETE')).toEqual([]);

    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    confirm = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete this macro?' });
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => writes.filter(write => write.method === 'DELETE').map(write => write.path)).toEqual([
      '/api/macros/e2e-macro-1',
    ]);

    const load = root.getByRole('button', { name: 'Load macro: Fixture Macro', exact: true });
    await expect(load).toBeEnabled();
    await load.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Load Macro', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Are you sure you want to load this macro?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'No', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(mockController.commands.filter(command => command.cmd === 'macro_load')).toEqual([]);

    await load.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => mockController.commands
      .filter(command => command.cmd === 'macro_load')
      .map(command => command.args[0])).toEqual(['e2e-macro-1']);

    const run = root.getByRole('button', { name: 'Run macro: Fixture Macro', exact: true });
    await expect(run).toBeEnabled();
    await run.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Run Macro', { exact: true })).toBeVisible();
    await expect(dialog.locator('textarea')).toHaveValue('G0 X0 Y0');
    await expect(dialog.locator('textarea')).toHaveAttribute('readonly', '');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await run.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => mockController.commands
      .filter(command => command.cmd === 'macro_run')
      .map(command => command.args[0])).toEqual(['e2e-macro-1']);
  });
});

test.describe('autolevel probe confirmations', () => {
  test('test, start and stop confirmations gate commands behind the safety checkbox', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const root = widget(page, 'autolevel');
    await root.getByRole('button', { name: 'Start New Probe', exact: true }).click();
    await expect(root).toContainText('PROBE NEW SURFACE');
    const testProbe = root.getByRole('button', { name: 'Test Probe', exact: true });
    const startProbe = root.getByRole('button', { name: 'Start Probing', exact: true });
    await expect(testProbe).toBeEnabled();
    await expect(startProbe).toBeEnabled();

    const confirmations = () => mockController.commands
      .filter(command => ['autolevel:start', 'autolevel:stop'].includes(command.cmd));

    await testProbe.click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Test Probe', { exact: true })).toBeVisible();
    await expect(dialog).toContainText('A single probe test will be performed at the current XY position.');
    const testConfirm = dialog.getByRole('button', { name: 'Start Test Probe', exact: true });
    await expect(testConfirm).toBeDisabled();
    await setChecked(
      dialog.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }),
      true,
    );
    await expect(testConfirm).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(confirmations()).toEqual([]);

    await testProbe.click();
    dialog = page.getByRole('dialog');
    await setChecked(
      dialog.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }),
      true,
    );
    await dialog.getByRole('button', { name: 'Start Test Probe', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => confirmations().map(command => command.cmd)).toEqual(['autolevel:start']);
    expect(confirmations()[0].args[0]).toMatchObject({ mode: 'test' });

    await startProbe.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Start Probing', { exact: true }).first()).toBeVisible();
    await expect(dialog).toContainText('You are about to probe your workpiece surface.');
    await expect(dialog).toContainText('points');
    const startConfirm = dialog.getByRole('button', { name: 'Start Probing', exact: true });
    await expect(startConfirm).toBeDisabled();
    await setChecked(
      dialog.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }),
      true,
    );
    await expect(startConfirm).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(confirmations().map(command => command.cmd)).toEqual(['autolevel:start']);

    await startProbe.click();
    dialog = page.getByRole('dialog');
    await setChecked(
      dialog.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }),
      true,
    );
    await dialog.getByRole('button', { name: 'Start Probing', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const stopProbe = root.getByRole('button', { name: 'Stop Probing', exact: true });
    await expect(stopProbe).toBeVisible();
    await expect.poll(() => confirmations().map(command => command.cmd)).toEqual([
      'autolevel:start',
      'autolevel:start',
    ]);
    expect(confirmations()[1].args[0]).toMatchObject({ mode: 'full' });

    await stopProbe.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Stop Probing', { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText('Are you sure you want to stop probing?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue Probing', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(stopProbe).toBeVisible();
    expect(confirmations().map(command => command.cmd)).toEqual(['autolevel:start', 'autolevel:start']);

    await stopProbe.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Stop Probing', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(root.getByRole('button', { name: 'Start Probing', exact: true })).toBeVisible();
    await expect.poll(() => confirmations().map(command => command.cmd)).toEqual([
      'autolevel:start',
      'autolevel:start',
      'autolevel:stop',
    ]);
  });
});

test.describe('probe modal', () => {
  test('probe dialog switches setter modes and submits generated G-code', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const root = widget(page, 'probe');
    const openProbe = async () => {
      const trigger = root.getByRole('button', { name: 'Probe Axis Z', exact: true });
      await expect(trigger).toBeEnabled();
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Probe', { exact: true })).toBeVisible();
      return dialog;
    };

    let dialog = await openProbe();
    const tlo = dialog.getByRole('button', { name: 'Tool Length Offset', exact: true });
    const wcs = dialog.getByRole('button', { name: 'Work Coordinate System', exact: true });
    await expect(wcs).toHaveAttribute('data-selected', '');
    await expect(dialog).toContainText('G38.2');
    await expect(dialog).toContainText('G10 L20 P1');
    await tlo.click();
    await expect(tlo).toHaveAttribute('data-selected', '');
    await expect(dialog).toContainText('G49');
    await expect(dialog).toContainText('G43.1');
    await expect.poll(async () => (await readConfig(page)).probe?.useTLO).toBe(true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(mockController.commands.filter(command => command.cmd === 'gcode')).toEqual([]);

    dialog = await openProbe();
    await expect(dialog.getByRole('button', { name: 'Tool Length Offset', exact: true })).toHaveAttribute('data-selected', '');
    await dialog.getByRole('button', { name: 'Run Probe', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => mockController.commands.some(command => (
      command.cmd === 'gcode' && String(command.args[0]).includes('G43.1')
    ))).toBe(true);
  });
});

test.describe('visualizer watch directory', () => {
  test('watch directory lists, traverses, loads and uploads through mocked APIs', async ({ page, mockController }) => {
    const directoryRequests = [];
    const uploads = [];
    await page.route('**/api/watch/files', async route => {
      const body = route.request().postDataJSON() ?? {};
      const path = body.path ?? '';
      directoryRequests.push(path);
      const files = path === 'sub'
        ? [{ name: 'nested.nc', type: 'f', size: 2048, mtime: Date.UTC(2026, 0, 2) }]
        : [
          { name: 'e2e-watch.nc', type: 'f', size: 1024, mtime: Date.UTC(2026, 0, 1) },
          { name: 'sub', type: 'd', size: 0, mtime: Date.UTC(2026, 0, 1) },
        ];
      await route.fulfill({ json: { path, files } });
    });
    await page.route('**/api/watch/file', async route => {
      uploads.push(route.request().postDataJSON());
      await route.fulfill({ json: { file: 'uploaded.nc' } });
    });
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const visualizer = widget(page, 'visualizer');
    const gcode = widget(page, 'gcode');
    const openWatchDirectory = async () => {
      await visualizer.getByRole('button', { name: 'Upload G-code options', exact: true }).click();
      await waitForMenuReady(page);
      await page.getByRole('menuitem', { name: 'Browse...', exact: true }).click();
      await expect(page.getByRole('menu')).toHaveCount(0);
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Watch Directory', { exact: true })).toBeVisible();
      return dialog;
    };

    let dialog = await openWatchDirectory();
    await expect(dialog.getByRole('tree', { name: 'Watch directory files' })).toBeVisible();
    await expect(dialog.getByText('e2e-watch.nc', { exact: true })).toBeVisible();
    await expect(dialog.getByText('sub', { exact: true })).toBeVisible();
    const load = dialog.getByRole('button', { name: 'Load G-code', exact: true });
    await expect(load).toBeDisabled();
    await dialog.locator('[data-node-id="e2e-watch.nc"]').click();
    await expect(load).toBeEnabled();
    await load.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => mockController.commands
      .filter(command => command.cmd === 'watchdir_load')
      .map(command => command.args[0])).toEqual(['e2e-watch.nc']);
    await expect(gcode).toContainText('e2e-watch.nc');
    await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();

    dialog = await openWatchDirectory();
    await expect(dialog.getByRole('button', { name: 'Load G-code', exact: true })).toBeDisabled();
    await dialog.locator('[data-node-id="sub"] [role="button"]').click();
    await expect(dialog.getByText('nested.nc', { exact: true })).toBeVisible();
    expect(directoryRequests).toContain('sub');
    await dialog.getByText('nested.nc', { exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Load G-code', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    dialog = await openWatchDirectory();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'uploaded.nc',
      mimeType: 'text/plain',
      buffer: Buffer.from('G0 X1 Y1\n'),
    });
    await expect.poll(() => uploads.map(upload => upload.file)).toEqual(['uploaded.nc']);
    expect(uploads[0].data).toBe('G0 X1 Y1\n');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('visualizer workflow notification', () => {
  test('M6 notification opens the tool change resume confirmation', async ({ page, mockController }) => {
    await openWorkspace(page);
    await mockController.ready();
    mockController.connect();

    const visualizer = widget(page, 'visualizer');
    const run = visualizer.getByRole('button', { name: 'Run', exact: true });
    await visualizer.locator('input[type="file"]').setInputFiles({
      name: 'e2e-tool-change.nc',
      mimeType: 'text/plain',
      buffer: Buffer.from(TOOL_CHANGE_GCODE),
    });
    await expect(run).toBeEnabled();

    mockController.emit('workflow:state', 'paused');
    mockController.emit('sender:status', {
      loaded: true,
      hold: true,
      holdReason: { data: 'M6', msg: 'M6 T1' },
      name: 'e2e-tool-change.nc',
      size: TOOL_CHANGE_GCODE.length,
      total: 4,
      sent: 3,
      received: 2,
      startTime: 0,
      finishTime: 0,
      elapsedTime: 0,
      remainingTime: 0,
    });
    await expect(visualizer.getByText('M6 Tool Change', { exact: true })).toBeVisible();
    await expect(run).toBeEnabled();

    await run.click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Tool Change', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Are you sure you want to resume program execution?', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'No', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(mockController.commands.filter(command => command.cmd === 'sender_resume')).toEqual([]);

    await run.click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => mockController.commands
      .filter(command => command.cmd === 'sender_resume')).toHaveLength(1);

    await visualizer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(visualizer.getByText('M6 Tool Change', { exact: true })).toHaveCount(0);
  });
});

test.describe('visualizer WebGL error', () => {
  test('missing WebGL shows a dismissible error modal instead of a renderer', async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (typeof type === 'string' && type.includes('webgl')) {
          return null;
        }
        return getContext.call(this, type, ...args);
      };
    });
    await openWorkspace(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('WebGL Error Message', { exact: true })).toBeVisible();
    await expect(dialog).toContainText('WebGL');
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await readConfig(page)).visualizer?.disabled).toBe(true);
  });
});
