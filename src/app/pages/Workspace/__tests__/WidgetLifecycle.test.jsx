import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import unset from 'lodash/unset';
import React, { StrictMode, useRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';

let mockState;
let mockConfigListeners;
let mockConfig;
let mockConfigChangeCount;
let mockControllerListeners;
let mockController;
let mockPubSubSubscriptions;
let mockPubSub;
let mockSortables;

const createState = () => ({
  workspace: {
    container: {
      default: { widgets: ['visualizer'] },
      primary: { widgets: ['axes'], show: true },
      secondary: { widgets: [], show: true },
    },
  },
  widgets: {
    axes: { minimized: false, axes: ['x', 'y'] },
    visualizer: { minimized: false },
  },
});

const notifyConfigListeners = () => {
  mockConfigChangeCount += 1;
  mockConfigListeners.forEach(listener => listener());
};

mockConfig = {
  get: jest.fn((path, defaultValue) => {
    if (path === undefined) {
      return mockState;
    }
    const value = get(mockState, path);
    return value === undefined ? defaultValue : value;
  }),
  set: jest.fn((path, value) => {
    const nextState = cloneDeep(mockState);
    set(nextState, path, value);
    if (!isEqual(nextState, mockState)) {
      mockState = nextState;
      notifyConfigListeners();
    }
    return mockState;
  }),
  unset: jest.fn(path => {
    const nextState = cloneDeep(mockState);
    unset(nextState, path);
    if (!isEqual(nextState, mockState)) {
      mockState = nextState;
      notifyConfigListeners();
    }
    return mockState;
  }),
  update: jest.fn((path, updater) => {
    const nextState = cloneDeep(mockState);
    set(nextState, path, updater(get(mockState, path)));
    if (!isEqual(nextState, mockState)) {
      mockState = nextState;
      notifyConfigListeners();
    }
    return mockState;
  }),
  on: jest.fn((event, listener) => {
    if (event === 'change') {
      mockConfigListeners.add(listener);
    }
  }),
  off: jest.fn((event, listener) => {
    if (event === 'change') {
      mockConfigListeners.delete(listener);
    }
  }),
  emit: jest.fn(() => notifyConfigListeners()),
  read: () => mockState,
  replaceState: (nextState, emit = true) => {
    mockState = nextState;
    if (emit) {
      notifyConfigListeners();
    }
  },
  listenerCount: () => mockConfigListeners.size,
};

mockController = {
  availableControllers: ['Grbl'],
  connected: true,
  workflow: { state: 'idle' },
  addListener: jest.fn((event, listener) => {
    if (!mockControllerListeners[event]) {
      mockControllerListeners[event] = new Set();
    }
    mockControllerListeners[event].add(listener);
  }),
  removeListener: jest.fn((event, listener) => {
    mockControllerListeners[event]?.delete(listener);
  }),
  emit: (event, ...args) => {
    mockControllerListeners[event]?.forEach(listener => listener(...args));
  },
  listenerCount: () => Object.values(mockControllerListeners)
    .reduce((count, listeners) => count + listeners.size, 0),
};

mockPubSub = {
  subscribe: jest.fn((topic, handler) => {
    const token = Symbol(topic);
    mockPubSubSubscriptions.set(token, { topic, handler });
    return token;
  }),
  unsubscribe: jest.fn(token => {
    mockPubSubSubscriptions.delete(token);
  }),
  publish: jest.fn((topic, ...args) => {
    mockPubSubSubscriptions.forEach(subscription => {
      if (subscription.topic === topic) {
        subscription.handler(topic, ...args);
      }
    });
  }),
  activeCount: () => mockPubSubSubscriptions.size,
};

mockSortables = {};

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: mockConfig,
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('pubsub-js', () => ({
  __esModule: true,
  default: mockPubSub,
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/lib/log', () => ({
  __esModule: true,
  default: { error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@app/lib/portal', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@app/api', () => ({
  __esModule: true,
  default: { loadGCode: jest.fn() },
}));

jest.mock('@app/queries/gcode', () => ({
  useLoadGCodeMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('react-sortablejs', () => {
  const React = require('react');

  return props => {
    const name = props.options.group.name;
    mockSortables[name] = props;
    return React.createElement(
      'div',
      { 'data-testid': `sortable-${name}` },
      props.children
    );
  };
});

jest.mock('../widgetRegistry', () => {
  const React = require('react');
  const WidgetBody = ({ widgetId, view, onFork, onRemove }) => React.createElement(
    'section',
    {
      'data-testid': `host-${widgetId}`,
      'data-layout': typeof view === 'string' ? view : null,
    },
    React.createElement(
      'button',
      { type: 'button', 'data-testid': `fork-${widgetId}`, onClick: onFork },
      'Fork'
    ),
    React.createElement(
      'button',
      { type: 'button', 'data-testid': `remove-${widgetId}`, onClick: onRemove },
      'Remove'
    )
  );

  return {
    WIDGET_REGISTRY: {
      axes: { Component: WidgetBody, hasFrame: true },
      grbl: { Component: WidgetBody, hasFrame: true, controllerType: 'Grbl' },
      visualizer: { Component: WidgetBody, hasFrame: false },
    },
  };
});

jest.mock('@tonic-ui/react', () => {
  const React = require('react');
  const Primitive = ({ as: Tag = 'div', children, ...props }) => React.createElement(Tag, props, children);
  const Modal = ({ children, isOpen }) => isOpen && React.createElement('section', null, children);
  const Button = ({ children, ...props }) => React.createElement(
    'button',
    { type: 'button', ...props },
    children
  );
  return {
    useColorStyle: () => [{
      background: { secondary: '#f6f7f8' },
      color: { primary: '#222' },
      divider: '#ccc',
    }],
    Box: Primitive,
    Button,
    ButtonGroup: Primitive,
    Flex: Primitive,
    Modal,
    ModalBody: Primitive,
    ModalContent: Primitive,
    ModalFooter: Primitive,
    ModalHeader: Primitive,
    ModalOverlay: Primitive,
    Space: Primitive,
    Text: Primitive,
  };
});

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

jest.mock('react-dropzone', () => {
  const Dropzone = ({ children }) => children({
    getRootProps: () => ({}),
    isDragActive: false,
  });
  return { __esModule: true, default: Dropzone };
});

jest.mock('../widget-manager', () => ({
  getInactiveWidgets: jest.fn(() => []),
  show: jest.fn(),
}));

jest.mock('../modals/FeederPaused', () => () => null);
jest.mock('../modals/FeederWait', () => () => null);
jest.mock('../modals/ServerDisconnected', () => () => null);

const { hydrateConfig } = require('@app/store/config/hydration');
const { WorkspaceLayoutProvider } = require('../WorkspaceLayoutProvider');
const { useWorkspaceLayout } = require('../useWorkspaceLayout');
const { WorkspaceWithLayout } = require('../Workspace');

const SnapshotProbe = () => {
  const renders = useRef(0);
  renders.current += 1;
  const { getWidgetView } = useWorkspaceLayout();

  return (
    <output data-testid="snapshot-probe">
      {`${renders.current}:${getWidgetView('axes')}`}
    </output>
  );
};

const renderLayout = () => render(
  <WorkspaceLayoutProvider config={mockConfig}>
    <SnapshotProbe />
  </WorkspaceLayoutProvider>
);

const reset = () => {
  cleanup();
  mockState = createState();
  mockConfigListeners = new Set();
  mockConfigChangeCount = 0;
  mockControllerListeners = {};
  mockPubSubSubscriptions = new Map();
  mockSortables = {};
  jest.clearAllMocks();
};

beforeEach(reset);
afterEach(cleanup);

test('config domain bursts preserve collapsed snapshot identity and do not write back', () => {
  mockState.widgets.axes.minimized = true;
  renderLayout();

  expect(screen.getByTestId('snapshot-probe')).toHaveTextContent('1:collapsed');
  const persist = jest.fn();
  mockConfig.on('change', persist);

  act(() => {
    mockConfig.set(['widgets', 'axes', 'axes'], ['x', 'y', 'z']);
    mockConfig.set(['widgets', 'axes', 'feedRate'], 120);
    mockConfig.set(['widgets', 'visualizer', 'theme'], 'dark');
  });

  expect(screen.getByTestId('snapshot-probe')).toHaveTextContent('1:collapsed');
  expect(mockConfig.set).toHaveBeenCalledTimes(3);
  expect(mockConfig.update).not.toHaveBeenCalled();
  expect(persist).toHaveBeenCalledTimes(3);
  mockConfig.off('change', persist);
});

test('bulk view action changes config once and is idempotent', () => {
  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <WorkspaceWithLayout
        isConnected={true}
        location={{ pathname: '/workspace' }}
      />
    </WorkspaceLayoutProvider>
  );

  const collapse = screen.getByRole('button', { name: 'Collapse all left panel widgets' });

  act(() => {
    collapse.click();
  });
  const firstCollapseChangeCount = mockConfigChangeCount;

  act(() => {
    collapse.click();
  });
  const repeatedCollapseChangeCount = mockConfigChangeCount;

  expect(mockConfig.read().widgets.axes.minimized).toBe(true);
  expect(mockConfig.read().widgets.axes.axes).toEqual(['x', 'y']);
  expect(firstCollapseChangeCount).toBe(1);
  expect(repeatedCollapseChangeCount).toBe(firstCollapseChangeCount);

  const expand = screen.getByRole('button', { name: 'Expand all left panel widgets' });
  act(() => {
    expand.click();
  });
  const firstExpandChangeCount = mockConfigChangeCount;

  act(() => {
    expand.click();
  });

  expect(mockConfig.read().widgets.axes.minimized).toBe(false);
  expect(firstExpandChangeCount).toBe(2);
  expect(mockConfigChangeCount).toBe(firstExpandChangeCount);
});

test('route changes publish resize and restore horizontal overflow state', () => {
  jest.useFakeTimers();
  mockState.workspace.container.secondary.show = false;
  document.body.style.overflowX = '';
  const renderAt = pathname => (
    <WorkspaceLayoutProvider config={mockConfig}>
      <WorkspaceWithLayout
        isConnected={true}
        location={{ pathname }}
      />
    </WorkspaceLayoutProvider>
  );
  let view;
  try {
    view = render(renderAt('/administration/machine-profiles'));

    act(() => {
      jest.runOnlyPendingTimers();
    });
    mockPubSub.publish.mockClear();

    view.rerender(renderAt('/workspace'));

    expect(mockPubSub.publish).toHaveBeenCalledWith('resize');
    expect(document.body.style.overflowX).toBe('hidden');
    mockPubSub.publish.mockClear();

    view.rerender(renderAt('/administration/machine-profiles'));

    expect(mockPubSub.publish).toHaveBeenCalledWith('resize');
    expect(document.body.style.overflowX).toBe('');
  } finally {
    view?.unmount();
    document.body.style.overflowX = '';
    jest.useRealTimers();
  }
});

test('restore after async hydration shows saved state and corrupt data keeps it', async () => {
  let resolveRead;
  const savedState = {
    ...createState(),
    widgets: {
      axes: { minimized: true, axes: ['x', 'y'] },
      visualizer: { minimized: false },
    },
  };
  const hydrationConfig = {
    get: mockConfig.get,
    emit: jest.fn(() => mockConfig.emit('change')),
    get state() {
      return mockConfig.read();
    },
    set state(nextState) {
      mockConfig.replaceState(nextState, false);
    },
  };
  const read = jest.fn(() => new Promise(resolve => {
    resolveRead = resolve;
  }));

  renderLayout();
  expect(screen.getByTestId('snapshot-probe')).toHaveTextContent('1:normal');

  const hydration = hydrateConfig({
    config: hydrationConfig,
    read,
    normalize: state => state,
    migrate: jest.fn(),
  });

  await act(async () => {
    resolveRead(JSON.stringify({ state: savedState }));
    await hydration;
  });
  expect(screen.getByTestId('snapshot-probe')).toHaveTextContent('2:collapsed');

  const onError = jest.fn();
  await expect(hydrateConfig({
    config: hydrationConfig,
    read: () => Promise.resolve('{corrupt'),
    normalize: state => state,
    migrate: jest.fn(),
    onError,
  })).resolves.toBe(false);

  expect(onError).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('snapshot-probe')).toHaveTextContent('2:collapsed');
  expect(mockConfig.read().widgets.axes.minimized).toBe(true);
});

test('mount, unmount, and remount leave one active listener per subscription', () => {
  const renderWorkspace = () => render(
    <StrictMode>
      <WorkspaceLayoutProvider config={mockConfig}>
        <WorkspaceWithLayout
          isConnected={true}
          location={{ pathname: '/workspace' }}
        />
      </WorkspaceLayoutProvider>
    </StrictMode>
  );

  const view = renderWorkspace();
  expect(mockConfig.listenerCount()).toBe(6);
  expect(mockController.listenerCount()).toBe(4);
  expect(mockPubSub.activeCount()).toBe(2);

  view.unmount();
  expect(mockConfig.listenerCount()).toBe(0);
  expect(mockController.listenerCount()).toBe(0);
  expect(mockPubSub.activeCount()).toBe(0);

  const remounted = renderWorkspace();
  expect(mockConfig.listenerCount()).toBe(6);
  expect(mockController.listenerCount()).toBe(4);
  expect(mockPubSub.activeCount()).toBe(2);

  mockConfig.set.mockClear();
  act(() => {
    mockPubSub.publish('updatePrimaryWidgets', ['axes']);
  });
  expect(mockConfig.set).toHaveBeenCalledTimes(1);

  remounted.unmount();
  expect(mockConfig.listenerCount()).toBe(0);
  expect(mockController.listenerCount()).toBe(0);
  expect(mockPubSub.activeCount()).toBe(0);
});
