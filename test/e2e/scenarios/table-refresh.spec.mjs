import {
  test,
  expect,
} from '../support/fixtures.mjs';

const createDeferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const listPattern = resource => new RegExp(`/api/${resource}(\\?.*)?$`);

const tableRows = page => page
  .locator('main [role="table"]:visible [role="rowgroup"]')
  .nth(1)
  .getByRole('row');

const tableStatus = page => page.locator('main [role="table"]:visible').getByRole('status');

const rowByName = (page, name) => tableRows(page).filter({ hasText: name });

const rowSwitch = (page, name) => rowByName(page, name).locator('input[role="switch"]');

// Tonic `Switch` renders a visually hidden input inside a `<label>`, so users
// toggle the wrapping label rather than the input itself.
const toggleSwitch = async (page, name) => {
  await rowSwitch(page, name).locator('xpath=ancestor::label[1]').click();
};

// Tonic `Checkbox` keeps its input visually hidden, so users toggle the
// wrapping label instead.
const setRowChecked = async (page, name, checked) => {
  const checkbox = rowByName(page, name).getByRole('checkbox').first();
  if ((await checkbox.isChecked()) !== checked) {
    await checkbox.locator('xpath=ancestor::label[1]').click();
  }
  await expect(checkbox).toBeChecked({ checked });
};

/**
 * Serve the resource list and mock only the writes a scenario performs. The
 * list handler can be told to withhold the next response, which lets a test
 * observe the UI while a genuine query fetch is in flight. Writes never reach
 * the shared context route, so nothing is sent to the real backend.
 */
const installResourceMock = async (page, { resource, writePattern, records }) => {
  let currentRecords = records;
  let holdNextListRequest = false;
  let heldRoute = null;
  let heldSignal = createDeferred();
  const writes = [];

  const listBody = () => JSON.stringify({
    records: currentRecords,
    pagination: { totalRecords: currentRecords.length },
  });

  const fulfillList = route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: listBody(),
  });

  await page.route(listPattern(resource), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    // The header independently fetches all commands; only hold the table query.
    if (new URL(route.request().url()).searchParams.get('paging') === 'false') {
      await fulfillList(route);
      return;
    }
    if (holdNextListRequest) {
      holdNextListRequest = false;
      heldRoute = route;
      heldSignal.resolve();
      return;
    }
    await fulfillList(route);
  });

  await page.route(writePattern, async (route) => {
    const request = route.request();
    writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  return {
    writes,
    holdNextListRequest() {
      holdNextListRequest = true;
      heldSignal = createDeferred();
    },
    whenListHeld: () => heldSignal.promise,
    async releaseList(nextRecords) {
      if (nextRecords) {
        currentRecords = nextRecords;
      }
      const route = heldRoute;
      heldRoute = null;
      if (!route) {
        throw new Error('No list request is currently held');
      }
      await fulfillList(route);
    },
  };
};

const COMMAND = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'E2E Command',
  action: 'echo e2e',
  enabled: true,
  mtime: '2024-01-01T00:00:00.000Z',
};

const EVENT = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'E2E Event',
  trigger: 'status:ready',
  action: 'echo event',
  enabled: true,
  mtime: '2024-01-01T00:00:00.000Z',
};

const USER = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'E2E User',
  enabled: true,
  mtime: '2024-01-01T00:00:00.000Z',
};

const MACRO_A = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'E2E Macro A',
  action: 'G0 X0 Y0',
  mtime: '2024-01-01T00:00:00.000Z',
};

const MACRO_B = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'E2E Macro B',
  action: 'G0 X10 Y10',
  mtime: '2024-01-01T00:00:00.000Z',
};

const SWITCH_SCENARIOS = [
  {
    title: 'Commands',
    path: '/#/administration/commands',
    resource: 'commands',
    record: COMMAND,
    switchName: COMMAND.name,
    writePattern: /\/api\/commands\/[^/]+\/(enable|disable)$/,
    expectedWrite: `POST /api/commands/${COMMAND.id}/disable`,
    refreshedRecords: [
      { ...COMMAND, name: 'E2E Command Refreshed' },
      {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'E2E Command Second',
        action: 'echo second',
        enabled: true,
        mtime: '2024-01-02T00:00:00.000Z',
      },
    ],
  },
  {
    title: 'Events',
    path: '/#/administration/events',
    resource: 'events',
    record: EVENT,
    switchName: EVENT.name,
    writePattern: /\/api\/events\/[^/]+\/(enable|disable)$/,
    expectedWrite: `POST /api/events/${EVENT.id}/disable`,
    refreshedRecords: [
      { ...EVENT, name: 'E2E Event Refreshed' },
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'E2E Event Second',
        trigger: 'status:idle',
        action: 'echo idle',
        enabled: true,
        mtime: '2024-01-02T00:00:00.000Z',
      },
    ],
  },
  {
    title: 'User Accounts',
    path: '/#/administration/user-accounts',
    resource: 'users',
    record: USER,
    switchName: USER.name,
    writePattern: /\/api\/users\/[^/]+\/(enable|disable)$/,
    expectedWrite: `POST /api/users/${USER.id}/disable`,
    refreshedRecords: [
      { ...USER, name: 'E2E User Refreshed' },
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'E2E User Second',
        enabled: true,
        mtime: '2024-01-02T00:00:00.000Z',
      },
    ],
  },
];

test.describe('administration table loading', () => {
  for (const scenario of SWITCH_SCENARIOS) {
    test(`${scenario.title}: switch mutation keeps records rendered while the background refetch is pending`, async ({ page }) => {
      const mock = await installResourceMock(page, {
        resource: scenario.resource,
        writePattern: scenario.writePattern,
        records: [scenario.record],
      });

      await page.goto(scenario.path);
      await expect(page.locator('header')).toContainText(scenario.title);
      await expect(tableRows(page)).toHaveCount(1);
      const rowSwitchInput = rowSwitch(page, scenario.switchName);
      await expect(rowSwitchInput).toBeChecked();
      await expect(tableStatus(page)).toHaveCount(0);

      // Withhold the list response that the mutation invalidation triggers.
      mock.holdNextListRequest();
      await toggleSwitch(page, scenario.switchName);
      await mock.whenListHeld();

      // The refetch is genuinely in flight, yet the table must not swap the
      // rendered records for a full-table loading overlay.
      await expect(tableStatus(page)).toHaveCount(0);
      await expect(tableRows(page)).toHaveCount(1);
      await expect(rowByName(page, scenario.switchName)).toBeVisible();
      // No optimistic update: the row still shows the server-confirmed state.
      await expect(rowSwitchInput).toBeChecked();
      await expect(rowByName(page, scenario.switchName)).toContainText('ON');

      // Release the response carrying the updated status.
      await mock.releaseList([{ ...scenario.record, enabled: false }]);

      await expect(rowSwitchInput).not.toBeChecked();
      await expect(rowByName(page, scenario.switchName)).toContainText('OFF');
      await expect(tableStatus(page)).toHaveCount(0);
      await expect(tableRows(page)).toHaveCount(1);
      expect(mock.writes).toEqual([scenario.expectedWrite]);
    });

    test(`${scenario.title}: Refresh shows full-table loading until its request settles`, async ({ page }) => {
      const mock = await installResourceMock(page, {
        resource: scenario.resource,
        writePattern: scenario.writePattern,
        records: [scenario.record],
      });

      await page.goto(scenario.path);
      await expect(page.locator('header')).toContainText(scenario.title);
      await expect(tableRows(page)).toHaveCount(1);
      await expect(tableStatus(page)).toHaveCount(0);

      // Withhold the response of the explicit refresh request.
      mock.holdNextListRequest();
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await mock.whenListHeld();

      // An explicit refresh is the one case that may take over the table, but
      // the previously rendered records must stay in place underneath.
      await expect(tableStatus(page)).toBeVisible();
      await expect(tableStatus(page)).toContainText('Loading...');
      await expect(tableRows(page)).toHaveCount(1);
      await expect(rowByName(page, scenario.switchName)).toBeVisible();
      // The withheld response has not been applied yet.
      await expect(rowByName(page, scenario.refreshedRecords[1].name)).toHaveCount(0);

      await mock.releaseList(scenario.refreshedRecords);

      await expect(tableStatus(page)).toHaveCount(0);
      await expect(tableRows(page)).toHaveCount(2);
      await expect(rowByName(page, scenario.refreshedRecords[0].name)).toBeVisible();
      await expect(rowByName(page, scenario.refreshedRecords[1].name)).toBeVisible();
      expect(mock.writes).toEqual([]);
    });
  }

  test('Commands: initial load shows full-table loading until the first response arrives', async ({ page }) => {
    const mock = await installResourceMock(page, {
      resource: 'commands',
      writePattern: /\/api\/commands\/[^/]+\/(enable|disable)$/,
      records: [COMMAND],
    });

    // Withhold the very first list response, before the page mounts.
    mock.holdNextListRequest();
    await page.goto('/#/administration/commands');
    await expect(page.locator('header')).toContainText('Commands');
    await mock.whenListHeld();

    await expect(tableStatus(page)).toBeVisible();
    await expect(tableStatus(page)).toContainText('Loading...');
    await expect(tableRows(page)).toHaveCount(0);

    await mock.releaseList([COMMAND]);

    await expect(tableStatus(page)).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(rowByName(page, COMMAND.name)).toBeVisible();
    expect(mock.writes).toEqual([]);
  });

  test('Macros: bulk delete keeps records rendered while the background refetch is pending', async ({ page }) => {
    const mock = await installResourceMock(page, {
      resource: 'macros',
      writePattern: /\/api\/macros\/delete$/,
      records: [MACRO_A, MACRO_B],
    });

    await page.goto('/#/administration/macros');
    await expect(page.locator('header')).toContainText('Macros');
    await expect(tableRows(page)).toHaveCount(2);
    await expect(tableStatus(page)).toHaveCount(0);

    await setRowChecked(page, MACRO_A.name, true);
    mock.holdNextListRequest();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await mock.whenListHeld();

    // The delete succeeded, but its invalidation must not blank the table.
    await expect(tableStatus(page)).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(2);
    await expect(rowByName(page, MACRO_A.name)).toBeVisible();
    await expect(rowByName(page, MACRO_B.name)).toBeVisible();

    await mock.releaseList([MACRO_B]);

    await expect(tableRows(page)).toHaveCount(1);
    await expect(rowByName(page, MACRO_B.name)).toBeVisible();
    await expect(rowByName(page, MACRO_A.name)).toHaveCount(0);
    await expect(tableStatus(page)).toHaveCount(0);
    expect(mock.writes).toEqual(['POST /api/macros/delete']);
  });

  test('Macros: Refresh shows full-table loading until its request settles', async ({ page }) => {
    const mock = await installResourceMock(page, {
      resource: 'macros',
      writePattern: /\/api\/macros\/delete$/,
      records: [MACRO_A, MACRO_B],
    });

    await page.goto('/#/administration/macros');
    await expect(page.locator('header')).toContainText('Macros');
    await expect(tableRows(page)).toHaveCount(2);
    await expect(tableStatus(page)).toHaveCount(0);

    mock.holdNextListRequest();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await mock.whenListHeld();

    await expect(tableStatus(page)).toBeVisible();
    await expect(tableStatus(page)).toContainText('Loading...');
    await expect(tableRows(page)).toHaveCount(2);
    await expect(rowByName(page, MACRO_A.name)).toBeVisible();
    await expect(rowByName(page, MACRO_B.name)).toBeVisible();
    // The withheld response has not been applied yet.
    await expect(rowByName(page, 'E2E Macro Refreshed')).toHaveCount(0);

    const refreshedMacro = { ...MACRO_A, name: 'E2E Macro Refreshed' };
    await mock.releaseList([refreshedMacro]);

    await expect(tableStatus(page)).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(rowByName(page, refreshedMacro.name)).toBeVisible();
    await expect(rowByName(page, MACRO_A.name)).toHaveCount(0);
    expect(mock.writes).toEqual([]);
  });
});
