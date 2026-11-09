import React from 'react';
import { renderAppUI } from '@app/test/render';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import WatchDirectory from '../WatchDirectory';
import { watchDirectoryQueryOptions } from '../queries';

const mockGetFiles = jest.fn();

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    watch: {
      getFiles: (...args) => mockGetFiles(...args),
      uploadFile: jest.fn(),
    },
  },
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

jest.mock('@app/lib/log', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

global.TextEncoder = require('util').TextEncoder;

describe('watch directory query contract', () => {
  test('normalizes equivalent paths to one query key and request path', () => {
    const first = watchDirectoryQueryOptions('/jobs/../jobs/part/');
    const second = watchDirectoryQueryOptions('jobs/part');

    expect(first.queryKey).toEqual(second.queryKey);
    expect(first.queryKey).toEqual(['watch-directory', 'jobs/part']);
    expect(first.queryFn).toEqual(expect.any(Function));
  });

  test('uses the normalized path when it fetches directory data', async () => {
    mockGetFiles.mockResolvedValue({
      body: { path: 'jobs/part', files: [] },
    });
    const options = watchDirectoryQueryOptions('/jobs/part/');

    await options.queryFn({ queryKey: options.queryKey });

    expect(mockGetFiles).toHaveBeenCalledWith({ path: 'jobs/part' });
  });

  test('shows an empty-directory state after the root query resolves', async () => {
    mockGetFiles.mockResolvedValue({
      body: { path: '', files: [] },
    });
    renderAppUI(
      <WatchDirectory
        state={{ modal: { params: {} } }}
        actions={{ closeModal: jest.fn(), updateModalParams: jest.fn(), loadFile: jest.fn() }}
      />
    );

    expect(await screen.findByText('Empty directory')).toBeInTheDocument();
    await waitFor(() => expect(mockGetFiles).toHaveBeenCalledWith({ path: '' }));
  });

  test('loads normalized child data when a directory is expanded', async () => {
    mockGetFiles.mockReset();
    mockGetFiles.mockImplementation(({ path: directoryPath }) => {
      if (!directoryPath) {
        return Promise.resolve({
          body: {
            path: '',
            files: [{ name: 'jobs', type: 'd' }],
          },
        });
      }
      return Promise.resolve({
        body: {
          path: '/jobs/',
          files: [{ name: 'part.nc', type: 'f', size: 12 }],
        },
      });
    });

    renderAppUI(
      <WatchDirectory
        state={{ modal: { params: {} } }}
        actions={{ closeModal: jest.fn(), updateModalParams: jest.fn(), loadFile: jest.fn() }}
      />
    );

    const treeItem = await screen.findByRole('treeitem', { name: /jobs/ });
    const toggle = treeItem.querySelector('[role="button"]');
    expect(toggle).not.toBeNull();

    fireEvent.click(toggle);

    expect(await screen.findByText('part.nc')).toBeInTheDocument();
    expect(mockGetFiles).toHaveBeenCalledWith({ path: 'jobs' });
  });

  test('shows an error and retries the root query', async () => {
    mockGetFiles.mockReset();
    mockGetFiles
      .mockRejectedValueOnce(new Error('watch directory unavailable'))
      .mockResolvedValueOnce({ body: { path: '', files: [] } });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      renderAppUI(
        <WatchDirectory
          state={{ modal: { params: {} } }}
          actions={{ closeModal: jest.fn(), updateModalParams: jest.fn(), loadFile: jest.fn() }}
        />
      );

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load directory');
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('Empty directory')).toBeInTheDocument();
      expect(mockGetFiles).toHaveBeenCalledTimes(2);
      expect(mockGetFiles).toHaveBeenLastCalledWith({ path: '' });
      expect(consoleError.mock.calls.some(([error]) => (
        error instanceof Error && error.message === 'watch directory unavailable'
      ))).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
  });

  test('keeps Load disabled and closes without loading when Cancel is clicked', async () => {
    mockGetFiles.mockReset();
    mockGetFiles.mockResolvedValue({
      body: {
        path: '',
        files: [{ name: 'part.nc', type: 'f', size: 12 }],
      },
    });
    const actions = {
      closeModal: jest.fn(),
      updateModalParams: jest.fn(),
      loadFile: jest.fn(),
    };

    renderAppUI(<WatchDirectory state={{ modal: { params: {} } }} actions={actions} />);

    expect(await screen.findByText('part.nc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load G-code' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(actions.closeModal).toHaveBeenCalledTimes(1);
    expect(actions.loadFile).not.toHaveBeenCalled();
  });

  test('loads the selected file with its normalized path before closing', async () => {
    mockGetFiles.mockReset();
    mockGetFiles.mockImplementation(({ path: directoryPath }) => {
      if (!directoryPath) {
        return Promise.resolve({
          body: {
            path: '',
            files: [{ name: 'jobs', type: 'd' }],
          },
        });
      }
      return Promise.resolve({
        body: {
          path: '/jobs/',
          files: [{ name: '../jobs/part.nc', type: 'f', size: 12 }],
        },
      });
    });
    const actions = {
      closeModal: jest.fn(),
      updateModalParams: jest.fn(),
      loadFile: jest.fn(),
    };

    renderAppUI(<WatchDirectory state={{ modal: { params: {} } }} actions={actions} />);

    const directoryItem = await screen.findByRole('treeitem', { name: /jobs/ });
    fireEvent.click(directoryItem.querySelector('[role="button"]'));

    const file = await screen.findByText('../jobs/part.nc');
    fireEvent.click(file);
    const loadButton = screen.getByRole('button', { name: 'Load G-code' });
    expect(loadButton).toBeEnabled();

    fireEvent.click(loadButton);

    expect(actions.loadFile).toHaveBeenCalledWith('jobs/part.nc');
    expect(actions.closeModal).toHaveBeenCalledTimes(1);
    expect(actions.loadFile.mock.invocationCallOrder[0])
      .toBeLessThan(actions.closeModal.mock.invocationCallOrder[0]);
  });

  test('keeps deferred directory responses isolated by normalized query key', async () => {
    const pending = new Map();
    mockGetFiles.mockReset();
    mockGetFiles.mockImplementation(({ path: directoryPath }) => {
      if (!directoryPath) {
        return Promise.resolve({
          body: {
            path: '',
            files: [
              { name: 'alpha', type: 'd' },
              { name: 'beta', type: 'd' },
            ],
          },
        });
      }
      return new Promise((resolve) => {
        pending.set(directoryPath, resolve);
      });
    });

    renderAppUI(
      <WatchDirectory
        state={{ modal: { params: {} } }}
        actions={{ closeModal: jest.fn(), updateModalParams: jest.fn(), loadFile: jest.fn() }}
      />
    );

    const alphaItem = await screen.findByRole('treeitem', { name: /alpha/ });
    const betaItem = await screen.findByRole('treeitem', { name: /beta/ });
    fireEvent.click(alphaItem.querySelector('[role="button"]'));
    await waitFor(() => expect(pending.has('alpha')).toBe(true));
    fireEvent.click(betaItem.querySelector('[role="button"]'));
    await waitFor(() => expect(pending.has('beta')).toBe(true));

    pending.get('beta')({
      body: {
        path: '/beta/',
        files: [{ name: 'beta.nc', type: 'f' }],
      },
    });
    expect(await within(betaItem).findByText('beta.nc')).toBeInTheDocument();
    expect(within(alphaItem).queryByText('beta.nc')).toBeNull();

    pending.get('alpha')({
      body: {
        path: '/alpha/',
        files: [{ name: 'alpha.nc', type: 'f' }],
      },
    });
    expect(await within(alphaItem).findByText('alpha.nc')).toBeInTheDocument();
    expect(within(betaItem).queryByText('alpha.nc')).toBeNull();
  });
});
