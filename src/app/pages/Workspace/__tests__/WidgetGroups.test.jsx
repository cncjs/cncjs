import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import unset from 'lodash/unset';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

let mockState;
let mockListeners;
let mockSortables;
let mockPubsubSubscriptions;
let mockPortalContent;
let mockPortalClose;
let mockConfig;
let mockController;
let mockWidgetRegistry;

const createState = () => ({
  workspace: {
    container: {
      default: { widgets: ['visualizer'] },
      primary: { widgets: ['axes'], show: true },
      secondary: { widgets: ['grbl'], show: true },
    },
  },
  widgets: {
    axes: { minimized: false, axes: ['x', 'y'] },
    grbl: { minimized: false },
    visualizer: { minimized: false },
  },
});

const notifyConfigListeners = () => {
  mockListeners.forEach(listener => listener());
};

mockConfig = {
  get: jest.fn((path, defaultValue) => {
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
      mockListeners.add(listener);
    }
  }),
  off: jest.fn((event, listener) => {
    if (event === 'change') {
      mockListeners.delete(listener);
    }
  }),
  read: () => mockState,
};

mockController = {
  availableControllers: ['Grbl'],
  connected: true,
  workflow: { state: 'idle' },
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

mockWidgetRegistry = {
  axes: {},
  grbl: {},
  visualizer: {},
};

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: mockConfig,
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
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
  default: jest.fn(callback => {
    mockPortalClose = jest.fn();
    mockPortalContent = callback({ onClose: mockPortalClose });
  }),
}));

jest.mock('@app/api', () => ({
  __esModule: true,
  default: { loadGCode: jest.fn() },
}));

jest.mock('@app/queries/gcode', () => ({
  useLoadGCodeMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('pubsub-js', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn((topic, handler) => {
      mockPubsubSubscriptions[topic] = handler;
      return topic;
    }),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
  },
}));

jest.mock('react-sortablejs', () => {
  const React = require('react');

  return props => {
    const name = props.options.group.name;
    mockSortables[name] = props;
    return React.createElement(
      'div',
      { 'data-testid': `sortable-${name}` },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': `sort-${name}`,
          onClick: () => props.onChange(name === 'primary' ? ['axes'] : ['grbl']),
        },
        `sort ${name}`
      ),
      props.children
    );
  };
});

jest.mock('../widgetRegistry', () => {
  const React = require('react');
  const WidgetBody = ({
    widgetId,
    view,
    onFork,
    onRemove,
  }) => React.createElement(
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

  mockWidgetRegistry = {
    axes: { Component: WidgetBody, hasFrame: true },
    grbl: { Component: WidgetBody, hasFrame: true, controllerType: 'Grbl' },
    marlin: { Component: WidgetBody, hasFrame: true, controllerType: 'Marlin' },
    smoothie: { Component: WidgetBody, hasFrame: true, controllerType: 'Smoothie' },
    tinyg: { Component: WidgetBody, hasFrame: true, controllerType: 'TinyG' },
    visualizer: { Component: WidgetBody, hasFrame: false },
  };

  return { WIDGET_REGISTRY: mockWidgetRegistry };
});

jest.mock('@tonic-ui/react', () => {
  const React = require('react');
  const Primitive = ({ as: Tag = 'div', children, ...props }) => React.createElement(Tag, props, children);
  const Modal = ({
    autoFocus,
    children,
    closeOnEsc,
    closeOnInteractOutside,
    ensureFocus,
    isClosable,
    isOpen,
    ...props
  }) => isOpen && React.createElement(
    'section',
    {
      ...props,
      'data-testid': 'widget-action-modal',
      'data-auto-focus': String(autoFocus),
      'data-close-on-esc': String(closeOnEsc),
      'data-close-on-interact-outside': String(closeOnInteractOutside),
      'data-ensure-focus': String(ensureFocus),
      'data-is-closable': String(isClosable),
    },
    children
  );
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

const PrimaryWidgets = require('../PrimaryWidgets').default;
const SecondaryWidgets = require('../SecondaryWidgets').default;
const { WorkspaceLayoutProvider } = require('../WorkspaceLayoutProvider');
const { useWidgetGroup } = require('../useWidgetGroup');
const { useWorkspaceLayout } = require('../useWorkspaceLayout');
const { WorkspaceWithLayout } = require('../Workspace');

const FullscreenHarness = () => {
  const { ids, setWidgetIds } = useWidgetGroup('primary');
  const { getWidgetView, setWidgetView } = useWorkspaceLayout();
  const view = getWidgetView('axes');

  return (
    <>
      <output data-testid="fullscreen-layout">{view}</output>
      <button
        type="button"
        onClick={() => setWidgetView('axes', view === 'fullscreen' ? 'normal' : 'fullscreen')}
      >
        Toggle fullscreen
      </button>
      <button
        type="button"
        onClick={() => setWidgetIds(ids.filter(id => id !== 'axes'))}
      >
        Remove axes
      </button>
    </>
  );
};

const groupProps = () => ({
  onForkWidget: jest.fn(),
  onRemoveWidget: jest.fn(),
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
});

const renderGroups = () => render(
  <WorkspaceLayoutProvider config={mockConfig}>
    <PrimaryWidgets {...groupProps()} />
    <SecondaryWidgets {...groupProps()} />
  </WorkspaceLayoutProvider>
);

const reset = () => {
  cleanup();
  mockState = createState();
  mockListeners = new Set();
  mockSortables = {};
  mockPubsubSubscriptions = {};
  mockPortalContent = null;
  mockController.availableControllers = ['Grbl'];
  jest.clearAllMocks();
};

beforeEach(reset);
afterEach(cleanup);

test('group containers persist current sortable order and retain cross-column options', () => {
  renderGroups();

  expect(mockPubsubSubscriptions.updatePrimaryWidgets).toEqual(expect.any(Function));
  expect(mockPubsubSubscriptions.updateSecondaryWidgets).toEqual(expect.any(Function));
  expect(mockSortables.primary.options.group).toEqual({
    name: 'primary',
    pull: true,
    put: ['secondary'],
  });
  expect(mockSortables.secondary.options.group).toEqual({
    name: 'secondary',
    pull: true,
    put: ['primary'],
  });
  expect(mockSortables.primary.options).toMatchObject({
    handle: '.sortable-handle',
    filter: '.sortable-filter',
    dataIdAttr: 'data-widget-id',
  });
  expect(mockSortables.secondary.options).toMatchObject({
    handle: '.sortable-handle',
    filter: '.sortable-filter',
    dataIdAttr: 'data-widget-id',
  });
  expect(screen.getByTestId('host-axes').parentElement).toHaveAttribute(
    'data-widget-id',
    'axes'
  );
  expect(screen.getByTestId('host-grbl').parentElement).toHaveAttribute(
    'data-widget-id',
    'grbl'
  );

  fireEvent.click(screen.getByTestId('sort-primary'));
  fireEvent.click(screen.getByTestId('sort-secondary'));

  expect(mockConfig.set).toHaveBeenCalledWith(
    ['workspace', 'container', 'primary', 'widgets'],
    ['axes']
  );
  expect(mockConfig.set).toHaveBeenCalledWith(
    ['workspace', 'container', 'secondary', 'widgets'],
    ['grbl']
  );

  act(() => {
    mockPubsubSubscriptions.updatePrimaryWidgets('updatePrimaryWidgets', ['grbl']);
    mockPubsubSubscriptions.updateSecondaryWidgets('updateSecondaryWidgets', ['axes']);
  });
  expect(mockConfig.read().workspace.container.primary.widgets).toEqual(['grbl']);
  expect(mockConfig.read().workspace.container.secondary.widgets).toEqual(['axes']);
  expect(mockConfig.set).toHaveBeenLastCalledWith(
    ['workspace', 'container', 'secondary', 'widgets'],
    ['axes']
  );
  expect(screen.getByTestId('sortable-primary').querySelector('[data-widget-id="grbl"]'))
    .toBeInTheDocument();
  expect(screen.getByTestId('sortable-secondary').querySelector('[data-widget-id="axes"]'))
    .toBeInTheDocument();
});

test('group registry filtering hides unavailable controller widgets', () => {
  mockController.availableControllers = [];
  renderGroups();

  expect(screen.queryByTestId('host-grbl')).not.toBeInTheDocument();
  expect(screen.getByTestId('host-axes')).toBeInTheDocument();
});

test('primary and secondary reorder preserves ids and order across a move', () => {
  mockState.workspace.container.primary.widgets = ['axes', 'grbl'];
  mockState.workspace.container.secondary.widgets = [];
  renderGroups();

  act(() => {
    mockSortables.primary.onChange(['grbl', 'axes']);
  });

  expect(mockConfig.read().workspace.container.primary.widgets).toEqual(['grbl', 'axes']);
  expect(
    Array.from(
      screen.getByTestId('sortable-primary').querySelectorAll('[data-widget-id]')
    ).map(element => element.getAttribute('data-widget-id'))
  ).toEqual(['grbl', 'axes']);

  act(() => {
    mockPubsubSubscriptions.updatePrimaryWidgets('updatePrimaryWidgets', ['grbl']);
    mockPubsubSubscriptions.updateSecondaryWidgets('updateSecondaryWidgets', ['axes']);
  });

  expect(mockConfig.read().workspace.container.primary.widgets).toEqual(['grbl']);
  expect(mockConfig.read().workspace.container.secondary.widgets).toEqual(['axes']);
  expect(screen.getByTestId('sortable-primary').querySelector('[data-widget-id="grbl"]'))
    .toBeInTheDocument();
  expect(screen.getByTestId('sortable-secondary').querySelector('[data-widget-id="axes"]'))
    .toBeInTheDocument();
});

test.each([
  ['Grbl', 'grbl'],
  ['Marlin', 'marlin'],
  ['Smoothie', 'smoothie'],
  ['TinyG', 'tinyg'],
])('controller filtering uses the same ids for render and bulk actions: %s', (
  controllerType,
  visibleControllerWidget
) => {
  const controllerWidgets = ['grbl', 'marlin', 'smoothie', 'tinyg'];
  mockController.availableControllers = [controllerType];
  mockState.workspace.container.primary.widgets = ['axes', ...controllerWidgets];
  mockState.workspace.container.secondary.widgets = [];
  controllerWidgets.forEach(widgetId => {
    mockState.widgets[widgetId] = {
      minimized: false,
      nativeSetting: `${widgetId}-native`,
    };
  });

  const beforeHiddenSettings = controllerWidgets.reduce((settings, widgetId) => {
    if (widgetId !== visibleControllerWidget) {
      settings[widgetId] = mockState.widgets[widgetId];
    }
    return settings;
  }, {});

  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <WorkspaceWithLayout
        isConnected={true}
        location={{ pathname: '/workspace' }}
      />
    </WorkspaceLayoutProvider>
  );

  expect(screen.getByTestId('host-axes')).toBeInTheDocument();
  expect(screen.getByTestId(`host-${visibleControllerWidget}`)).toBeInTheDocument();
  controllerWidgets
    .filter(widgetId => widgetId !== visibleControllerWidget)
    .forEach(widgetId => {
      expect(screen.queryByTestId(`host-${widgetId}`)).not.toBeInTheDocument();
    });

  fireEvent.click(screen.getByRole('button', { name: 'Collapse all left panel widgets' }));

  expect(mockConfig.read().widgets.axes.minimized).toBe(true);
  expect(mockConfig.read().widgets[visibleControllerWidget].minimized).toBe(true);
  Object.entries(beforeHiddenSettings).forEach(([widgetId, settings]) => {
    expect(mockConfig.read().widgets[widgetId]).toEqual(settings);
  });
});

test('fork and remove persist settings while native widget settings remain untouched', () => {
  const props = groupProps();
  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <PrimaryWidgets {...props} />
    </WorkspaceLayoutProvider>
  );

  fireEvent.click(screen.getByTestId('fork-axes'));
  const forkModal = render(mockPortalContent);
  expect(screen.getByTestId('widget-action-modal')).toHaveAttribute('data-auto-focus', 'true');
  expect(screen.getByTestId('widget-action-modal')).toHaveAttribute('data-ensure-focus', 'true');
  expect(screen.getByTestId('widget-action-modal')).toHaveAttribute('data-is-closable', 'true');
  expect(screen.getByTestId('widget-action-modal')).toHaveAttribute('data-close-on-esc', 'false');
  expect(screen.getByTestId('widget-action-modal')).toHaveAttribute('data-close-on-interact-outside', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(mockPortalClose).toHaveBeenCalledTimes(1);
  forkModal.unmount();

  const forkedWidgetId = mockConfig.read().workspace.container.primary.widgets[1];
  expect(forkedWidgetId).toMatch(/^axes:/);
  expect(mockConfig.read().widgets[forkedWidgetId]).toEqual(mockConfig.read().widgets.axes);
  expect(mockConfig.read().widgets[forkedWidgetId]).not.toBe(mockConfig.read().widgets.axes);
  expect(props.onForkWidget).toHaveBeenCalledWith('axes');

  fireEvent.click(screen.getByTestId(`remove-${forkedWidgetId}`));
  const removeModal = render(mockPortalContent);
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  removeModal.unmount();

  expect(mockConfig.read().workspace.container.primary.widgets).toEqual(['axes']);
  expect(mockConfig.read().widgets[forkedWidgetId]).toBeUndefined();
  expect(mockConfig.read().widgets.axes).toEqual({ minimized: false, axes: ['x', 'y'] });
  expect(props.onRemoveWidget).toHaveBeenCalledWith(forkedWidgetId);
});

test('continuous fork and remove keeps callback ids and native settings stable', () => {
  const props = groupProps();
  const nativeSettings = mockConfig.read().widgets.axes;
  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <PrimaryWidgets {...props} />
    </WorkspaceLayoutProvider>
  );

  const forkedWidgetIds = [];
  [0, 1].forEach(() => {
    fireEvent.click(screen.getByTestId('fork-axes'));
    const forkModal = render(mockPortalContent);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    forkModal.unmount();

    const primaryWidgets = mockConfig.read().workspace.container.primary.widgets;
    const forkedWidgetId = primaryWidgets[primaryWidgets.length - 1];
    forkedWidgetIds.push(forkedWidgetId);
    expect(mockConfig.read().widgets[forkedWidgetId]).toEqual(nativeSettings);
    expect(mockConfig.read().widgets[forkedWidgetId]).not.toBe(nativeSettings);
    expect(props.onForkWidget).toHaveBeenLastCalledWith('axes');

    fireEvent.click(screen.getByTestId(`remove-${forkedWidgetId}`));
    const removeModal = render(mockPortalContent);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    removeModal.unmount();

    expect(mockConfig.read().workspace.container.primary.widgets).toEqual(['axes']);
    expect(mockConfig.read().widgets[forkedWidgetId]).toBeUndefined();
    expect(mockConfig.read().widgets.axes).toEqual(nativeSettings);
  });

  expect(props.onForkWidget).toHaveBeenCalledTimes(2);
  expect(props.onForkWidget).toHaveBeenNthCalledWith(1, 'axes');
  expect(props.onForkWidget).toHaveBeenNthCalledWith(2, 'axes');
  expect(props.onRemoveWidget).toHaveBeenCalledTimes(2);
  expect(props.onRemoveWidget).toHaveBeenNthCalledWith(1, forkedWidgetIds[0]);
  expect(props.onRemoveWidget).toHaveBeenNthCalledWith(2, forkedWidgetIds[1]);
});

test('Workspace toolbar drives the real group host and ignores visualizer layout', () => {
  mockState.workspace.container.primary.widgets = ['axes', 'visualizer'];
  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <WorkspaceWithLayout
        isConnected={true}
        location={{ pathname: '/workspace' }}
      />
    </WorkspaceLayoutProvider>
  );

  expect(screen.getByTestId('host-axes')).toHaveAttribute(
    'data-layout',
    'normal'
  );
  screen.getAllByTestId('host-visualizer').forEach(host => {
    expect(host).not.toHaveAttribute('data-layout');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Collapse all left panel widgets' }));

  expect(mockConfig.update).toHaveBeenCalledTimes(1);
  expect(mockConfig.read().widgets.axes.minimized).toBe(true);
  expect(mockConfig.read().widgets.visualizer.minimized).toBe(false);
  expect(screen.getByTestId('host-axes')).toHaveAttribute(
    'data-layout',
    'collapsed'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Expand all left panel widgets' }));
  expect(mockConfig.read().widgets.axes.minimized).toBe(false);
});

test('removing an active widget clears its transient fullscreen entry', () => {
  render(
    <WorkspaceLayoutProvider config={mockConfig}>
      <FullscreenHarness />
    </WorkspaceLayoutProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }));
  expect(screen.getByTestId('fullscreen-layout')).toHaveTextContent(
    'fullscreen'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Remove axes' }));
  expect(screen.getByTestId('fullscreen-layout')).toHaveTextContent(
    'normal'
  );
});
