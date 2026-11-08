import {
  test,
  expect,
  openWorkspace,
  widget,
} from '../support/fixtures.mjs';

const getState = page => page.evaluate(() => {
  const { state } = JSON.parse(localStorage.getItem('cnc'));
  return state;
});

const tableRows = page => page
  .locator('main [role="table"]:visible [role="rowgroup"]')
  .nth(1)
  .getByRole('row');

const rowByName = (page, name) => tableRows(page).filter({ hasText: name });

// Tonic `Checkbox` keeps its input visually hidden, so users toggle the
// wrapping label instead.
const checkboxLabel = checkbox => checkbox.locator('xpath=ancestor::label[1]');

async function setChecked(checkbox, checked) {
  await expect(checkbox).toBeEnabled();
  if ((await checkbox.isChecked()) !== checked) {
    await checkboxLabel(checkbox).click();
  }
  await expect(checkbox).toBeChecked({ checked });
}

const jsonResponse = (route, status, body) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/**
 * Serve one administration resource from memory and fulfill every write
 * locally. Records, created IDs, enable/disable state, and bulk deletes are
 * applied to the in-memory list so the subsequent query invalidation observes
 * the mocked result. A write kind can be failed once to exercise error UI
 * without touching the real backend.
 */
const installResourceMock = async (page, { resource, records = [] }) => {
  let currentRecords = JSON.parse(JSON.stringify(records));
  let nextId = 1;
  const writes = [];
  const failures = { create: false, update: false, delete: false };
  const base = `/api/${resource}`;

  await page.route(new RegExp(`/api/${resource}(/[^?]*)?(\\?.*)?$`), (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;

    if (method === 'GET') {
      if (pathname === base) {
        return jsonResponse(route, 200, {
          records: currentRecords,
          pagination: { totalRecords: currentRecords.length },
        });
      }
      const id = pathname.slice(base.length + 1);
      const record = currentRecords.find(item => item.id === id);
      return record
        ? jsonResponse(route, 200, record)
        : jsonResponse(route, 404, {});
    }

    const body = request.postData() ? request.postDataJSON() : null;
    const isCreate = method === 'POST' && pathname === base;
    const isUpdate = method === 'PUT' && pathname.startsWith(`${base}/`);
    const isBulkDelete = method === 'POST' && pathname === `${base}/delete`;
    const isBulkStatus = method === 'POST' && (
      pathname === `${base}/enable` || pathname === `${base}/disable`
    );

    writes.push({ method, path: pathname, body });

    if (isCreate && failures.create) {
      failures.create = false;
      return jsonResponse(route, 500, { error: 'simulated create failure' });
    }
    if (isUpdate && failures.update) {
      failures.update = false;
      return jsonResponse(route, 500, { error: 'simulated update failure' });
    }
    if (isBulkDelete && failures.delete) {
      failures.delete = false;
      return jsonResponse(route, 500, { error: 'simulated delete failure' });
    }

    if (isCreate) {
      const record = {
        id: `e2e-created-${nextId++}`,
        mtime: '2024-01-02T00:00:00.000Z',
        ...body,
      };
      currentRecords = [...currentRecords, record];
      return jsonResponse(route, 200, record);
    }

    if (isUpdate) {
      const id = pathname.slice(base.length + 1);
      currentRecords = currentRecords.map(item => (
        item.id === id ? { ...item, ...body } : item
      ));
      return jsonResponse(route, 200, currentRecords.find(item => item.id === id) ?? {});
    }

    if (isBulkDelete) {
      const ids = body?.ids ?? [];
      currentRecords = currentRecords.filter(item => !ids.includes(item.id));
      return jsonResponse(route, 200, {});
    }

    if (isBulkStatus) {
      const enabled = pathname.endsWith('/enable');
      const ids = body?.ids ?? [];
      currentRecords = currentRecords.map(item => (
        ids.includes(item.id) ? { ...item, enabled } : item
      ));
      return jsonResponse(route, 200, {});
    }

    return jsonResponse(route, 200, {});
  });

  return {
    writes,
    failNextWrite: (kind) => {
      failures[kind] = true;
    },
  };
};

// Tonic focuses the menu container in a requestAnimationFrame after it opens,
// and clips menu content while the Collapse enters. Interacting before both
// settle makes pointerup land on a different element than pointerdown.
const waitForMenuReady = async (page) => {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(menu.locator('[data-tonic="Collapse"]')).toHaveCSS('overflow', 'visible');
};

const clickMenuItem = async (page, name) => {
  await page.getByRole('menuitem', { name, exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
};

const openWidgetMenu = async (page, id) => {
  await widget(page, id).getByRole('button', { name: /^More( options)?$/ }).click();
  await waitForMenuReady(page);
};

// Session bootstrap and G-code uploads are legitimate background writes, not
// mutations of the resource or settings surfaces under test.
const trackApiWrites = (page) => {
  const writes = [];
  page.on('request', (request) => {
    const url = request.url();
    if (
      request.method() !== 'GET' &&
      url.includes('/api/') &&
      !url.includes('/api/signin') &&
      !url.includes('/api/gcode')
    ) {
      writes.push(`${request.method()} ${new URL(url).pathname}`);
    }
  });
  return writes;
};

test.describe('administration modal and drawer persistence', () => {
  test('administration modal: Commands create, update, and bulk delete use stateful mocked writes', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'commands', records: [] });

    await page.goto('/#/administration/commands');
    await expect(page.locator('header')).toContainText('Commands');
    await expect(page.getByText('No data to display')).toBeVisible();

    // Escape dismisses the create drawer without submitting. Focus must be
    // inside the drawer for the drawer's Escape handler to receive the key.
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    let drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New Command')).toBeVisible();
    await drawer.locator('input[name="name"]').focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    drawer = page.getByRole('dialog');
    await drawer.locator('input[name="name"]').fill('E2E Created Command');
    await drawer.locator('textarea[name="action"]').fill('echo created');
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created Command')).toBeVisible();

    // The table row opens the update drawer for the created record.
    await rowByName(page, 'E2E Created Command')
      .getByRole('button', { name: 'E2E Created Command' })
      .click();
    drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Command Details')).toBeVisible();
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Created Command');
    await drawer.locator('input[role="switch"]').locator('xpath=ancestor::label[1]').click();
    await drawer.locator('input[name="name"]').fill('E2E Updated Command');
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Updated Command')).toContainText('OFF');

    await setChecked(rowByName(page, 'E2E Updated Command').getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(confirm.getByText('Count: 1')).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByText('No data to display')).toBeVisible();

    expect(mock.writes).toEqual([
      {
        method: 'POST',
        path: '/api/commands',
        body: { enabled: true, name: 'E2E Created Command', action: 'echo created' },
      },
      {
        method: 'PUT',
        path: '/api/commands/e2e-created-1',
        body: { enabled: false, name: 'E2E Updated Command', action: 'echo created' },
      },
      {
        method: 'POST',
        path: '/api/commands/delete',
        body: { ids: ['e2e-created-1'] },
      },
    ]);
  });

  test('administration modal: Commands update reports a write error and succeeds on retry', async ({ page }) => {
    const mock = await installResourceMock(page, {
      resource: 'commands',
      records: [{
        id: 'command-1',
        name: 'E2E Command',
        action: 'echo original',
        enabled: true,
        mtime: '2024-01-01T00:00:00.000Z',
      }],
    });
    mock.failNextWrite('update');

    await page.goto('/#/administration/commands');
    await expect(rowByName(page, 'E2E Command')).toBeVisible();
    await rowByName(page, 'E2E Command')
      .getByRole('button', { name: 'E2E Command' })
      .click();

    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Command');
    await drawer.locator('input[name="name"]').fill('E2E Command Retry');
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('An unexpected error has occurred.').last()).toBeVisible();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Command Retry');

    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Command Retry')).toBeVisible();
    expect(mock.writes.map(write => `${write.method} ${write.path}`)).toEqual([
      'PUT /api/commands/command-1',
      'PUT /api/commands/command-1',
    ]);
  });

  test('administration modal: Events create error keeps the drawer open with its values', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'events', records: [] });
    mock.failNextWrite('create');

    await page.goto('/#/administration/events');
    await expect(page.getByText('No data to display')).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New Event')).toBeVisible();
    await drawer.locator('input[name="name"]').fill('E2E Event Failure');
    await drawer.locator('input[name="trigger"]').fill('status:ready');
    await drawer.locator('textarea[name="action"]').fill('echo failure');
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByText('An unexpected error has occurred.').last()).toBeVisible();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Event Failure');
    await expect(drawer.locator('input[name="trigger"]')).toHaveValue('status:ready');

    await drawer.getByRole('button', { name: 'Cancel' }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByText('No data to display')).toBeVisible();
    expect(mock.writes).toEqual([{
      method: 'POST',
      path: '/api/events',
      body: { enabled: true, name: 'E2E Event Failure', trigger: 'status:ready', action: 'echo failure' },
    }]);
  });

  test('administration modal: Events create, update, and bulk status follow mocked list state', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'events', records: [] });

    await page.goto('/#/administration/events');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    let drawer = page.getByRole('dialog');
    await drawer.locator('input[name="name"]').fill('E2E Created Event');
    await drawer.locator('input[name="trigger"]').fill('status:ready');
    await drawer.locator('textarea[name="action"]').fill('echo event');
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created Event')).toBeVisible();

    await rowByName(page, 'E2E Created Event')
      .getByRole('button', { name: 'E2E Created Event' })
      .click();
    drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Event Details')).toBeVisible();
    await expect(drawer.locator('input[name="trigger"]')).toHaveValue('status:ready');
    await drawer.locator('input[name="trigger"]').fill('status:idle');
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created Event')).toContainText('status:idle');

    await setChecked(rowByName(page, 'E2E Created Event').getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Disable', exact: true }).click();
    await expect(rowByName(page, 'E2E Created Event')).toContainText('OFF');

    await setChecked(rowByName(page, 'E2E Created Event').getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Enable', exact: true }).click();
    await expect(rowByName(page, 'E2E Created Event')).toContainText('ON');

    expect(mock.writes).toEqual([
      {
        method: 'POST',
        path: '/api/events',
        body: { enabled: true, name: 'E2E Created Event', trigger: 'status:ready', action: 'echo event' },
      },
      {
        method: 'PUT',
        path: '/api/events/e2e-created-1',
        body: { enabled: true, name: 'E2E Created Event', trigger: 'status:idle', action: 'echo event' },
      },
      {
        method: 'POST',
        path: '/api/events/disable',
        body: { ids: ['e2e-created-1'] },
      },
      {
        method: 'POST',
        path: '/api/events/enable',
        body: { ids: ['e2e-created-1'] },
      },
    ]);
  });

  test('administration modal: Machine Profiles create and update submit normalized limits', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'machines', records: [] });

    await page.goto('/#/administration/machine-profiles');
    await expect(page.locator('header')).toContainText('Machine Profiles');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    let drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New Machine')).toBeVisible();
    await drawer.locator('input[name="name"]').fill('E2E Machine');
    await drawer.getByRole('spinbutton', { name: /^X min/ }).fill('0');
    await drawer.getByRole('spinbutton', { name: /^X max/ }).fill('200');
    await drawer.getByRole('spinbutton', { name: /^Y min/ }).fill('0');
    await drawer.getByRole('spinbutton', { name: /^Y max/ }).fill('100');
    await drawer.getByRole('spinbutton', { name: /^Z min/ }).fill('-10');
    await drawer.getByRole('spinbutton', { name: /^Z max/ }).fill('10');
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Machine')).toBeVisible();

    await rowByName(page, 'E2E Machine')
      .getByRole('button', { name: 'E2E Machine' })
      .click();
    drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Machine Details')).toBeVisible();
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Machine');
    await drawer.locator('input[name="name"]').fill('E2E Machine Updated');
    await drawer.getByRole('spinbutton', { name: /^X max/ }).fill('250');
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Machine Updated')).toBeVisible();

    expect(mock.writes).toEqual([
      {
        method: 'POST',
        path: '/api/machines',
        body: {
          name: 'E2E Machine',
          limits: { xmin: 0, xmax: 200, ymin: 0, ymax: 100, zmin: -10, zmax: 10 },
        },
      },
      {
        method: 'PUT',
        path: '/api/machines/e2e-created-1',
        body: {
          name: 'E2E Machine Updated',
          limits: { xmin: 0, xmax: 250, ymin: 0, ymax: 100, zmin: -10, zmax: 10 },
        },
      },
    ]);
  });

  test('administration modal: Macros create/update menus insert variables, and failed delete keeps records', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'macros', records: [] });

    await page.goto('/#/administration/macros');
    await expect(page.locator('header')).toContainText('Macros');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New Macro')).toBeVisible();
    await drawer.locator('input[name="name"]').fill('E2E Created Macro');
    const textarea = drawer.locator('textarea[name="action"]');
    await textarea.click();

    // Interacting outside the open variable menu closes it without inserting.
    await drawer.getByRole('button', { name: 'Select variables', exact: true }).click();
    await waitForMenuReady(page);
    await drawer.locator('input[name="name"]').click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(textarea).toHaveValue('');
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Created Macro');

    // Keyboard activation of a menu item inserts the variable at the caret.
    await drawer.getByRole('button', { name: 'Select variables', exact: true }).click();
    await waitForMenuReady(page);
    await page.getByRole('menuitem', { name: '%wait', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(textarea).toHaveValue('%wait');

    // Pointer selection inserts at the caret after the previous insertion.
    const globalVariable = '%global.tool = Number(tool) || 0';
    await drawer.getByRole('button', { name: 'Select variables', exact: true }).click();
    await waitForMenuReady(page);
    await page.getByRole('menuitem', { name: globalVariable, exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const createdAction = `%wait${globalVariable}`;
    await expect(textarea).toHaveValue(createdAction);

    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created Macro')).toBeVisible();

    // The update drawer offers the same variable menu.
    await rowByName(page, 'E2E Created Macro')
      .getByRole('button', { name: 'E2E Created Macro' })
      .click();
    const updateDrawer = page.getByRole('dialog');
    await expect(updateDrawer.getByText('Macro Details')).toBeVisible();
    const updateTextarea = updateDrawer.locator('textarea[name="action"]');
    await expect(updateTextarea).toHaveValue(createdAction);
    await updateTextarea.evaluate((element) => {
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });
    const goToPosition = 'G0 X[X0] Y[Y0]';
    await updateDrawer.getByRole('button', { name: 'Select variables', exact: true }).click();
    await waitForMenuReady(page);
    await page.getByRole('menuitem', { name: goToPosition, exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const updatedAction = `${createdAction}${goToPosition}`;
    await expect(updateTextarea).toHaveValue(updatedAction);
    await updateDrawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(updateDrawer).toHaveCount(0);

    // Escape closes the delete confirmation without writing once focus is
    // inside the modal.
    await setChecked(rowByName(page, 'E2E Created Macro').getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    let confirm = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await expect(confirm.getByText('Count: 1')).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(1);

    // A failed delete leaves the record and closes the confirmation.
    mock.failNextWrite('delete');
    await setChecked(rowByName(page, 'E2E Created Macro').getByRole('checkbox').first(), true);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    confirm = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to delete the selected items?' });
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(tableRows(page)).toHaveCount(1);
    await expect(rowByName(page, 'E2E Created Macro')).toBeVisible();

    expect(mock.writes).toEqual([
      {
        method: 'POST',
        path: '/api/macros',
        body: { name: 'E2E Created Macro', action: createdAction },
      },
      {
        method: 'PUT',
        path: '/api/macros/e2e-created-1',
        body: { name: 'E2E Created Macro', action: updatedAction },
      },
      {
        method: 'POST',
        path: '/api/macros/delete',
        body: { ids: ['e2e-created-1'] },
      },
    ]);
  });

  test('administration modal: Macro variable menu closes on Escape', async ({ page }) => {
    await installResourceMock(page, { resource: 'macros', records: [] });

    await page.goto('/#/administration/macros');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New Macro')).toBeVisible();
    await drawer.locator('input[name="name"]').fill('E2E Menu Draft');
    await drawer.locator('textarea[name="action"]').click();
    await drawer.getByRole('button', { name: 'Select variables', exact: true }).click();
    await waitForMenuReady(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('administration modal: User Accounts create and update persist', async ({ page }) => {
    const mock = await installResourceMock(page, { resource: 'users', records: [] });

    await page.goto('/#/administration/user-accounts');
    await expect(page.locator('header')).toContainText('User Accounts');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    let drawer = page.getByRole('dialog');
    await expect(drawer.getByText('New User')).toBeVisible();
    await drawer.locator('input[name="name"]').fill('E2E Created User');
    await drawer.locator('input[name="password"]').fill('e2e-secret');
    await drawer.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created User')).toBeVisible();

    await rowByName(page, 'E2E Created User')
      .getByRole('button', { name: 'E2E Created User' })
      .click();
    drawer = page.getByRole('dialog');
    await expect(drawer.getByText('User Details')).toBeVisible();
    await expect(drawer.locator('input[name="name"]')).toHaveValue('E2E Created User');
    await drawer.locator('input[role="switch"]').locator('xpath=ancestor::label[1]').click();
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(rowByName(page, 'E2E Created User')).toContainText('OFF');

    expect(mock.writes).toEqual([
      {
        method: 'POST',
        path: '/api/users',
        body: { enabled: true, name: 'E2E Created User', password: 'e2e-secret' },
      },
      {
        method: 'PUT',
        path: '/api/users/e2e-created-1',
        body: { enabled: false, name: 'E2E Created User' },
      },
    ]);
  });
});

test.describe('settings modal and persistence', () => {
  test('administration modal: General Settings save reports success and failure', async ({ page }) => {
    const postBodies = [];
    let failNextSave = false;

    await page.route('**/api/state', (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        return jsonResponse(route, 200, {
          controller: { exception: { ignoreErrors: false } },
          allowAnonymousUsageDataCollection: false,
        });
      }
      postBodies.push(request.postDataJSON());
      if (failNextSave) {
        failNextSave = false;
        return jsonResponse(route, 500, { error: 'simulated save failure' });
      }
      return jsonResponse(route, 200, {});
    });

    await page.goto('/#/administration/general-settings');
    await expect(page.locator('header')).toContainText('General Settings');
    const anonymous = page.getByRole('checkbox', { name: 'Allow anonymous usage data collection' });
    await expect(anonymous).toBeEnabled();
    await expect(anonymous).not.toBeChecked();

    await setChecked(anonymous, true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Settings saved.').last()).toBeVisible();

    failNextSave = true;
    await setChecked(anonymous, false);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('An unexpected error has occurred.').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

    expect(postBodies).toEqual([
      { controller: { exception: { ignoreErrors: false } }, allowAnonymousUsageDataCollection: true },
      { controller: { exception: { ignoreErrors: false } }, allowAnonymousUsageDataCollection: false },
    ]);
  });

  test('administration modal: Workspace Settings import confirms and persists imported settings', async ({ page }, testInfo) => {
    const appearance = testInfo.project.use.colorScheme || 'light';
    const imported = appearance === 'dark' ? 'light' : 'dark';
    const writes = trackApiWrites(page);

    await page.route('**/api/system/info', route => jsonResponse(route, 200, {
      userStore: { file: '/tmp/cncjs-e2e-user-config.json' },
    }));

    await page.goto('/#/administration/workspace-settings');
    await expect(page.locator('header')).toContainText('Workspace Settings');
    await expect(page.getByText('/tmp/cncjs-e2e-user-config.json')).toBeVisible();

    const payload = {
      version: '2.0.0-dev',
      state: {
        settings: { appearance: imported, language: 'en' },
        widgets: { connection: { autoReconnect: false } },
      },
    };
    const fileInput = page.locator('main input[type="file"]').first();

    // Escape cancels the confirmation and keeps the stored settings.
    await fileInput.setInputFiles({
      name: 'workspace-cancel.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    let dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to overwrite the workspace settings?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('appearance');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await getState(page)).settings.appearance).toBe(appearance);

    await fileInput.setInputFiles({
      name: 'workspace-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to overwrite the workspace settings?' });
    await expect(dialog).toBeVisible();
    const importNavigation = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    await importNavigation;

    await expect(page.locator('header')).toContainText('Workspace Settings');
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', imported);
    await expect.poll(async () => (await getState(page)).settings.appearance).toBe(imported);
    await expect.poll(async () => (await getState(page)).widgets.connection.autoReconnect).toBe(false);
    expect(writes).toEqual([]);
  });

  test('administration modal: Workspace Settings restore defaults confirms and reloads defaults', async ({ page }) => {
    const writes = trackApiWrites(page);

    await page.route('**/api/system/info', route => jsonResponse(route, 200, {
      userStore: { file: '/tmp/cncjs-e2e-user-config.json' },
    }));

    await page.goto('/#/administration/workspace-settings');
    await expect(page.locator('header')).toContainText('Workspace Settings');
    await expect.poll(async () => (await getState(page)).workspace.container.primary.widgets).toContain('custom');

    await page.getByRole('button', { name: 'Restore Defaults', exact: true }).click();
    let dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to restore the default settings?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('/tmp/cncjs-e2e-user-config.json')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await getState(page)).workspace.container.primary.widgets).toContain('custom');

    await page.getByRole('button', { name: 'Restore Defaults', exact: true }).click();
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to restore the default settings?' });
    await expect(dialog).toBeVisible();
    const restoreNavigation = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Restore Defaults', exact: true }).click();
    await restoreNavigation;

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#viewport')).toContainText(/Sign in to CNCjs|Workspace/);
    await expect.poll(async () => (await getState(page)).settings.appearance).toBe('auto');
    const state = await getState(page);
    expect(state.workspace.container.primary.widgets).toEqual([
      'connection', 'console', 'grbl', 'marlin', 'smoothie', 'tinyg', 'webcam',
    ]);
    expect(state.widgets.connection.autoReconnect).toBe(true);
    expect(writes).toEqual([]);
  });
});

test.describe('application dialogs', () => {
  test('application modal: corrupted workspace settings can be downloaded and restored', async ({ page, context }) => {
    const writes = trackApiWrites(page);
    // Corrupt the stored settings once so the post-restore reload hydrates cleanly.
    // This context script runs after the shared fixture's seed script.
    await context.addInitScript(() => {
      if (sessionStorage.getItem('e2e-corrupted-once')) {
        return;
      }
      sessionStorage.setItem('e2e-corrupted-once', '1');
      localStorage.setItem('cnc', '{invalid');
    });

    await page.goto('/#/workspace');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Corrupted workspace settings')).toBeVisible();
    await expect(dialog.getByText('The workspace settings have become corrupted or invalid. Click Restore Defaults to restore default settings and continue.')).toBeVisible();

    const download = dialog.getByRole('link', { name: 'Download workspace settings' });
    await expect(download).toHaveAttribute('download', /^cncjs-.*\.json$/);
    await expect(download).toHaveAttribute('href', /^data:text\/plain/);

    const restoreNavigation = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Restore Defaults', exact: true }).click();
    await restoreNavigation;

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#viewport')).toContainText(/Sign in to CNCjs|Workspace/);
    await expect.poll(async () => (await getState(page)).settings.appearance).toBe('auto');
    expect(writes).toEqual([]);
  });

  test('application modal: navigation drawer closes on Escape and outside interaction', async ({ page }) => {
    await openWorkspace(page);
    await page.setViewportSize({ width: 600, height: 900 });

    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    const drawer = page.getByRole('dialog', { name: 'Main navigation' });

    await toggle.click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Close navigation' }).focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await toggle.click();
    await expect(drawer).toBeVisible();
    // 560px is beyond the 240px drawer, over its backdrop.
    await page.mouse.click(560, 300);
    await expect(drawer).toHaveCount(0);
    await expect(toggle).toBeVisible();
  });

  test('application modal: secondary axes widget fork and remove confirmations persist', async ({ page }) => {
    await openWorkspace(page);
    const forkedWidgets = page.locator('[data-widget-id^="axes:"]');

    await openWidgetMenu(page, 'axes');
    await clickMenuItem(page, 'Fork Widget');
    let dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to fork this widget?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(0);

    await openWidgetMenu(page, 'axes');
    await clickMenuItem(page, 'Fork Widget');
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to fork this widget?' });
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(1);

    const forkedId = await forkedWidgets.getAttribute('data-widget-id');
    expect(forkedId).toMatch(/^axes:/);
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.widgets).toContain(forkedId);

    await page.reload();
    await openWorkspace(page);
    await expect(forkedWidgets).toHaveCount(1);

    await forkedWidgets.getByRole('button', { name: 'More options', exact: true }).click();
    await waitForMenuReady(page);
    await clickMenuItem(page, 'Remove Widget');
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to remove this widget?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(1);

    await forkedWidgets.getByRole('button', { name: 'More options', exact: true }).click();
    await waitForMenuReady(page);
    await clickMenuItem(page, 'Remove Widget');
    dialog = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to remove this widget?' });
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(forkedWidgets).toHaveCount(0);
    await expect.poll(async () => (await getState(page)).workspace.container.secondary.widgets).not.toContain(forkedId);
  });
});
