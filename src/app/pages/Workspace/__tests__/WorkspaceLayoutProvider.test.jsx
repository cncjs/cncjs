import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceLayoutProvider } from '../WorkspaceLayoutProvider';
import { useWidgetGroup } from '../useWidgetGroup';
import { useWorkspaceLayout } from '../useWorkspaceLayout';

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../widgetRegistry', () => ({
  WIDGET_REGISTRY: {
    axes: { hasFrame: true },
    grbl: { hasFrame: true, controllerType: 'Grbl' },
    visualizer: { hasFrame: false },
  },
}));

const getPath = (state, path, defaultValue) => {
  const parts = Array.isArray(path) ? path : path.split('.');
  let value = state;
  parts.forEach(part => {
    value = value?.[part];
  });
  return value === undefined ? defaultValue : value;
};

const setPath = (state, path, value) => {
  const parts = Array.isArray(path) ? path : path.split('.');
  const next = { ...state };
  let cursor = next;
  parts.slice(0, -1).forEach(part => {
    cursor[part] = { ...cursor[part] };
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
  return next;
};

const createConfig = () => {
  let state = {
    widgets: {
      axes: { minimized: false, axes: ['x', 'y'] },
      'axes:fork-1': { minimized: false },
      visualizer: { minimized: true },
    },
    workspace: {
      container: {
        primary: { widgets: ['axes', 'visualizer'] },
      },
    },
  };
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());

  return {
    get: jest.fn((path, defaultValue) => getPath(state, path, defaultValue)),
    update: jest.fn((path, updater) => {
      const current = getPath(state, path, {});
      state = setPath(state, path, updater(current));
      notify();
    }),
    set: jest.fn((path, value) => {
      state = setPath(state, path, value);
      notify();
    }),
    on: jest.fn((event, listener) => {
      if (event === 'change') {
        listeners.add(listener);
      }
    }),
    off: jest.fn((event, listener) => {
      if (event === 'change') {
        listeners.delete(listener);
      }
    }),
    emit: notify,
    restoreDefault: jest.fn(() => {
      state = {
        ...state,
        widgets: {
          ...state.widgets,
          axes: { minimized: false, axes: ['x', 'y'] },
        },
      };
    }),
    read: () => state,
    listenerCount: () => listeners.size,
  };
};

const LayoutHarness = () => {
  const {
    getWidgetView,
    setWidgetView,
    setWidgetsCollapsed,
  } = useWorkspaceLayout();
  const axes = getWidgetView('axes');
  const fork = getWidgetView('axes:fork-1');
  const visualizer = getWidgetView('visualizer');

  return (
    <>
      <output data-testid="axes">{axes}</output>
      <output data-testid="fork">{fork}</output>
      <output data-testid="visualizer">{visualizer}</output>
      <button type="button" onClick={() => setWidgetsCollapsed(['axes', 'axes:fork-1'], true)}>Collapse</button>
      <button type="button" onClick={() => setWidgetsCollapsed(['visualizer', 'unknown'], true)}>Invalid</button>
      <button
        type="button"
        onClick={() => setWidgetView('axes', axes === 'fullscreen' ? 'normal' : 'fullscreen')}
      >
        Fullscreen
      </button>
    </>
  );
};

const GroupHarness = () => {
  const { ids, setWidgetIds } = useWidgetGroup('primary');
  return (
    <>
      <output data-testid="ids">{JSON.stringify(ids)}</output>
      <button type="button" onClick={() => setWidgetIds(['grbl'])}>Set ids</button>
    </>
  );
};

test('bulk actions update config once and ignore fullscreen/unsupported ids', () => {
  const config = createConfig();
  render(
    <WorkspaceLayoutProvider config={config}>
      <LayoutHarness />
    </WorkspaceLayoutProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

  expect(config.update).toHaveBeenCalledTimes(2);
  expect(config.read().widgets.axes.minimized).toBe(false);
  expect(config.read().widgets['axes:fork-1'].minimized).toBe(true);
  expect(screen.getByTestId('axes')).toHaveTextContent('fullscreen');

  fireEvent.click(screen.getByRole('button', { name: 'Invalid' }));
  expect(config.update).toHaveBeenCalledTimes(2);
  expect(config.read().widgets.visualizer.minimized).toBe(true);
});

test('fullscreen exit preserves the expanded state and config subscriptions clean up', () => {
  const config = createConfig();
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <LayoutHarness />
    </WorkspaceLayoutProvider>
  );

  expect(config.listenerCount()).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
  expect(screen.getByTestId('axes')).toHaveTextContent('normal');

  view.unmount();
  expect(config.listenerCount()).toBe(0);
});

test('provider remount reads restored config without polling', () => {
  const config = createConfig();
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <LayoutHarness />
    </WorkspaceLayoutProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(screen.getByTestId('axes')).toHaveTextContent('collapsed');

  view.unmount();
  config.restoreDefault();
  render(
    <WorkspaceLayoutProvider config={config}>
      <LayoutHarness />
    </WorkspaceLayoutProvider>
  );

  expect(config.restoreDefault).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('axes')).toHaveTextContent('normal');
});

test('group ids read and write the existing workspace config path', () => {
  const config = createConfig();
  render(
    <WorkspaceLayoutProvider config={config}>
      <GroupHarness />
    </WorkspaceLayoutProvider>
  );

  expect(screen.getByTestId('ids')).toHaveTextContent('["axes","visualizer"]');
  fireEvent.click(screen.getByRole('button', { name: 'Set ids' }));

  expect(config.set).toHaveBeenCalledWith(
    ['workspace', 'container', 'primary', 'widgets'],
    ['grbl']
  );
  expect(screen.getByTestId('ids')).toHaveTextContent('["grbl"]');
});

test('external config change updates the collapsed snapshot', () => {
  const config = createConfig();
  render(
    <WorkspaceLayoutProvider config={config}>
      <LayoutHarness />
    </WorkspaceLayoutProvider>
  );

  act(() => {
    config.set(['widgets', 'axes', 'minimized'], true);
  });
  expect(screen.getByTestId('axes')).toHaveTextContent('collapsed');
});
