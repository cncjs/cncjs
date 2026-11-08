/* Machine state and dropdown selections require sequential interactions. */
/* eslint-disable no-await-in-loop */
import { test as baseTest, expect, openWorkspace, widget } from '../support/fixtures.mjs';
import { test as simulatorTest } from '../support/simulator.mjs';
import { test as snapshotTest } from '../support/controller-snapshot.mjs';

// The Axes DisplayPanel renders one action dropdown per configured axis. The
// stock widget only enables x/y/z; seeding the widget config exercises the
// A/B/C branches without touching source or shared fixtures.
const METRIC_STEPS = [
  0.001, 0.002, 0.003, 0.005, 0.01, 0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5,
  1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500,
];
const IMPERIAL_STEPS = [
  0.0001, 0.0002, 0.0003, 0.0005, 0.001, 0.002, 0.003, 0.005, 0.01, 0.02, 0.03,
  0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 20,
];
const METRIC_DEFAULT_INDEX = METRIC_STEPS.indexOf(1);
const IMPERIAL_DEFAULT_INDEX = IMPERIAL_STEPS.indexOf(1);
const AXES = ['X', 'Y', 'Z', 'A', 'B', 'C'];

const wcsIndex = wcs => Number(wcs.slice(1)) - 53;

const headerActions = (wcs = 'G54') => ({
  goWork: 'Go To Work Zero (G0 X0 Y0 Z0)',
  zeroWork: `Zero Out Work Offsets (G10 L20 P${wcsIndex(wcs)} X0 Y0 Z0)`,
  zeroTemp: 'Zero Out Temporary Offsets (G92 X0 Y0 Z0)',
  unzeroTemp: 'Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)',
  goMachine: 'Go To Machine Zero (G53 G0 X0 Y0 Z0)',
  home: 'Home Machine ($H)',
});

const axisActions = (axis, wcs = 'G54') => ({
  goWork: `Go To Work Zero On ${axis} Axis (G0 ${axis}0)`,
  zeroWork: `Zero Out Work ${axis} Axis (G10 L20 P${wcsIndex(wcs)} ${axis}0)`,
  zeroTemp: `Zero Out Temporary ${axis} Axis (G92 ${axis}0)`,
  unzeroTemp: `Un-Zero Out Temporary ${axis} Axis (G92.1 ${axis}0)`,
  goMachine: `Go To Machine Zero On ${axis} Axis (G53 G0 ${axis}0)`,
  home: `Home Machine ${axis} Axis ($H${axis})`,
});

// The shared fixture seeds `cnc` once per context. Merge the Axes config into
// that write regardless of init-script order, then stop intercepting so later
// jog-step selections persist normally.
const seedAxesConfig = (page, baseURL, axes) => page.addInitScript(({
  origin, axes, metricStep, imperialStep,
}) => {
  if (window.location.origin !== origin) {
    return;
  }
  if (localStorage.getItem('e2e-axes-menus-seeded')) {
    return;
  }
  localStorage.setItem('e2e-axes-menus-seeded', '1');

  const patch = (value) => {
    try {
      const data = JSON.parse(value);
      data.state = data.state || {};
      const state = data.state;
      state.widgets = state.widgets || {};
      const widgets = state.widgets;
      widgets.axes = widgets.axes || {};
      const current = widgets.axes;
      widgets.axes = {
        ...current,
        axes,
        jog: {
          ...(current.jog || {}),
          imperial: { ...(current.jog?.imperial || {}), step: imperialStep, distances: [] },
          metric: { ...(current.jog?.metric || {}), step: metricStep, distances: [] },
        },
      };
      return JSON.stringify(data);
    } catch {
      return value;
    }
  };

  const current = localStorage.getItem('cnc');
  if (current) {
    const originalSetItem = Storage.prototype.setItem;
    originalSetItem.call(localStorage, 'cnc', patch(current));
    return;
  }

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === 'cnc' && this === localStorage) {
      const result = originalSetItem.call(this, key, patch(value));
      Storage.prototype.setItem = originalSetItem;
      return result;
    }
    return originalSetItem.call(this, key, value);
  };
}, {
  origin: new URL(baseURL).origin,
  axes,
  metricStep: METRIC_DEFAULT_INDEX,
  imperialStep: IMPERIAL_DEFAULT_INDEX,
});

const withAxesSeed = (base, axes) => base.extend({
  page: async ({ page, baseURL }, use) => {
    await seedAxesConfig(page, baseURL, axes);
    await use(page);
  },
});

const test = withAxesSeed(baseTest, AXES.map(axis => axis.toLowerCase()));
const simulator = withAxesSeed(simulatorTest, AXES.map(axis => axis.toLowerCase()));
const snapshot = withAxesSeed(snapshotTest, ['x', 'y', 'z']);

const openMenu = async (page) => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
  return menu;
};

const closeMenu = async (page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const selectMenuItem = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const expectMenuItemsEnabled = async (menu) => {
  for (const item of await menu.getByRole('menuitem').all()) {
    await expect(item).toBeEnabled();
  }
};

const axisRow = (root, axis) => root.locator('tbody tr').nth(AXES.indexOf(axis));

const cellText = async (row, column) => (await row.locator('td').nth(column).evaluate(cell => cell.firstElementChild?.textContent || '')).replace(/\s+/g, '');

const expectPosition = async (row, column, value) => {
  await expect.poll(() => cellText(row, column)).toBe(value);
};

const commandCount = (simulatorInstance, command) => simulatorInstance.commands
  .filter(line => line.includes(`CMD: ${command} ->`)).length;

const expectCommand = async (simulatorInstance, command) => {
  await expect.poll(() => commandCount(simulatorInstance, command)).toBeGreaterThan(0);
};

const expectCommandResponse = async (simulatorInstance, command, response) => {
  await expect.poll(() => simulatorInstance.commands.some(
    line => line.includes(`CMD: ${command} -> ${response}`)
  )).toBe(true);
};

const openHeaderMenu = async (page, root) => {
  await root.getByRole('button', { name: 'Select work coordinate system', exact: true }).click();
  return openMenu(page);
};

const openAxisMenu = async (page, root, axis) => {
  await axisRow(root, axis).getByRole('button', { name: `${axis} axis actions`, exact: true }).click();
  return openMenu(page);
};

test('axes: outer action and keypad dropdowns stay disabled while disconnected', async ({ page }) => {
  await openWorkspace(page);
  const root = widget(page, 'axes');
  await expect(root.getByRole('button', { name: 'Select work coordinate system', exact: true })).toBeDisabled();
  for (const axis of AXES) {
    const row = axisRow(root, axis);
    await expect(row).toHaveCount(1);
    await expect(row.locator('td').first()).toContainText(axis);
    await expect(row.getByRole('button', { name: `${axis} axis actions`, exact: true })).toBeDisabled();
  }
  const keypad = root.locator('[class*="keypad"]').first();
  await expect(keypad.getByRole('button').filter({ hasText: /^G2[01] \((mm|inch)\)$/ })).toBeDisabled();
  await expect(keypad.getByRole('button').filter({ hasText: /^\d+(?:\.\d+)?(?:mm|in)$/ })).toBeDisabled();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

simulator('axes: header menu executes every Grbl work, temporary and machine action', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');
  const actions = headerActions();
  const x = axisRow(root, 'X');
  const y = axisRow(root, 'Y');

  await x.getByRole('button', { name: 'Move X forward', exact: true }).click();
  await expectPosition(x, 2, '1.000');
  await y.getByRole('button', { name: 'Move Y forward', exact: true }).click();
  await expectPosition(y, 2, '1.000');

  const menu = await openHeaderMenu(page, root);
  await expect(menu.getByRole('heading', { name: 'Work Coordinate System (G54)' })).toBeVisible();
  await expect(menu.getByRole('heading', { name: 'Temporary Offsets (G92)' })).toBeVisible();
  await expect(menu.getByRole('heading', { name: 'Machine Coordinate System (G53)' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Set Machine Zero/ })).toHaveCount(0);
  await expectMenuItemsEnabled(menu);
  await selectMenuItem(page, actions.goWork);
  await expectCommand(grbl, 'G0 X0 Y0 Z0');
  await expectPosition(x, 2, '0.000');
  await expectPosition(y, 2, '0.000');

  await x.getByRole('button', { name: 'Move X forward', exact: true }).click();
  await expectPosition(x, 2, '1.000');
  await y.getByRole('button', { name: 'Move Y forward', exact: true }).click();
  await expectPosition(y, 2, '1.000');

  await openHeaderMenu(page, root);
  await selectMenuItem(page, actions.zeroWork);
  await expectCommand(grbl, 'G10 L20 P1 X0 Y0 Z0');

  await openHeaderMenu(page, root);
  await selectMenuItem(page, actions.zeroTemp);
  await expectCommand(grbl, 'G92 X0 Y0 Z0');
  await expectPosition(x, 2, '0.000');
  await expectPosition(y, 2, '0.000');

  await openHeaderMenu(page, root);
  await selectMenuItem(page, actions.unzeroTemp);
  await expectCommand(grbl, 'G92.1 X0 Y0 Z0');
  await expectPosition(x, 2, '0.000');
  await expectPosition(y, 2, '0.000');

  await openHeaderMenu(page, root);
  await selectMenuItem(page, actions.goMachine);
  await expectCommand(grbl, 'G53 G0 X0 Y0 Z0');

  // The simulator ships with homing disabled, so the selected `$H` entry
  // reaches the controller and is rejected without moving any axis.
  await openHeaderMenu(page, root);
  await selectMenuItem(page, actions.home);
  await expectCommandResponse(grbl, '$H', 'error:5');
});

simulator('axes: header menu supports Escape, outside dismissal and keyboard activation', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');

  await openHeaderMenu(page, root);
  await closeMenu(page);
  expect(commandCount(grbl, 'G0 X0 Y0 Z0')).toBe(0);

  await openHeaderMenu(page, root);
  await root.getByRole('button', { name: 'Toggle manual data input mode', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Work Coordinate System (G54)' })).toHaveCount(0);

  await openHeaderMenu(page, root);
  await page.keyboard.press('Home');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expectCommand(grbl, 'G0 X0 Y0 Z0');
  await expect(page.getByRole('menu')).toHaveCount(0);

  await openHeaderMenu(page, root);
  await page.keyboard.press('Home');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expectCommand(grbl, 'G10 L20 P1 X0 Y0 Z0');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

simulator('axes: header menu follows G55-G59 and targets the active work offset', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');
  const visualizer = widget(page, 'visualizer');

  for (const wcs of ['G55', 'G56', 'G57', 'G58', 'G59']) {
    const index = wcsIndex(wcs);
    await visualizer.getByRole('button', { name: /^G5[4-9] \(P[1-6]\)$/ }).click();
    await openMenu(page);
    await page.getByRole('menuitem', { name: `${wcs} (P${index})`, exact: true }).click();
    await expect(visualizer.getByRole('button', { name: `${wcs} (P${index})`, exact: true })).toBeVisible();

    const menu = await openHeaderMenu(page, root);
    await expect(menu.getByRole('heading', { name: `Work Coordinate System (${wcs})` })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Zero Out Work Offsets/ })).toHaveCount(1);
    await selectMenuItem(page, headerActions(wcs).zeroWork);
    await expectCommand(grbl, `G10 L20 P${index} X0 Y0 Z0`);
  }

  const menu = await openAxisMenu(page, root, 'X');
  await expect(menu.getByRole('heading', { name: 'Work Coordinate System (G59)' })).toBeVisible();
  await selectMenuItem(page, axisActions('X', 'G59').zeroWork);
  await expectCommand(grbl, 'G10 L20 P6 X0');
});

simulator('axes: X/Y/Z action menus execute every Grbl entry and apply work offsets', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');

  for (const axis of ['X', 'Y', 'Z']) {
    const row = axisRow(root, axis);
    const actions = axisActions(axis);

    await row.getByRole('button', { name: `Move ${axis} forward`, exact: true }).click();
    await expectPosition(row, 2, '1.000');

    const menu = await openAxisMenu(page, root, axis);
    await expect(menu.getByRole('heading', { name: 'Work Coordinate System (G54)' })).toBeVisible();
    await expect(menu.getByRole('heading', { name: 'Temporary Offsets (G92)' })).toBeVisible();
    await expect(menu.getByRole('heading', { name: 'Machine Coordinate System (G53)' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Set Machine Zero|Zero Out Machine/ })).toHaveCount(0);
    await expectMenuItemsEnabled(menu);
    await selectMenuItem(page, actions.goWork);
    await expectCommand(grbl, `G0 ${axis}0`);
    await expectPosition(row, 2, '0.000');

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.zeroWork);
    await expectCommand(grbl, `G10 L20 P1 ${axis}0`);

    await row.getByRole('button', { name: `Move ${axis} forward`, exact: true }).click();
    await expectPosition(row, 2, '1.000');

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.zeroTemp);
    await expectCommand(grbl, `G92 ${axis}0`);
    await expectPosition(row, 2, '0.000');
    await expectPosition(row, 1, '1.000');

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.unzeroTemp);
    await expectCommand(grbl, `G92.1 ${axis}0`);
    await expectPosition(row, 2, '1.000');

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.goMachine);
    await expectCommand(grbl, `G53 G0 ${axis}0`);

    // Grbl single-axis homing requires a compile-time flag; the simulator
    // rejects it, which proves the menu entry reached the controller.
    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.home);
    await expectCommandResponse(grbl, `$H${axis}`, 'error:3');
  }
});

simulator('axes: A/B/C action menus are available for configured axes and transmit every Grbl entry', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');

  for (const axis of ['A', 'B', 'C']) {
    const actions = axisActions(axis);
    const menu = await openAxisMenu(page, root, axis);
    await expect(menu.getByRole('heading', { name: 'Work Coordinate System (G54)' })).toBeVisible();
    await expectMenuItemsEnabled(menu);
    await selectMenuItem(page, actions.goWork);
    await expectCommand(grbl, `G0 ${axis}0`);

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.zeroWork);
    await expectCommand(grbl, `G10 L20 P1 ${axis}0`);

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.zeroTemp);
    await expectCommand(grbl, `G92 ${axis}0`);

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.unzeroTemp);
    await expectCommand(grbl, `G92.1 ${axis}0`);

    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.goMachine);
    await expectCommand(grbl, `G53 G0 ${axis}0`);

    // The Grbl simulator has no rotary position report; these actions are
    // verified by the command each menu entry transmits.
    await openAxisMenu(page, root, axis);
    await selectMenuItem(page, actions.home);
    await expectCommandResponse(grbl, `$H${axis}`, 'error:3');
  }
});

simulator('axes: keypad units menu switches G20/G21 and every metric jog distance is selectable', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');
  const keypad = root.locator('[class*="keypad"]').first();
  const unitToggle = keypad.getByRole('button').filter({ hasText: /^G2[01] \((mm|inch)\)$/ });
  const stepToggle = keypad.getByRole('button').filter({ hasText: /^\d+(?:\.\d+)?(?:mm|in)$/ });

  await expect(unitToggle).toHaveText('G21 (mm)');
  await expect(stepToggle).toHaveText('1mm');

  await unitToggle.click();
  let menu = await openMenu(page);
  await expect(menu.getByRole('heading', { name: 'Units' })).toBeVisible();
  await expectMenuItemsEnabled(menu);
  await selectMenuItem(page, 'G20 (inch)');
  await expectCommand(grbl, 'G20');
  await expect(unitToggle).toHaveText('G20 (inch)');
  await expect(stepToggle).toHaveText('1in');
  await expect(axisRow(root, 'X').locator('td').first()).toContainText('in');

  await unitToggle.click();
  menu = await openMenu(page);
  await expect(menu.getByRole('heading', { name: 'Units' })).toBeVisible();
  await selectMenuItem(page, 'G21 (mm)');
  await expectCommand(grbl, 'G21');
  await expect(unitToggle).toHaveText('G21 (mm)');
  await expect(stepToggle).toHaveText('1mm');
  await expect(axisRow(root, 'X').locator('td').first()).toContainText('mm');

  for (const value of METRIC_STEPS) {
    await stepToggle.click();
    const stepMenu = await openMenu(page);
    await expect(stepMenu.getByRole('heading', { name: 'Metric' })).toBeVisible();
    const item = stepMenu.getByRole('menuitem', { name: `${value} mm`, exact: true });
    await expect(item).toBeEnabled();
    await item.click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(stepToggle).toHaveText(`${value}mm`);
  }

  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('cnc')).state.widgets.axes.jog.metric.step
  ))).toBe(METRIC_STEPS.indexOf(500));

  await stepToggle.click();
  await openMenu(page);
  await selectMenuItem(page, '10 mm');
  await expect(stepToggle).toHaveText('10mm');
  await keypad.getByRole('button', { name: 'Move X positive', exact: true }).click();
  await expectCommand(grbl, 'G0 X10');
  await expectPosition(axisRow(root, 'X'), 2, '10.000');
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('cnc')).state.widgets.axes.jog.metric.step
  ))).toBe(METRIC_STEPS.indexOf(10));
});

simulator('axes: keypad imperial jog distance menu exposes every inch step and jogs in inches', async ({ page, simulator: grbl }) => {
  const root = widget(page, 'axes');
  const keypad = root.locator('[class*="keypad"]').first();
  const unitToggle = keypad.getByRole('button').filter({ hasText: /^G2[01] \((mm|inch)\)$/ });
  const stepToggle = keypad.getByRole('button').filter({ hasText: /^\d+(?:\.\d+)?(?:mm|in)$/ });

  await unitToggle.click();
  await openMenu(page);
  await selectMenuItem(page, 'G20 (inch)');
  await expectCommand(grbl, 'G20');
  await expect(stepToggle).toHaveText('1in');

  for (const value of IMPERIAL_STEPS) {
    await stepToggle.click();
    const menu = await openMenu(page);
    await expect(menu.getByRole('heading', { name: 'Imperial' })).toBeVisible();
    const item = menu.getByRole('menuitem', { name: `${value} in`, exact: true });
    await expect(item).toBeEnabled();
    await item.click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(stepToggle).toHaveText(`${value}in`);
  }

  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('cnc')).state.widgets.axes.jog.imperial.step
  ))).toBe(IMPERIAL_STEPS.indexOf(20));

  await stepToggle.click();
  await openMenu(page);
  await selectMenuItem(page, '1 in');
  await expect(stepToggle).toHaveText('1in');
  await keypad.getByRole('button', { name: 'Move X positive', exact: true }).click();
  await expectCommand(grbl, 'G0 X1');
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem('cnc')).state.widgets.axes.jog.imperial.step
  ))).toBe(IMPERIAL_DEFAULT_INDEX);
});

snapshot('axes: controller snapshots expose controller-specific action entries without executing commands', async ({ page, controllerSnapshot }) => {
  const root = widget(page, 'axes');
  const header = root.getByRole('button', { name: 'Select work coordinate system', exact: true });

  controllerSnapshot({
    type: 'TinyG',
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
  });
  await expect(widget(page, 'tinyg').getByRole('button', { name: 'Power Management', exact: true })).toBeVisible();
  await expect(header).toBeEnabled();
  let menu = await openHeaderMenu(page, root);
  await expect(menu.getByRole('menuitem', { name: 'Set Machine Zero (G28.3 X0 Y0 Z0)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: 'Home Machine (G28.2 X0 Y0 Z0)', exact: true })).toBeEnabled();
  await expectMenuItemsEnabled(menu);
  await closeMenu(page);

  menu = await openAxisMenu(page, root, 'X');
  await expect(menu.getByRole('menuitem', { name: 'Zero Out Machine X Axis (G28.3 X0)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: 'Home Machine X Axis (G28.2 X0)', exact: true })).toBeEnabled();
  await closeMenu(page);

  controllerSnapshot({
    type: 'Smoothie',
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
  });
  await expect(widget(page, 'smoothie').getByRole('button', { name: 'Status Reports', exact: true })).toBeVisible();
  await expect(header).toBeEnabled();
  menu = await openHeaderMenu(page, root);
  await expect(menu.getByRole('menuitem', { name: 'Home Machine (G28)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /Set Machine Zero/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: /Zero Out Work Offsets/ })).toHaveCount(1);
  await closeMenu(page);

  menu = await openAxisMenu(page, root, 'X');
  await expect(menu.getByRole('menuitem', { name: 'Home Machine X Axis (G28 X)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /G28\.3/ })).toHaveCount(0);
  await closeMenu(page);

  controllerSnapshot({
    type: 'Marlin',
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
  });
  await expect(widget(page, 'marlin').getByRole('button', { name: 'Heater Control', exact: true })).toBeVisible();
  await expect(header).toBeEnabled();
  menu = await openHeaderMenu(page, root);
  await expect(menu.getByRole('menuitem', { name: 'Go To Work Zero (G0 X0 Y0 Z0)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /Zero Out Work Offsets/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: 'Zero Out Temporary Offsets (G92 X0 Y0 Z0)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /Un-Zero Out Temporary Offsets/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: 'Go To Machine Zero (G53 G0 X0 Y0 Z0)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: 'Home Machine (G28)', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /G28\.3/ })).toHaveCount(0);
  await closeMenu(page);

  menu = await openAxisMenu(page, root, 'X');
  await expect(menu.getByRole('menuitem', { name: /Zero Out Work X Axis/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: /Un-Zero Out Temporary X Axis/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: 'Home Machine X Axis (G28 X)', exact: true })).toBeEnabled();
  await closeMenu(page);
});
