/* Sequential menu interactions must finish before the next selection. */
/* eslint-disable no-await-in-loop */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test as base, expect, widget } from '../support/simulator.mjs';
import { openWorkspace } from '../support/fixtures.mjs';
import { capture } from '../support/screenshots.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

const SERIAL_PORTS = [
  { path: '/dev/tty.e2e-alpha', manufacturer: 'E2E Serial Alpha', connected: false },
  { path: '/dev/tty.e2e-beta', manufacturer: '', connected: true },
];
const SERIAL_BAUD_RATES = [9600, 19200, 115200];

const TOOL_POLICY_LABELS = [
  'Ignore M6 commands (Default)',
  'Send M6 commands',
  'Manual Tool Change (WCS)',
  'Manual Tool Change (TLO)',
  'Manual Tool Change (Custom Probing)',
];

const MACHINE_PROFILES = [
  {
    id: 'profile-a',
    name: 'E2E Mill A',
    limits: { xmin: -100, xmax: 100, ymin: -100, ymax: 100, zmin: -50, zmax: 50 },
  },
  {
    id: 'profile-b',
    name: 'E2E Mill B',
    limits: { xmin: -200, xmax: 200, ymin: -150, ymax: 150, zmin: -80, zmax: 80 },
  },
];

const CONTROLLER_SNAPSHOTS = {
  Grbl: {
    settings: { $13: 0, $100: 250, $101: 250, $102: 250 },
    state: {
      status: {
        machineState: 'Idle',
        mpos: { x: 0, y: 0, z: 0 },
        wpos: { x: 0, y: 0, z: 0 },
      },
      parserstate: {
        modal: { motion: 'G0', wcs: 'G54', plane: 'G17', units: 'G21', distance: 'G90' },
      },
    },
  },
  Marlin: {
    settings: { baudrate: 115200 },
    state: {
      extruder: { deg: 20, degTarget: 200, power: 64 },
      heatedBed: { deg: 25, degTarget: 60, power: 32 },
      feedrate: 1200,
      spindle: 8000,
      ovF: 100,
      ovS: 100,
      modal: { units: 'G21' },
      pos: { x: 0, y: 0, z: 0 },
    },
  },
  Smoothie: {
    settings: { version: 'edge' },
    state: {
      parserstate: { feedrate: 1200, spindle: 8000, tool: 1, modal: { units: 'G21' } },
      status: {
        machineState: 'Idle',
        ovF: 100,
        ovS: 100,
        mpos: { x: 0, y: 0, z: 0 },
        wpos: { x: 0, y: 0, z: 0 },
      },
    },
  },
  TinyG: {
    settings: { fv: 0.99, mfo: 1, sso: 1, mto: 1 },
    state: {
      feedrate: 1200,
      velocity: 500,
      line: 4,
      machineState: 1,
      modal: { units: 'G21', distance: 'G90' },
      pwr: { 1: 0.5 },
      qr: 28,
    },
  },
};

const MORE_MENU_WIDGET_IDS = [
  'connection',
  'console',
  'custom',
  'gcode',
  'macro',
  'autolevel',
  'probe',
  'tool',
  'spindle',
  'laser',
  'webcam',
  'axes',
  'grbl',
  'marlin',
  'smoothie',
  'tinyg',
];

const readState = page => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('cnc') || '{}');
  return raw.state || {};
});

const selectedConsoleText = root => root.locator('.xterm-helper-textarea').evaluate(element => {
  const clipboardData = new DataTransfer();
  element.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData }));
  return clipboardData.getData('text/plain');
});

// Tonic focuses the menu container in a requestAnimationFrame after it opens and
// wraps its content in a Collapse that clips while entering. Interacting before
// both settle makes keyboard input miss the menu and pointerup land on a
// different element than pointerdown.
const waitForMenuReady = async page => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const openMore = async (page, id) => {
  await widget(page, id)
    .getByRole('button', { name: /^More( options)?$/ })
    .click();
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

const closeMenu = async page => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
};

// Tonic Dropdowns close on blur only when focus moves to another element, so
// dismissal must target a focusable control outside the menu.
const clickOutsideMenu = async page => {
  await widget(page, 'visualizer').getByRole('button', { name: 'Top View', exact: true }).click();
};

const waitForListboxReady = async page => {
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  await expect(listbox.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
  return listbox;
};

const openPortListbox = async portInput => {
  await portInput.click();
  return waitForListboxReady(portInput.page());
};

/**
 * Local read-only Socket.IO snapshot that advertises serial ports and baud
 * rates without touching a controller, serial device, or the application
 * server. It mirrors the existing controller snapshot fixtures and never opens
 * a real connection unless a scenario asks for one.
 */
const test = base.extend({
  serialEndpoints: async ({ page, context, baseURL, socketGuard }, use, testInfo) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
      throw new Error('Widget menu scenarios require a local CNCjs application.');
    }
    const server = createServer();
    const io = socketIO(server, { transports: ['polling'], allowUpgrades: false });
    const requests = { ports: 0, baudRates: 0 };
    const writes = [];
    let client;

    io.on('connection', socket => {
      client = socket;
      socket.emit('startup', { availableControllers: ['Grbl', 'Marlin', 'Smoothie', 'TinyG'] });
      socket.on('getPorts', callback => {
        requests.ports += 1;
        callback?.(null, SERIAL_PORTS);
      });
      socket.on('getBaudRates', callback => {
        requests.baudRates += 1;
        callback?.(null, SERIAL_BAUD_RATES);
      });
      socket.on('write', (ident, data) => {
        writes.push({ event: 'write', ident, data });
      });
      socket.on('writeln', (ident, data) => {
        writes.push({ event: 'writeln', ident, data });
      });
      socket.on('command', (ident, command, ...args) => {
        writes.push({ event: 'command', ident, command, args });
      });
    });

    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });
    socketGuard.usePollingProxy(server);

    try {
      await use({
        ports: SERIAL_PORTS,
        baudRates: SERIAL_BAUD_RATES,
        requests,
        writes,
        ready: () => expect.poll(() => Boolean(client)).toBe(true),
        output: data => client.emit('connection:read', {}, data),
        connect: () => {
          client.emit('connection:open', {
            type: 'serial',
            ident: 'e2e-serial-endpoints',
            options: { path: SERIAL_PORTS[0].path, baudRate: 115200 },
          });
          client.emit('controller:settings', 'Grbl', CONTROLLER_SNAPSHOTS.Grbl.settings);
          client.emit('controller:state', 'Grbl', CONTROLLER_SNAPSHOTS.Grbl.state);
          client.emit('workflow:state', 'idle');
        },
        connectAs: type => {
          const snapshot = CONTROLLER_SNAPSHOTS[type];
          client.emit('connection:open', {
            type: 'serial',
            ident: `e2e-${type.toLowerCase()}`,
            options: { path: SERIAL_PORTS[0].path, baudRate: 115200 },
          });
          client.emit('controller:settings', type, snapshot.settings);
          client.emit('controller:state', type, snapshot.state);
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

const prepareConsole = async (page, serialEndpoints) => {
  await openWorkspace(page);
  await serialEndpoints.ready();
  serialEndpoints.connect();
  const root = widget(page, 'console');
  await expect(root.locator('.xterm')).toBeVisible();
  await root.locator('.xterm-helper-textarea').focus();
  serialEndpoints.output('e2e-console-ready');
  await openMore(page, 'console');
  await clickMenuItem(page, 'Select All');
  await expect.poll(() => selectedConsoleText(root)).toContain('e2e-console-ready');
  await openMore(page, 'console');
  await clickMenuItem(page, 'Clear Selection');
  await root.locator('.xterm-helper-textarea').focus();
  await page.keyboard.type('g0 x0');
  await expect(root.locator('.xterm-screen canvas').first()).toBeVisible();
  return root;
};

test.describe('connection selectors', () => {
  test('serial port and baud rate dropdowns select, dismiss and refresh without opening a port', async ({ page, serialEndpoints }) => {
    await openWorkspace(page);
    await serialEndpoints.ready();
    const root = widget(page, 'connection');
    const portInput = root.getByRole('combobox', { name: 'Serial port', exact: true });
    const open = root.getByRole('button', { name: 'Open', exact: true });

    // Refetch once so the selectors do not depend on the initial query racing
    // the socket connection.
    await root.getByRole('button', { name: 'Refresh', exact: true }).first().click();
    await root.getByRole('button', { name: 'Refresh', exact: true }).last().click();

    await expect(portInput).toBeEnabled();
    await expect(portInput).toHaveValue('');
    await expect(open).toBeDisabled();

    let listbox = await openPortListbox(portInput);
    await expect(listbox.getByRole('option')).toHaveCount(2);
    await expect(listbox.getByRole('option').first()).toContainText('/dev/tty.e2e-alpha');
    await expect(listbox.getByRole('option').first()).toContainText('Manufacturer: E2E Serial Alpha');
    await expect(listbox.getByRole('option').last()).toContainText('/dev/tty.e2e-beta');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(portInput).toHaveValue('');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.serial.path).toBe('');

    listbox = await openPortListbox(portInput);
    await clickOutsideMenu(page);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(portInput).toHaveValue('');

    listbox = await openPortListbox(portInput);
    await listbox.getByRole('option').filter({ hasText: '/dev/tty.e2e-alpha' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(portInput).toHaveValue('/dev/tty.e2e-alpha');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.serial.path)
      .toBe('/dev/tty.e2e-alpha');

    await portInput.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(portInput).toHaveValue('/dev/tty.e2e-beta');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.serial.path)
      .toBe('/dev/tty.e2e-beta');
    await expect(open).toBeEnabled();

    const baud = root.getByRole('button', { name: 'Baud rate', exact: true });
    await expect(baud).toHaveText('115200');

    await baud.click();
    await waitForMenuReady(page);
    expect(await menuItemTexts(page)).toEqual(['9600', '19200', '115200']);
    await clickMenuItem(page, '19200');
    await expect(baud).toHaveText('19200');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.serial.baudRate).toBe(19200);

    await baud.click();
    await waitForMenuReady(page);
    await closeMenu(page);
    await expect(baud).toHaveText('19200');

    await baud.click();
    await waitForMenuReady(page);
    await clickOutsideMenu(page);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(baud).toHaveText('19200');

    const before = { ...serialEndpoints.requests };
    await root.getByRole('button', { name: 'Refresh', exact: true }).first().click();
    await expect.poll(() => serialEndpoints.requests.ports).toBeGreaterThan(before.ports);
    await root.getByRole('button', { name: 'Refresh', exact: true }).last().click();
    await expect.poll(() => serialEndpoints.requests.baudRates).toBeGreaterThan(before.baudRates);
  });

  test('controller and transport controls persist and lock while connected', async ({ page, serialEndpoints }) => {
    await openWorkspace(page);
    await serialEndpoints.ready();
    const root = widget(page, 'connection');

    for (const name of ['Grbl', 'Marlin', 'Smoothie', 'TinyG']) {
      await expect(root.getByRole('button', { name, exact: true })).toBeVisible();
    }

    const smoothie = root.getByRole('button', { name: 'Smoothie', exact: true });
    await smoothie.click();
    await expect(smoothie).toHaveAttribute('data-selected', '');
    await expect.poll(async () => (await readState(page)).widgets.connection.controller.type).toBe('Smoothie');

    const tinyg = root.getByRole('button', { name: 'TinyG', exact: true });
    await tinyg.focus();
    await page.keyboard.press('Enter');
    await expect(tinyg).toHaveAttribute('data-selected', '');
    await expect.poll(async () => (await readState(page)).widgets.connection.controller.type).toBe('TinyG');

    await root.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
    await expect(root.getByLabel('Host')).toBeVisible();
    const port = root.getByRole('spinbutton', { name: 'Port', exact: true });
    await expect(port).toHaveValue('23');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.type).toBe('socket');

    await port.fill('8023');
    await expect.poll(async () => (await readState(page)).widgets.connection.connection.socket.port).toBe(8023);
    await root.getByLabel('Host').fill('127.0.0.1');
    await expect(root.getByRole('button', { name: 'Open', exact: true })).toBeEnabled();

    await root.getByRole('button', { name: 'Serial Port', exact: true }).click();
    await expect(root.getByRole('combobox', { name: 'Serial port', exact: true })).toBeVisible();

    serialEndpoints.connect();
    await expect(root.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
    await expect(root.getByRole('button', { name: 'Open', exact: true })).toHaveCount(0);
    await expect(root.getByRole('combobox', { name: 'Serial port', exact: true })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Baud rate', exact: true })).toBeDisabled();
    for (const name of ['Grbl', 'Marlin', 'Smoothie', 'TinyG']) {
      await expect(root.getByRole('button', { name, exact: true })).toBeDisabled();
    }
    await expect(root.getByRole('button', { name: 'Serial Port', exact: true })).toBeDisabled();
    await expect(root.getByRole('button', { name: 'Wi-Fi', exact: true })).toBeDisabled();
    await expect(root.getByRole('checkbox').last()).toBeDisabled();
  });
});

test.describe('console menu actions', () => {
  test('select all, copy selection, clear selection and refresh act on terminal content', async ({ page, serialEndpoints }, testInfo) => {
    const root = await prepareConsole(page, serialEndpoints);
    const selectionText = () => selectedConsoleText(root);
    const writesBefore = serialEndpoints.writes.length;

    await openMore(page, 'console');
    const selectItem = page.getByRole('menuitem', { name: 'Select All', exact: true });
    expect(await selectItem.locator('svg').evaluate(element => getComputedStyle(element).color))
      .toBe(await selectItem.evaluate(element => getComputedStyle(element).color));
    await capture(page.getByRole('menu'), testInfo, 'english-console-semantic-select-all-menu');
    await clickMenuItem(page, 'Select All');
    await expect.poll(selectionText).toContain('g0 x0');

    await openMore(page, 'console');
    await clickMenuItem(page, 'Clear Selection');
    await expect.poll(selectionText).toBe('');

    await page.evaluate(() => {
      window.__e2eCopyCalls = 0;
      document.execCommand = command => {
        if (command === 'copy') {
          window.__e2eCopyCalls += 1;
          return true;
        }
        return false;
      };
    });

    await openMore(page, 'console');
    await clickMenuItem(page, 'Select All');
    await expect.poll(selectionText).toContain('g0 x0');
    await openMore(page, 'console');
    await clickMenuItem(page, 'Copy Selection');
    await expect.poll(() => page.evaluate(() => window.__e2eCopyCalls)).toBe(1);
    await expect.poll(selectionText).toContain('g0 x0');

    await openMore(page, 'console');
    await clickMenuItem(page, 'Refresh');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(root.locator('.xterm-screen canvas').first()).toBeVisible();
    expect(serialEndpoints.writes.length).toBe(writesBefore);
  });

  test('keyboard activation applies the focused menu action', async ({ page, serialEndpoints }) => {
    const root = await prepareConsole(page, serialEndpoints);

    await openMore(page, 'console');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => document.activeElement?.textContent?.trim() || '')).toBe('Console Settings');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => document.activeElement?.textContent?.trim() || '')).toBe('Refresh');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => document.activeElement?.textContent?.trim() || '')).toBe('Select All');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect.poll(() => selectedConsoleText(root)).toContain('g0 x0');
  });
});

test.describe('probe selectors', () => {
  test('axis and command buttons persist every selection and keep the action gated', async ({ page }) => {
    await openWorkspace(page);
    const root = widget(page, 'probe');
    const probeAxis = root.getByRole('button', { name: 'Probe Axis Z', exact: true });
    await expect(probeAxis).toBeDisabled();

    for (const axis of ['X', 'Y', 'Z']) {
      await root.getByTitle(`Probe ${axis} axis`).click();
      await expect(root.getByText(`Probe Axis ${axis}`).first()).toBeVisible();
      await expect(root.getByTitle(`Probe ${axis} axis`)).toHaveAttribute('data-selected', '');
      await expect.poll(async () => (await readState(page)).widgets.probe.probeAxis).toBe(axis);
    }

    await expect(root.getByRole('button', { name: 'Probe Axis Z', exact: true })).toBeDisabled();

    for (const command of ['G38.3', 'G38.4', 'G38.5', 'G38.2']) {
      await root.getByRole('button', { name: command, exact: true }).click();
      await expect(root.getByText(`Probe Command: ${command}`)).toBeVisible();
      await expect(root.getByRole('button', { name: command, exact: true })).toHaveAttribute('data-selected', '');
      await expect.poll(async () => (await readState(page)).widgets.probe.probeCommand).toBe(command);
    }

    await root.getByRole('button', { name: 'G38.3', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(root.getByText('Probe Command: G38.3')).toBeVisible();
    await expect.poll(async () => (await readState(page)).widgets.probe.probeCommand).toBe('G38.3');

    await root.locator('.fa-layers').hover();
    await expect(page.getByRole('tooltip')).toContainText('G38.3 probe toward workpiece, stop on contact');
  });
});

test.describe('tool change policy', () => {
  test('connected probe command preview has a visible boundary and scrolls without moving the panel', async ({ page, serialEndpoints }) => {
    await page.route('**/api/tool*', route => route.fulfill({ json: {
      toolChangePolicy: 2,
      toolChangeX: 0,
      toolChangeY: 0,
      toolChangeZ: 0,
      toolProbeX: 0,
      toolProbeY: 0,
      toolProbeZ: 0,
      toolProbeCommand: 'G38.2',
      toolProbeDistance: 1,
      toolProbeFeedrate: 10,
      touchPlateHeight: 0,
    } }));
    await openWorkspace(page);
    await serialEndpoints.ready();
    serialEndpoints.connectAs('Grbl');
    const root = widget(page, 'tool');
    const preview = root.locator('pre');
    const dropdownHeight = (await root.getByRole('button', { name: 'Tool Change Policy', exact: true }).boundingBox()).height;
    for (const prefix of ['Tool Change', 'Tool Probe']) {
      for (const axis of ['X', 'Y', 'Z']) {
        const input = root.getByLabel(`${prefix} ${axis}`, { exact: true });
        const height = (await input.boundingBox()).height;
        expect(Math.abs(height - dropdownHeight)).toBeLessThanOrEqual(1);
      }
    }
    await expect(preview).toContainText('G91');
    const bounds = await preview.evaluate(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        border: style.borderTopWidth,
        borderStyle: style.borderTopStyle,
        borderColor: style.borderTopColor,
        background: style.backgroundColor,
        padding: parseFloat(style.paddingLeft),
        width: rect.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    });
    expect(bounds.border).toBe('1px');
    expect(bounds.borderStyle).toBe('solid');
    expect(bounds.borderColor).not.toBe(bounds.background);
    expect(bounds.padding).toBeGreaterThanOrEqual(12);
    expect(bounds.scrollWidth).toBeGreaterThan(bounds.clientWidth);
    await preview.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect.poll(() => preview.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    expect((await preview.boundingBox()).width).toBe(bounds.width);
    await expect(root.getByRole('button', { name: 'Copy tool probe commands' })).toBeEnabled();
  });

  test('every policy applies its form state, saves through the mocked endpoint and dismisses', async ({ page }) => {
    let toolConfig = {
      toolChangePolicy: 0,
      toolChangeX: 0,
      toolChangeY: 0,
      toolChangeZ: 0,
      toolProbeX: 0,
      toolProbeY: 0,
      toolProbeZ: 0,
      toolProbeCustomCommands: '',
      toolProbeCommand: 'G38.2',
      toolProbeDistance: 1,
      toolProbeFeedrate: 10,
      touchPlateHeight: 0,
    };
    const writes = [];
    await page.route('**/api/tool*', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ json: toolConfig });
      }
      const body = route.request().postDataJSON();
      writes.push(body);
      toolConfig = { ...toolConfig, ...body };
      return route.fulfill({ json: toolConfig });
    });

    await openWorkspace(page);
    const root = widget(page, 'tool');
    const policyButton = root.getByRole('button', { name: 'Tool Change Policy', exact: true });
    await expect(policyButton).toHaveText('Ignore M6 commands (Default)');

    const selectPolicy = async (label, value) => {
      await policyButton.click();
      await waitForMenuReady(page);
      expect(await menuItemTexts(page)).toEqual(TOOL_POLICY_LABELS);
      await clickMenuItem(page, label);
      await expect(policyButton).toHaveText(label);
      await expect.poll(() => writes.at(-1)?.toolChangePolicy).toBe(value);
    };

    await selectPolicy('Send M6 commands', 1);
    await expect(root).toContainText('This will send the line exactly as it is to the controller.');

    await selectPolicy('Manual Tool Change (WCS)', 2);
    await expect(root.getByLabel('Tool Change X')).toBeVisible();
    await expect(root.getByLabel('Tool Probe Z')).toBeVisible();
    await expect(root.getByRole('button', { name: 'Use machine X position', exact: true })).toBeDisabled();

    await selectPolicy('Manual Tool Change (TLO)', 3);
    await expect(root.getByLabel('Tool Change X')).toBeVisible();
    await expect(root.getByRole('button', { name: 'Edit custom tool probe commands', exact: true })).toHaveCount(0);

    await selectPolicy('Manual Tool Change (Custom Probing)', 4);
    await expect(root).toContainText('Warning: No custom tool probe commands are defined');
    await expect(root.getByRole('button', { name: 'Edit custom tool probe commands', exact: true })).toBeVisible();

    await policyButton.click();
    await waitForMenuReady(page);
    await closeMenu(page);
    await expect(policyButton).toHaveText('Manual Tool Change (Custom Probing)');

    await policyButton.click();
    await waitForMenuReady(page);
    await clickOutsideMenu(page);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(policyButton).toHaveText('Manual Tool Change (Custom Probing)');

    await selectPolicy('Ignore M6 commands (Default)', 0);
    await expect(root).toContainText('This option skips the M6 command and pauses controller operations');
    await expect(root.getByLabel('Tool Change X')).toHaveCount(0);
  });
});

test.describe('visualizer menus', () => {
  test('machine profile dropdown selects, clears and dismisses without changing the layout', async ({ page }) => {
    await page.route('**/api/machines*', route => {
      if (route.request().method() !== 'GET') {
        return route.abort();
      }
      return route.fulfill({ json: { records: MACHINE_PROFILES } });
    });

    await openWorkspace(page);
    const visualizer = widget(page, 'visualizer');
    const trigger = visualizer.getByRole('button', { name: 'Select machine profile', exact: true });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveText('No machine profile selected');

    await trigger.click();
    await waitForMenuReady(page);
    await expect(page.getByRole('menu')).toContainText('Machine Profiles');
    expect(await menuItemTexts(page)).toEqual(['None', 'E2E Mill A', 'E2E Mill B']);

    await clickMenuItem(page, 'E2E Mill A');
    await expect(trigger).toHaveText('E2E Mill A');
    await expect.poll(async () => (await readState(page)).workspace.machineProfile?.id).toBe('profile-a');
    await expect.poll(async () => (await readState(page)).workspace.machineProfile?.name).toBe('E2E Mill A');

    await trigger.click();
    await waitForMenuReady(page);
    await closeMenu(page);
    await expect(trigger).toHaveText('E2E Mill A');

    await trigger.click();
    await waitForMenuReady(page);
    await clickOutsideMenu(page);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toHaveText('E2E Mill A');

    await trigger.click();
    await waitForMenuReady(page);
    await clickMenuItem(page, 'None');
    await expect(trigger).toHaveText('No machine profile selected');
    await expect.poll(async () => (await readState(page)).workspace.machineProfile?.id ?? null).toBeNull();

    const cameraMode = visualizer.getByRole('button', { name: 'Camera mode: Pan', exact: true });
    await cameraMode.click();
    await waitForMenuReady(page);
    await closeMenu(page);
    await expect(cameraMode).toBeVisible();
  });

  test('display filename option toggles the overlay and the upload split menu lists the watch directory entry', async ({ page, simulator }) => {
    const visualizer = widget(page, 'visualizer');
    const motionCommands = () => simulator.commands.filter(line => / CMD: (?:G|M|\$H)/.test(line));
    const commandsBefore = motionCommands();
    await visualizer.locator('input[type="file"]').setInputFiles({
      name: 'e2e-menu-toolpath.nc',
      mimeType: 'text/plain',
      buffer: Buffer.from('G21\nG90\nG1 X10 Y5 F600\n'),
    });
    await expect(widget(page, 'gcode')).toContainText('e2e-menu-toolpath.nc');
    const filename = visualizer.getByText('e2e-menu-toolpath.nc', { exact: true }).filter({ visible: true });
    await expect(filename).toHaveCount(1);

    const options = visualizer.getByRole('button', { name: '3D View options', exact: true });
    await options.click();
    await waitForMenuReady(page);
    expect(await menuItemTexts(page)).toEqual([
      'Perspective Projection',
      'Orthographic Projection',
      'Display G-code Filename',
      'Hide Limits',
      'Hide Coordinate System',
      'Hide Grid Line Numbers',
      'Hide Cutting Tool',
    ]);
    await page.getByRole('menuitem', { name: 'Display G-code Filename', exact: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(filename).toHaveCount(0);
    await expect.poll(async () => (await readState(page)).widgets.visualizer.gcode.displayName).toBe(false);

    await page.getByRole('menuitem', { name: 'Display G-code Filename', exact: true }).click();
    await expect(filename).toBeVisible();
    await expect.poll(async () => (await readState(page)).widgets.visualizer.gcode.displayName).toBe(true);
    await closeMenu(page);

    const uploadOptions = visualizer.getByRole('button', { name: 'Upload G-code options', exact: true });
    await uploadOptions.click();
    await waitForMenuReady(page);
    await expect(page.getByRole('menu')).toContainText('Watch Directory');
    expect(await menuItemTexts(page)).toEqual(['Browse...']);
    await closeMenu(page);
    await expect(visualizer.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();

    const wcs = visualizer.getByRole('button', { name: 'G54 (P1)', exact: true });
    await wcs.click();
    await waitForMenuReady(page);
    await closeMenu(page);
    await expect(wcs).toBeVisible();
    expect(motionCommands()).toEqual(commandsBefore);
  });
});

const SNAPSHOT_COMMAND_MENUS = {
  Marlin: {
    widgetId: 'marlin',
    trigger: 'Marlin commands',
    items: [
      { label: 'Get Extruder Temperature (M105)', writes: ['writeln:M105'] },
      { label: 'Get Current Position (M114)', writes: ['writeln:M114'] },
      { label: 'Get Firmware Version and Capabilities (M115)', writes: ['writeln:M115'] },
    ],
  },
  Smoothie: {
    widgetId: 'smoothie',
    trigger: 'Smoothie commands',
    items: [
      { label: 'Status Report (?)', writes: ['write:?'] },
      { label: 'Homing ($H)', writes: ['command:homing'] },
      { label: 'Kill Alarm Lock ($X)', writes: ['command:unlock'] },
      { label: 'Help', writes: ['writeln:help'] },
      { label: 'View G-code Parameters ($#)', writes: ['writeln:$#'] },
      { label: 'View G-code Parser State ($G)', writes: ['writeln:$G'] },
    ],
  },
  TinyG: {
    widgetId: 'tinyg',
    trigger: 'TinyG commands',
    items: [
      { label: 'Status Report (?)', writes: ['writeln:?'] },
      { label: 'Queue Flush (%)', writes: ['writeln:!%', 'writeln:{"qr":""}'] },
      { label: 'Kill Job (^d)', writes: ['write:\x04'] },
      { label: 'Clear Alarm ($clear)', writes: ['command:unlock'] },
      { label: 'Help', writes: ['writeln:h'] },
      { label: 'Show System Settings', writes: ['writeln:$sys'] },
      { label: 'Show All Settings', writes: ['writeln:$$'] },
      { label: 'List Self Tests', writes: ['writeln:$test'] },
      { label: 'Restore Defaults', writes: ['writeln:$defa=1'] },
    ],
  },
};

const writeSummary = write => (
  write.event === 'command' ? `command:${write.command}` : `${write.event}:${write.data}`
);

test.describe('controller commands menus', () => {
  test('grbl commands menu dispatches every action to the isolated simulator', async ({ page, simulator }) => {
    const trigger = widget(page, 'grbl').getByRole('button', { name: 'Grbl commands', exact: true });
    await expect(trigger).toBeVisible();
    const items = [
      { label: 'Status Report (?)', expected: 'RT: ?' },
      { label: 'Check G-code Mode ($C)', expected: 'CMD: $C ->' },
      { label: 'Homing ($H)', expected: 'CMD: $H ->' },
      { label: 'Kill Alarm Lock ($X)', expected: 'CMD: $X ->' },
      { label: 'Sleep ($SLP)', expected: 'CMD: $SLP ->' },
      { label: 'Help ($)', expected: 'CMD: $ ->' },
      { label: 'Settings ($$)', expected: 'CMD: $$ ->' },
      { label: 'View G-code Parameters ($#)', expected: 'CMD: $# ->' },
      { label: 'View G-code Parser State ($G)', expected: 'CMD: $G ->' },
      { label: 'View Build Info ($I)', expected: 'CMD: $I ->' },
      { label: 'View Startup Blocks ($N)', expected: 'CMD: $N ->' },
    ];

    await trigger.click();
    await waitForMenuReady(page);
    expect(await menuItemTexts(page)).toEqual(items.map(item => item.label));
    await closeMenu(page);

    for (const item of items) {
      await trigger.click();
      await waitForMenuReady(page);
      await clickMenuItem(page, item.label);
      await expect.poll(() => simulator.commands.some(line => line.includes(item.expected))).toBe(true);
    }
  });

  for (const [type, menu] of Object.entries(SNAPSHOT_COMMAND_MENUS)) {
    test(`${type} commands menu dispatches each action through the read-only snapshot`, async ({ page, serialEndpoints }) => {
      await openWorkspace(page);
      await serialEndpoints.ready();
      serialEndpoints.connectAs(type);
      const trigger = widget(page, menu.widgetId).getByRole('button', { name: menu.trigger, exact: true });
      await expect(trigger).toBeVisible();

      await trigger.click();
      await waitForMenuReady(page);
      expect(await menuItemTexts(page)).toEqual(menu.items.map(item => item.label));
      await closeMenu(page);

      for (const item of menu.items) {
        const before = serialEndpoints.writes.length;
        await trigger.click();
        await waitForMenuReady(page);
        await clickMenuItem(page, item.label);
        await expect.poll(() => serialEndpoints.writes.length).toBeGreaterThan(before);
        expect(serialEndpoints.writes.slice(before).map(writeSummary)).toEqual(item.writes);
      }
    });
  }
});

test.describe('widget more menu dismissal', () => {
  test('autolevel more toggle has no arrow and opens the widget menu', async ({ page }, testInfo) => {
    await openWorkspace(page);
    const root = widget(page, 'autolevel');
    const title = root.getByText('Autolevel', { exact: true });
    const macroTitle = widget(page, 'macro').getByText('Macro', { exact: true });
    for (const property of ['font-family', 'font-size', 'font-weight', 'line-height', 'padding']) {
      await expect(title).toHaveCSS(property, await macroTitle.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property));
    }
    const toggle = root.getByRole('button', { name: 'More options', exact: true });
    await expect(toggle.locator('svg')).toHaveCount(1);
    await expect(toggle.locator('svg')).toHaveCSS('width', '16px');
    const collapse = root.getByRole('button', { name: 'Collapse', exact: true });
    const toggleBox = await toggle.boundingBox();
    const collapseBox = await collapse.boundingBox();
    expect(toggleBox.y + toggleBox.height / 2).toBeCloseTo(collapseBox.y + collapseBox.height / 2, 0);
    const headerBox = await toggle.locator('xpath=../..').boundingBox();
    const widgetBox = await root.boundingBox();
    expect(widgetBox.x + widgetBox.width - (headerBox.x + headerBox.width)).toBeCloseTo(1, 0);
    await capture(root, testInfo, 'autolevel-toolbar');
    await toggle.click();
    await waitForMenuReady(page);
    await expect(page.getByRole('menuitem', { name: 'Enter Full Screen' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Fork Widget' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Remove Widget' })).toBeVisible();
    await capture(page, testInfo, 'autolevel-more-menu');
    await closeMenu(page);
  });

  test('every widget more menu closes on an outside canvas click without changing the layout', async ({ page }) => {
    await openWorkspace(page);

    for (const id of MORE_MENU_WIDGET_IDS) {
      await test.step(`${id} more menu dismisses outside`, async () => {
        const region = widget(page, id).locator('[role="region"]').first();
        await openMore(page, id);
        await clickOutsideMenu(page);
        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(region).not.toHaveCSS('position', 'fixed');
        await expect(widget(page, id)).toBeVisible();
      });
    }
  });
});

test.describe('console settings', () => {
  const chooseSetting = async (page, dialog, label, option) => {
    await dialog.getByRole('button', { name: label, exact: true }).click();
    await waitForMenuReady(page);
    await clickMenuItem(page, option);
  };

  test('more shows settings first without a standalone gear and opens it by keyboard', async ({ page }, testInfo) => {
    await openWorkspace(page);
    const root = widget(page, 'console');
    await expect(root.getByRole('button', { name: 'Console Settings', exact: true })).toHaveCount(0);
    await expect(root.getByRole('button', { name: 'Clear console', exact: true }).locator('[data-icon="eraser"]')).toBeVisible();
    await openMore(page, 'console');
    expect(await menuItemTexts(page)).toEqual([
      'Console Settings', 'Refresh', 'Select All', 'Copy Selection',
      'Clear Selection', 'Enter Full Screen', 'Fork Widget', 'Remove Widget',
    ]);
    await capture(page, testInfo, 'english-console-settings-first-more');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Console Settings', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Console Settings', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('previews, validates, saves and reloads isolated settings with a visible scrollbar', async ({ page, serialEndpoints }, testInfo) => {
    const root = await prepareConsole(page, serialEndpoints);
    const input = root.locator('.xterm-helper-textarea');
    await input.press('Escape');
    const writesBefore = serialEndpoints.writes.length;
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    let dialog = page.getByRole('dialog', { name: 'Console Settings', exact: true });
    await expect(dialog.getByRole('button', { name: 'Font size', exact: true })).toHaveText('14');
    await dialog.getByRole('button', { name: 'Font size', exact: true }).click();
    await waitForMenuReady(page);
    await capture(page, testInfo, 'console-font-size-menu');
    await clickMenuItem(page, '24');
    await chooseSetting(page, dialog, 'Background color', 'White');
    await chooseSetting(page, dialog, 'Text color', 'Amber');
    await expect(dialog.getByLabel('Terminal preview')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await capture(dialog, testInfo, 'english-console-settings-preview');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await readState(page)).widgets.console.fontSize).toBeUndefined();
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    await expect(dialog.getByRole('button', { name: 'Font size', exact: true })).toHaveText('14');
    await chooseSetting(page, dialog, 'Font size', '18');
    await chooseSetting(page, dialog, 'Background color', 'White');
    await chooseSetting(page, dialog, 'Text color', 'Amber');
    await dialog.getByRole('textbox', { name: 'Columns', exact: true }).fill('79');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog.getByText('Enter a number between 80 and 500')).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Columns', exact: true }).fill('120');
    await dialog.getByRole('textbox', { name: 'Rows', exact: true }).fill('10');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await readState(page)).widgets.console).toMatchObject({ fontSize: 18, terminalCols: 120, terminalRows: 10, terminalBackground: 'white', terminalTextColor: 'amber' });
    serialEndpoints.output(Array.from({ length: 60 }, (_entry, index) => `English terminal output ${index}`).join('\r\n'));
    const container = root.getByRole('log', { name: 'Console output' });
    await expect(container).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect.poll(() => container.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await container.evaluate(element => {
      element.scrollLeft = 200;
    });
    const rail = container.locator('.ps__rail-y');
    await expect.poll(async () => {
      const box = await container.boundingBox();
      const scrollbar = await rail.boundingBox();
      return Math.abs(scrollbar.x + scrollbar.width - (box.x + box.width));
    }).toBeLessThanOrEqual(20);
    await capture(root, testInfo, 'english-console-white-amber-horizontal-scroll');
    expect(serialEndpoints.writes.length).toBe(writesBefore);

    await openMore(page, 'console');
    await clickMenuItem(page, 'Fork Widget');
    await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
    const fork = page.locator('[data-widget-id^="console:"]');
    await expect(fork).toHaveCount(1);
    const forkId = await fork.getAttribute('data-widget-id');
    await openMore(page, forkId);
    await clickMenuItem(page, 'Console Settings');
    await chooseSetting(page, dialog, 'Background color', 'Black');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect.poll(async () => (await readState(page)).widgets[forkId].terminalBackground).toBe('black');
    expect((await readState(page)).widgets.console.terminalBackground).toBe('white');
    await page.reload();
    await expect(root.getByRole('button', { name: 'More options', exact: true })).toBeVisible();
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    dialog = page.getByRole('dialog', { name: 'Console Settings', exact: true });
    await expect(dialog.getByRole('button', { name: 'Font size', exact: true })).toHaveText('18');
    await expect(dialog.getByRole('button', { name: 'Background color', exact: true })).toHaveText('White');
    await expect(dialog.getByRole('textbox', { name: 'Columns', exact: true })).toHaveValue('120');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await readState(page)).widgets[forkId].terminalBackground).toBe('black');
  });

  test('protects pending commands and sends the complete visible row exactly once', async ({ page, serialEndpoints }, testInfo) => {
    const root = await prepareConsole(page, serialEndpoints);
    const input = root.locator('.xterm-helper-textarea');
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    const dialog = page.getByRole('dialog', { name: 'Console Settings', exact: true });
    await dialog.getByRole('textbox', { name: 'Columns', exact: true }).fill('80');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Finish or clear the command');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await input.press('Escape');
    const longCommand = 'G1 X' + '1'.repeat(100);
    await input.pressSequentially(longCommand);
    const before = serialEndpoints.writes.length;
    await input.press('Enter');
    await expect.poll(() => serialEndpoints.writes.length).toBe(before + 1);
    expect(serialEndpoints.writes.at(-1).data).toBe(`${longCommand}\r`);
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    await dialog.getByRole('textbox', { name: 'Columns', exact: true }).fill('80');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await input.press('ArrowUp');
    await openMore(page, 'console');
    await clickMenuItem(page, 'Select All');
    await expect.poll(() => selectedConsoleText(root)).toContain('This history entry does not fit');
    await capture(root, testInfo, 'english-console-history-width-safety');
    expect(serialEndpoints.writes.length).toBe(before + 1);
    await openMore(page, 'console');
    await clickMenuItem(page, 'Clear Selection');
    await input.press('Escape');
    const boundary = 'G1 X' + '2'.repeat(73);
    await input.pressSequentially(boundary);
    await input.press('Enter');
    await expect.poll(() => serialEndpoints.writes.length).toBe(before + 2);
    expect(serialEndpoints.writes.at(-1).data).toBe(`${boundary}\r`);
    await input.pressSequentially('G1 X10');
    serialEndpoints.output('asynchronous status while typing');
    await openMore(page, 'console');
    await clickMenuItem(page, 'Select All');
    await expect.poll(() => selectedConsoleText(root)).toContain('asynchronous status while typing');
    await openMore(page, 'console');
    await clickMenuItem(page, 'Clear Selection');
    await input.press('ArrowLeft');
    await input.pressSequentially('2');
    await input.press('Enter');
    await expect.poll(() => serialEndpoints.writes.length).toBe(before + 3);
    expect(serialEndpoints.writes.at(-1).data).toBe('G1 X120\r');
  });

  test('refits fullscreen and remeasures fonts changed while collapsed', async ({ page, serialEndpoints }, testInfo) => {
    const root = await prepareConsole(page, serialEndpoints);
    const input = root.locator('.xterm-helper-textarea');
    await input.press('Escape');
    await root.getByRole('button', { name: 'Collapse', exact: true }).click();
    await openMore(page, 'console');
    await clickMenuItem(page, 'Console Settings');
    const dialog = page.getByRole('dialog', { name: 'Console Settings', exact: true });
    await chooseSetting(page, dialog, 'Font size', '24');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await root.getByRole('button', { name: 'Expand', exact: true }).click();
    await expect(root.locator('.xterm-screen canvas').first()).toBeVisible();
    await root.getByRole('button', { name: 'Enter full screen', exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(async () => {
      const frame = await root.getByRole('log', { name: 'Console output' }).boundingBox();
      const canvas = await root.locator('.xterm-screen canvas').first().boundingBox();
      return canvas.x >= frame.x - 1 && canvas.y >= frame.y - 1 &&
        canvas.x + canvas.width <= frame.x + frame.width + 1 && canvas.y + canvas.height <= frame.y + frame.height + 1;
    }).toBe(true);
    await testInfo.attach('console-fullscreen-geometry', {
      body: JSON.stringify(await root.getByRole('log').evaluate(element => ({
        frame: element.getBoundingClientRect().toJSON(),
        scrollLeft: element.scrollLeft,
        parentScrollLeft: element.parentElement.scrollLeft,
        canvas: element.querySelector('canvas').getBoundingClientRect().toJSON(),
      }))),
      contentType: 'application/json',
    });
    await capture(root.getByRole('region', { name: 'Console widget', exact: true }), testInfo, 'english-console-fullscreen-font-24');
    await root.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    await expect.poll(async () => (await readState(page)).widgets.console.fontSize).toBe(24);
    expect((await readState(page)).widgets.console.terminalCols).toBe(256);
  });
});
