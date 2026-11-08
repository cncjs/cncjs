import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortalManager, ToastManager } from '@tonic-ui/react';
import axios from '@app/api/axios';
import { renderAppUI } from '@app/test/render';
import Commands from '../Commands/Commands';
import Events from '../Events/Events';
import Machines from '../Machines/Machines';
import Macros from '../Macros/Macros';
import Users from '../Users/Users';

// These integration cases exercise several real Tonic menus/drawers and CRUD
// transitions. Intel macOS CI can exceed the default 10s case budget; retain
// every interaction/assertion and the normal per-query waitFor deadlines.
jest.setTimeout(30000);

jest.mock('@app/components/CodePreview', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: (text, values = {}) => text.replace(/{{(\w+)}}/g, (match, key) => values[key] ?? match) },
}));
jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }) => children({ width: 800, height: 500 }),
}));

const resources = [
  ['commands', Commands], ['events', Events], ['machines', Machines],
  ['macros', Macros], ['users', Users],
];

// Resource lists that scope the full-table loading overlay to the initial fetch
// and explicit refreshes, keeping records visible for background refetches.
const refreshResources = resources.filter(([resource]) => resource !== 'machines');

const triggerListMutation = {
  commands: async (user) => {
    await user.click(screen.getAllByRole('switch')[0]);
  },
  events: async (user) => {
    await user.click(screen.getAllByRole('switch')[0]);
  },
  macros: async (user) => {
    await user.click(screen.getByRole('checkbox', { name: 'Select row r1' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  },
  users: async (user) => {
    await user.click(screen.getAllByRole('switch')[0]);
  },
};
const records = [
  { id: 'r1', name: 'Zulu', title: 'Zulu', commands: 'G28', content: 'G28', mtime: 1700000000000, enabled: true },
  { id: 'r2', name: 'Alpha', title: 'Alpha', commands: 'G0 X1', content: 'G0 X1', mtime: 1700000000000, enabled: false },
];

beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  axios.put.mockReset();
  axios.delete.mockReset();
  axios.get.mockResolvedValue({ data: { records, pagination: { totalRecords: 120 } } });
});

test.each(resources)('%s retains server order, row/bulk selection and 1-based paging', async (resource, Component) => {
  const user = userEvent.setup();
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('checkbox', { name: 'Select row r1' });
    const names = screen.getAllByRole('button').filter(button => ['Zulu', 'Alpha'].includes(button.textContent));
    expect(names.map(button => button.textContent)).toEqual(['Zulu', 'Alpha']);
    await user.click(screen.getByRole('checkbox', { name: 'Select row r1' }));
    expect(screen.getByRole('checkbox', { name: 'Select row r1' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByRole('checkbox', { name: 'Select row r2' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Go to last page' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Page' })).toHaveValue('6'));
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Go to first page' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Page' })).toHaveValue('1'));
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    await waitFor(() => expect(axios.get.mock.calls.some(([url]) => url === `api/${resource}?paging=true&page=2&pageLength=20`)).toBe(true));
    expect(screen.getByRole('checkbox', { name: 'Select row r1' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '20 per page' }));
    await user.click(screen.getByRole('menuitem', { name: '50' }));
    await waitFor(() => expect(axios.get.mock.calls.some(([url]) => url === `api/${resource}?paging=true&page=1&pageLength=50`)).toBe(true));
    expect(screen.getByRole('textbox', { name: 'Page' })).toHaveValue('1');
  } finally {
    view.dispose();
  }
});

test.each(resources)('%s distinguishes loading, empty and error and can retry', async (resource, Component) => {
  const user = userEvent.setup();
  let resolveRequest;
  axios.get.mockImplementationOnce(() => new Promise(resolve => {
    resolveRequest = resolve;
  }));
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    resolveRequest({ data: { records: [], pagination: { totalRecords: 0 } } });
    await screen.findByText('No data to display');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
    let rejectRefresh;
    axios.get.mockImplementationOnce(() => new Promise((resolve, reject) => {
      rejectRefresh = reject;
    }));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(rejectRefresh).toBeDefined());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Loading...'));
    rejectRefresh(new Error('List unavailable'));
    await screen.findByRole('alert');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    axios.get.mockResolvedValueOnce({ data: { records, pagination: { totalRecords: 2 } } });
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
    await screen.findByRole('checkbox', { name: 'Select row r1' });
  } finally {
    view.dispose();
  }
});

test.each(refreshResources)('%s keeps records visible without the loading overlay during a mutation refetch', async (resource, Component) => {
  const user = userEvent.setup();
  let resolveRefetch;
  axios.post.mockResolvedValue({ data: {} });
  axios.get.mockImplementationOnce(() => Promise.resolve({ data: { records, pagination: { totalRecords: 2 } } }));
  axios.get.mockImplementationOnce(() => new Promise(resolve => {
    resolveRefetch = resolve;
  }));
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('button', { name: 'Zulu' });
    await triggerListMutation[resource](user);
    await waitFor(() => expect(resolveRefetch).toBeDefined());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zulu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    resolveRefetch({ data: { records, pagination: { totalRecords: 2 } } });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Select row r1' })).toBeEnabled());
  } finally {
    view.dispose();
  }
});

test.each(refreshResources)('%s shows the loading overlay until an explicit refresh settles', async (resource, Component) => {
  const user = userEvent.setup();
  let resolveRefresh;
  axios.get.mockImplementationOnce(() => Promise.resolve({ data: { records, pagination: { totalRecords: 2 } } }));
  axios.get.mockImplementationOnce(() => new Promise(resolve => {
    resolveRefresh = resolve;
  }));
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('button', { name: 'Zulu' });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(resolveRefresh).toBeDefined());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Loading...'));
    expect(screen.getByRole('button', { name: 'Zulu' })).toBeInTheDocument();
    resolveRefresh({ data: { records, pagination: { totalRecords: 2 } } });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Zulu' })).toBeInTheDocument();
  } finally {
    view.dispose();
  }
});

const createFields = {
  commands: ['Command name:', 'Command action:'],
  events: ['Event name:', 'Event trigger:', 'Event action:'],
  macros: ['Macro name:', 'G-code commands:'],
  users: ['User name:', 'Password:'],
};

test.each(resources.filter(([resource]) => resource !== 'machines'))('%s updates the visible cache after create, update and bulk delete', async (resource, Component) => {
  const user = userEvent.setup();
  let serverRecords = records.map(record => ({ ...record }));
  const prefix = `api/${resource}`;
  axios.get.mockImplementation(url => {
    if (url.startsWith(`${prefix}/`)) {
      return Promise.resolve({ data: serverRecords.find(record => record.id === url.slice(prefix.length + 1)) });
    }
    return Promise.resolve({ data: { records: serverRecords, pagination: { totalRecords: serverRecords.length } } });
  });
  axios.post.mockImplementation((url, data) => {
    if (url === `${prefix}/delete`) {
      serverRecords = serverRecords.filter(record => !data.ids.includes(record.id));
    } else {
      serverRecords = serverRecords.concat({ ...data, id: 'created', mtime: 1700000000000 });
    }
    return Promise.resolve({ data: { id: 'created' } });
  });
  axios.put.mockImplementation((url, data) => {
    serverRecords = serverRecords.map(record => (record.id === 'created' ? { ...record, ...data } : record));
    return Promise.resolve({ data: { id: 'created' } });
  });
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('checkbox', { name: 'Select row r1' });
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const labels = createFields[resource];
    await labels.reduce((promise, label, index) => promise.then(() => (
      user.type(screen.getByLabelText(new RegExp(`^${label}`)), index === 0 ? 'Created' : 'fixture-value')
    )), Promise.resolve());
    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    await user.click(addButtons[addButtons.length - 1]);
    await screen.findByRole('button', { name: 'Created' });
    expect(axios.post).toHaveBeenCalledWith(prefix, expect.objectContaining({ name: 'Created' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Select row created' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Created' }));
    const name = await screen.findByLabelText(new RegExp(`^${labels[0]}`));
    await waitFor(() => expect(name).toHaveValue('Created'));
    await user.clear(name);
    await user.type(name, 'Updated');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Updated' });
    expect(axios.put).toHaveBeenCalledWith(`${prefix}/created`, expect.objectContaining({ name: 'Updated' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row created' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Updated' })).not.toBeInTheDocument());
    expect(axios.post).toHaveBeenCalledWith(`${prefix}/delete`, { ids: ['created'] });
  } finally {
    view.dispose();
  }
});

test('Machines create, update and bulk delete preserve the server name and numeric limits contract', async () => {
  const user = userEvent.setup();
  let serverRecords = [{
    id: 'r1',
    name: 'Existing profile',
    limits: { xmin: -10, xmax: 10, ymin: -20, ymax: 20, zmin: -5, zmax: 5 },
    mtime: 1700000000000,
  }];
  axios.get.mockImplementation(url => {
    if (url.startsWith('api/machines/')) {
      return Promise.resolve({ data: serverRecords.find(record => record.id === url.slice('api/machines/'.length)) });
    }
    return Promise.resolve({ data: { records: serverRecords, pagination: { totalRecords: serverRecords.length } } });
  });
  axios.post.mockImplementation((url, data) => {
    if (url === 'api/machines/delete') {
      serverRecords = serverRecords.filter(record => !data.ids.includes(record.id));
    } else {
      serverRecords = serverRecords.concat({ ...data, id: 'created', mtime: 1700000000000 });
    }
    return Promise.resolve({ data: { id: 'created' } });
  });
  axios.put.mockImplementation((url, data) => {
    serverRecords = serverRecords.map(record => (record.id === 'created' ? { ...record, ...data } : record));
    return Promise.resolve({ data: { id: 'created' } });
  });

  const view = renderAppUI(<ToastManager><PortalManager><Machines /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('button', { name: 'Existing profile' });
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByText('New Machine');
    await user.type(screen.getByLabelText(/^Machine name:/), 'Created profile');
    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    const submitAdd = addButtons[addButtons.length - 1];
    const xmin = screen.getByLabelText(/^X min/);
    await user.clear(xmin);
    await user.click(submitAdd);
    expect(await screen.findByText('Enter a valid finite number.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    const createLimits = { xmin: '-100', xmax: '-101', ymin: '-50', ymax: '50', zmin: '-25', zmax: '25' };
    await Object.entries(createLimits).reduce((promise, [key, value]) => promise.then(async () => {
      const label = new RegExp(`^${key[0].toUpperCase()} ${key.endsWith('min') ? 'min' : 'max'}`);
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, value);
    }), Promise.resolve());
    await user.click(submitAdd);
    expect(await screen.findByText('Maximum must be greater than or equal to minimum.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/^X max/));
    await user.type(screen.getByLabelText(/^X max/), '100');
    await user.click(submitAdd);
    await screen.findByRole('button', { name: 'Created profile' });
    expect(axios.post).toHaveBeenCalledWith('api/machines', {
      name: 'Created profile',
      limits: { xmin: -100, xmax: 100, ymin: -50, ymax: 50, zmin: -25, zmax: 25 },
    });

    await user.click(screen.getByRole('button', { name: 'Created profile' }));
    await screen.findByText('Machine Details');
    await waitFor(() => expect(screen.getByLabelText(/^X max/)).toHaveValue(100));
    const name = screen.getByLabelText(/^Machine name:/);
    await user.clear(name);
    await user.type(name, 'Updated profile');
    const xmax = screen.getByLabelText(/^X max/);
    await user.clear(xmax);
    await user.type(xmax, '125');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Updated profile' });
    expect(axios.put).toHaveBeenCalledWith('api/machines/created', {
      name: 'Updated profile',
      limits: { xmin: -100, xmax: 125, ymin: -50, ymax: 50, zmin: -25, zmax: 25 },
    });

    await user.click(screen.getByRole('checkbox', { name: 'Select row created' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Updated profile' })).not.toBeInTheDocument());
    expect(axios.post).toHaveBeenCalledWith('api/machines/delete', { ids: ['created'] });
  } finally {
    view.dispose();
  }
});

test.each(resources.filter(([resource]) => resource !== 'users'))('%s toggles row details without fetching or mutating', async (resource, Component) => {
  const user = userEvent.setup();
  const view = renderAppUI(<ToastManager><PortalManager><Component /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('checkbox', { name: 'Select row r1' });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Select row r1' })).toBeEnabled());
    const requestCount = axios.get.mock.calls.length;
    const details = screen.getByRole('button', { name: 'Toggle details for r1' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    await user.click(details);
    expect(screen.getByRole('button', { name: 'Toggle details for r1' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Toggle details for r1' }));
    expect(screen.getByRole('button', { name: 'Toggle details for r1' })).toHaveAttribute('aria-expanded', 'false');
    expect(axios.get).toHaveBeenCalledTimes(requestCount);
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  } finally {
    view.dispose();
  }
});

test('Users and Commands keep separate list caches', async () => {
  axios.get.mockImplementation(url => Promise.resolve({
    data: {
      records: [{ ...records[0], name: url.startsWith('api/users') ? 'User fixture' : 'Command fixture' }],
      pagination: { totalRecords: 1 },
    },
  }));
  const view = renderAppUI(<ToastManager><PortalManager><Commands /><Users /></PortalManager></ToastManager>);
  try {
    await screen.findByRole('button', { name: 'User fixture' });
    await screen.findByRole('button', { name: 'Command fixture' });
    expect(axios.get.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining([
      'api/commands?paging=true&page=1&pageLength=20', 'api/users?paging=true&page=1&pageLength=20',
    ]));
  } finally {
    view.dispose();
  }
});
