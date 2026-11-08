/* eslint-disable max-classes-per-file */

export const FRAME_WIDGETS = [
  'autolevel', 'axes', 'connection', 'console', 'custom', 'gcode',
  'grbl', 'laser', 'macro', 'marlin', 'probe', 'smoothie',
  'spindle', 'tinyg', 'tool', 'webcam',
];

const mockBodyLifecycle = {
  mounts: Object.create(null),
  unmounts: Object.create(null),
};

const mockBody = name => {
  const React = require('react');

  return function MockWidgetBody() {
    React.useEffect(() => {
      mockBodyLifecycle.mounts[name] = (mockBodyLifecycle.mounts[name] || 0) + 1;
      return () => {
        mockBodyLifecycle.unmounts[name] = (mockBodyLifecycle.unmounts[name] || 0) + 1;
      };
    }, []);

    return React.createElement('div', { 'data-widget-body': name });
  };
};

const resetBodyLifecycle = () => {
  mockBodyLifecycle.mounts = Object.create(null);
  mockBodyLifecycle.unmounts = Object.create(null);
};

const mockController = {
  connection: { ident: 'contract-test' },
  type: 'Grbl',
  state: {
    status: {
      machineState: 'Idle',
      mpos: { x: 0, y: 0, z: 0 },
      wpos: { x: 0, y: 0, z: 0 },
    },
    parserstate: { modal: { units: 'G21', wcs: 'G54' } },
    sr: {
      mpos: { x: 0, y: 0, z: 0 },
      wpos: { x: 0, y: 0, z: 0 },
      modal: { units: 'G21' },
    },
    machineState: 1,
    modal: { units: 'G21', wcs: 'G54' },
  },
  settings: { '$13': 0 },
  workflow: { state: 'idle' },
  addListener: jest.fn(),
  removeListener: jest.fn(),
  command: jest.fn((name, params, callback) => {
    if (typeof callback === 'function') {
      callback(null, null);
    }
  }),
  write: jest.fn(),
  writeln: jest.fn(),
};

const mockApi = {
  loadGCode: jest.fn(),
  mdi: {
    fetch: jest.fn(() => Promise.resolve({ body: { records: [] } })),
  },
  getToolConfig: jest.fn(() => Promise.reject(new Error('tool read omitted'))),
  setToolConfig: jest.fn(),
};

const mockAxios = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@app/components/Widget', () => {
  const React = require('react');
  const Primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const Widget = ({ children, fullscreen, ...props }) => React.createElement(
    'section',
    {
      role: 'region',
      'data-fullscreen': String(Boolean(fullscreen)),
      ...props,
    },
    children
  );
  const Content = ({ children, ...props }) => React.createElement(
    'div',
    { 'data-widget-content': 'true', ...props },
    children
  );

  Widget.Header = Primitive;
  Widget.Content = Content;
  Widget.Sortable = Primitive;
  Widget.Title = Primitive;
  Widget.Controls = Primitive;
  return Widget;
});

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn() }),
  useQuery: () => ({ data: undefined, isFetching: false, refetch: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('@tonic-ui/react', () => {
  const React = require('react');
  const Primitive = ({ children, ...props }) => React.createElement('div', props, children);

  return {
    useColorStyle: () => [{
      background: { secondary: '#f6f7f8' },
      color: { primary: '#222' },
      divider: '#ccc',
    }],
    Space: ({ children }) => children || null,
    Box: Primitive,
    Button: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    Menu: Primitive,
    MenuButton: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    MenuItem: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    MenuList: Primitive,
    Dropdown: ({ renderToggle, items = [], renderItem, onChange }) => {
      const render = renderItem || ((item) => item?.content ?? item?.label ?? null);
      const toggle = (typeof renderToggle === 'function')
        ? renderToggle({ value: null, items, renderItem: render })
        : null;

      return React.createElement(
        'div',
        null,
        toggle,
        ...items
          .filter(item => item && item.type !== 'divider')
          .map((item, index) => React.createElement(
            'button',
            {
              key: item?.value ?? index,
              type: 'button',
              disabled: item?.props?.disabled,
              onClick: (event) => {
                item?.props?.onClick?.(event);
                onChange?.(item);
              },
            },
            render(item)
          ))
      );
    },
    DropdownButton: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    DropdownToggle: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
  };
});

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({ children }) => children);
jest.mock('@app/widgets/shared/WidgetConfigConsumer', () => ({ children }) => (
  children({ get: (_path, defaultValue) => defaultValue })
));
jest.mock('@app/widgets/shared/WidgetEventProvider', () => ({ children }) => (
  typeof children === 'function' ? children({ emit: jest.fn() }) : children
));
jest.mock('@app/widgets/shared/WidgetConfig', () => (class MockWidgetConfig {
  get(_path, defaultValue) {
    return defaultValue;
  }

  set() {}
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    unset: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));
jest.mock('@app/api', () => ({
  __esModule: true,
  default: mockApi,
}));
jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: mockAxios,
}));
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));
jest.mock('@app/lib/log', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@app/lib/portal', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@app/lib/combokeys', () => ({
  on: jest.fn(),
  removeListener: jest.fn(),
}));
jest.mock('react-redux', () => ({
  __esModule: true,
  connect: () => Component => {
    const React = require('react');
    return props => React.createElement(Component, { ...props, isReady: true });
  },
}));

jest.mock('@app/widgets/Visualizer', () => {
  const React = require('react');
  return function MockVisualizer({ widgetId }) {
    return React.createElement('div', {
      'data-testid': 'visualizer-body',
      'data-visualizer-body': widgetId,
    });
  };
});

jest.mock('@app/widgets/Autolevel/LandingView', () => mockBody('autolevel'));
jest.mock('@app/widgets/Autolevel/SetupProbeView', () => mockBody('autolevel'));
jest.mock('@app/widgets/Autolevel/ApplyView', () => mockBody('autolevel'));
jest.mock('@app/widgets/Autolevel/StartProbeModal', () => mockBody('autolevel'));
jest.mock('@app/widgets/Autolevel/StopProbeModal', () => mockBody('autolevel'));
jest.mock('@app/widgets/Autolevel/TestProbeModal', () => mockBody('autolevel'));
jest.mock('@app/widgets/Axes/Axes', () => mockBody('axes'));
jest.mock('@app/widgets/Axes/KeypadOverlay', () => mockBody('axes'));
jest.mock('@app/widgets/Axes/Settings', () => mockBody('axes'));
jest.mock('@app/widgets/Axes/ShuttleControl', () => {
  class MockShuttleControl {
    clear() {}
    on() {}
    removeAllListeners() {}
  }
  return MockShuttleControl;
});
jest.mock('@app/widgets/Connection/Connection', () => mockBody('connection'));
jest.mock('@app/widgets/Console/Console', () => mockBody('console'));
jest.mock('@app/widgets/Custom/Custom', () => mockBody('custom'));
jest.mock('@app/widgets/Custom/modals/SettingsModal', () => mockBody('custom'));
jest.mock('@app/widgets/GCode/GCodeStats', () => mockBody('gcode'));
jest.mock('@app/widgets/Grbl/QueueReports', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/StatusReports', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/ModalGroups', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/FeedOverride', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/SpindleOverride', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/RapidOverride', () => mockBody('grbl'));
jest.mock('@app/widgets/Grbl/modals/ControllerModal', () => mockBody('grbl'));
jest.mock('@app/widgets/Laser/LaserIntensityOverride', () => mockBody('laser'));
jest.mock('@app/widgets/Laser/LaserTest', () => mockBody('laser'));
jest.mock('@app/widgets/Macro/Macro', () => mockBody('macro'));
jest.mock('@app/widgets/Marlin/Marlin', () => mockBody('marlin'));
jest.mock('@app/widgets/Marlin/Controller', () => mockBody('marlin'));
jest.mock('@app/widgets/Probe/Probe', () => mockBody('probe'));
jest.mock('@app/widgets/Smoothie/Smoothie', () => mockBody('smoothie'));
jest.mock('@app/widgets/Smoothie/Controller', () => mockBody('smoothie'));
jest.mock('@app/widgets/Spindle/Spindle', () => mockBody('spindle'));
jest.mock('@app/widgets/TinyG/TinyG', () => mockBody('tinyg'));
jest.mock('@app/widgets/TinyG/Controller', () => mockBody('tinyg'));
jest.mock('@app/widgets/Tool/Tool', () => mockBody('tool'));
jest.mock('@app/widgets/Webcam/Webcam', () => mockBody('webcam'));
jest.mock('@app/widgets/Webcam/modals/SettingsModal', () => mockBody('webcam'));

const React = require('react');
const { fireEvent, render, screen } = require('@testing-library/react');
const AutolevelWidget = require('@app/widgets/Autolevel').default;
const AxesWidget = require('@app/widgets/Axes').default;
const ConnectionWidget = require('@app/widgets/Connection').default;
const ConsoleWidget = require('@app/widgets/Console').default;
const CustomWidget = require('@app/widgets/Custom').default;
const GCodeWidget = require('@app/widgets/GCode').default;
const GrblWidget = require('@app/widgets/Grbl').default;
const LaserWidget = require('@app/widgets/Laser').default;
const MacroWidget = require('@app/widgets/Macro').default;
const MarlinWidget = require('@app/widgets/Marlin').default;
const ProbeWidget = require('@app/widgets/Probe').default;
const SmoothieWidget = require('@app/widgets/Smoothie').default;
const SpindleWidget = require('@app/widgets/Spindle').default;
const TinyGWidget = require('@app/widgets/TinyG').default;
const ToolWidget = require('@app/widgets/Tool').default;
const WebcamWidget = require('@app/widgets/Webcam').default;
const WidgetHost = require('../Widget').default;
const { WorkspaceLayoutProvider, useWorkspaceLayout } = require('../WorkspaceLayoutProvider');
const { WIDGET_REGISTRY } = require('../widgetRegistry');

const FRAME_WIDGET_EXPORTS = {
  autolevel: AutolevelWidget,
  axes: AxesWidget,
  connection: ConnectionWidget,
  console: ConsoleWidget,
  custom: CustomWidget,
  gcode: GCodeWidget,
  grbl: GrblWidget,
  laser: LaserWidget,
  macro: MacroWidget,
  marlin: MarlinWidget,
  probe: ProbeWidget,
  smoothie: SmoothieWidget,
  spindle: SpindleWidget,
  tinyg: TinyGWidget,
  tool: ToolWidget,
  webcam: WebcamWidget,
};

const controllerTypeForWidget = {
  grbl: 'Grbl',
  marlin: 'Marlin',
  smoothie: 'Smoothie',
  tinyg: 'TinyG',
};

const getPath = (state, path, defaultValue) => {
  const parts = Array.isArray(path) ? path : path.split('.');
  const value = parts.reduce((current, part) => current?.[part], state);
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

const createConfig = (widgetIds, minimized = false) => {
  let state = {
    widgets: widgetIds.reduce((widgets, widgetId) => ({
      ...widgets,
      [widgetId]: { minimized },
    }), {}),
    workspace: {
      container: {
        default: { widgets: widgetIds },
      },
    },
  };
  const listeners = new Set();
  const config = {
    get: jest.fn((path, defaultValue) => getPath(state, path, defaultValue)),
    update: jest.fn((path, updater) => {
      state = setPath(state, path, updater(getPath(state, path, {})));
      listeners.forEach(listener => listener());
    }),
    set: jest.fn((path, value) => {
      state = setPath(state, path, value);
      listeners.forEach(listener => listener());
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
    read: () => state,
  };

  return config;
};

const ShellHost = ({ widgetId }) => (
  <WidgetHost
    widgetId={widgetId}
    onFork={jest.fn()}
    onRemove={jest.fn()}
    sortable={{ handleClassName: 'drag-handle', filterClassName: 'drag-filter' }}
  />
);

const BulkControls = ({ widgetIds }) => {
  const { setWidgetsCollapsed } = useWorkspaceLayout();

  return (
    <div>
      <button type="button" onClick={() => setWidgetsCollapsed(widgetIds, false)}>
        Bulk expand
      </button>
      <button type="button" onClick={() => setWidgetsCollapsed(widgetIds, true)}>
        Bulk collapse
      </button>
    </div>
  );
};

const getShell = container => container.querySelector('[role="region"]');

const getCollapseButton = shell => Array.from(shell.querySelectorAll('button')).find(button => (
  button.getAttribute('aria-label') === 'Expand' ||
  button.getAttribute('aria-label') === 'Collapse' ||
  button.title === 'Expand' ||
  button.title === 'Collapse'
));

const getFullscreenMenuItem = shell => {
  const items = shell.querySelectorAll('button[data-event-key="fullscreen"]');
  return items[items.length - 1] || Array.from(shell.querySelectorAll('button')).find(button => (
    /Full Screen/.test(button.textContent)
  ));
};

const contentIsHidden = content => (
  content.getAttribute('aria-hidden') === 'true' ||
  content.style.display === 'none' ||
  content.className.split(/\s+/).includes('hidden')
);

const assertShellView = (container, view) => {
  const shell = getShell(container);
  const collapseButton = getCollapseButton(shell);
  const content = shell.querySelector('[data-widget-content]');

  expect(collapseButton).toBeTruthy();
  expect(collapseButton).toHaveAttribute('aria-expanded', String(view !== 'collapsed'));
  expect(contentIsHidden(content)).toBe(view === 'collapsed');
  expect(shell).toHaveAttribute('data-fullscreen', String(view === 'fullscreen'));
};

const clearViewOperationSpies = () => {
  mockController.command.mockClear();
  mockController.write.mockClear();
  mockController.writeln.mockClear();
  mockApi.loadGCode.mockClear();
  mockApi.setToolConfig.mockClear();
  mockAxios.post.mockClear();
  mockAxios.put.mockClear();
  mockAxios.patch.mockClear();
  mockAxios.delete.mockClear();
};

beforeEach(() => {
  resetBodyLifecycle();
  mockController.type = 'Grbl';
  clearViewOperationSpies();
});

test('registry maps every fixed frame export and leaves Visualizer unframed', () => {
  expect(FRAME_WIDGETS).toHaveLength(16);

  FRAME_WIDGETS.forEach(widgetId => {
    expect(WIDGET_REGISTRY[widgetId].Component).toBe(FRAME_WIDGET_EXPORTS[widgetId]);
    expect(WIDGET_REGISTRY[widgetId].hasFrame).toBe(true);
  });
  expect(WIDGET_REGISTRY.visualizer.hasFrame).toBe(false);
});

test.each(FRAME_WIDGETS)(
  '%s restores minimized state, keeps its body mounted, and supports view changes',
  widgetId => {
    mockController.type = controllerTypeForWidget[widgetId] || 'Grbl';
    const config = createConfig([widgetId], true);
    const view = render(
      <WorkspaceLayoutProvider config={config}>
        <ShellHost widgetId={widgetId} />
      </WorkspaceLayoutProvider>
    );

    assertShellView(view.container, 'collapsed');
    const mountedBodies = mockBodyLifecycle.mounts[widgetId] || 0;
    const unmountedBodies = mockBodyLifecycle.unmounts[widgetId] || 0;
    clearViewOperationSpies();

    fireEvent.click(getCollapseButton(getShell(view.container)));
    assertShellView(view.container, 'normal');

    fireEvent.click(getFullscreenMenuItem(getShell(view.container)));
    assertShellView(view.container, 'fullscreen');

    fireEvent.click(getFullscreenMenuItem(getShell(view.container)));
    assertShellView(view.container, 'normal');

    fireEvent.click(getCollapseButton(getShell(view.container)));
    assertShellView(view.container, 'collapsed');
    expect(mockBodyLifecycle.mounts[widgetId] || 0).toBe(mountedBodies);
    expect(mockBodyLifecycle.unmounts[widgetId] || 0).toBe(unmountedBodies);
    expect(mockController.command).not.toHaveBeenCalled();
    expect(mockController.write).not.toHaveBeenCalled();
    expect(mockController.writeln).not.toHaveBeenCalled();
    expect(mockApi.loadGCode).not.toHaveBeenCalled();
    expect(mockApi.setToolConfig).not.toHaveBeenCalled();
    expect(mockAxios.post).not.toHaveBeenCalled();
    expect(mockAxios.put).not.toHaveBeenCalled();
    expect(mockAxios.patch).not.toHaveBeenCalled();
    expect(mockAxios.delete).not.toHaveBeenCalled();

    view.unmount();
    expect(mockBodyLifecycle.unmounts[widgetId] || 0).toBeGreaterThan(unmountedBodies);
    expect(mockBodyLifecycle.unmounts[widgetId] || 0).toBe(mockBodyLifecycle.mounts[widgetId] || 0);
  }
);

test.each(FRAME_WIDGETS)('%s bulk view changes affect both forks only', widgetId => {
  mockController.type = controllerTypeForWidget[widgetId] || 'Grbl';
  const forkId = `${widgetId}:fork-1`;
  const config = createConfig([widgetId, forkId], true);
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <BulkControls widgetIds={[widgetId, forkId]} />
      <ShellHost widgetId={widgetId} />
      <ShellHost widgetId={forkId} />
    </WorkspaceLayoutProvider>
  );

  const shells = () => view.container.querySelectorAll('[role="region"]');
  expect(shells()).toHaveLength(2);
  expect(Array.from(shells()).every(shell => contentIsHidden(shell.querySelector('[data-widget-content]')))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Bulk expand' }));
  expect(config.read().widgets[widgetId].minimized).toBe(false);
  expect(config.read().widgets[forkId].minimized).toBe(false);
  expect(Array.from(shells()).every(shell => !contentIsHidden(shell.querySelector('[data-widget-content]')))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Bulk collapse' }));
  expect(config.read().widgets[widgetId].minimized).toBe(true);
  expect(config.read().widgets[forkId].minimized).toBe(true);
  expect(Array.from(shells()).every(shell => contentIsHidden(shell.querySelector('[data-widget-content]')))).toBe(true);

  view.unmount();
});

test('fork view and config state stay isolated when only one id changes', () => {
  const config = createConfig(['axes', 'axes:fork-1'], false);
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <ShellHost widgetId="axes" />
      <ShellHost widgetId="axes:fork-1" />
    </WorkspaceLayoutProvider>
  );
  const shells = () => view.container.querySelectorAll('[role="region"]');

  fireEvent.click(getCollapseButton(shells()[0]));
  expect(config.read().widgets.axes.minimized).toBe(true);
  expect(config.read().widgets['axes:fork-1'].minimized).toBe(false);
  expect(contentIsHidden(shells()[0].querySelector('[data-widget-content]'))).toBe(true);
  expect(contentIsHidden(shells()[1].querySelector('[data-widget-content]'))).toBe(false);

  fireEvent.click(getFullscreenMenuItem(shells()[1]));
  expect(config.read().widgets.axes.minimized).toBe(true);
  expect(config.read().widgets['axes:fork-1'].minimized).toBe(false);
  expect(shells()[0]).toHaveAttribute('data-fullscreen', 'false');
  expect(shells()[1]).toHaveAttribute('data-fullscreen', 'true');

  view.unmount();
});

test('changing a keyed widget id remounts the body and does not copy minimized state', () => {
  const config = createConfig(['axes', 'axes:fork-1'], true);
  const KeyedHost = ({ widgetId }) => <ShellHost key={widgetId} widgetId={widgetId} />;
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <KeyedHost widgetId="axes" />
    </WorkspaceLayoutProvider>
  );
  const initialMounts = mockBodyLifecycle.mounts.axes || 0;

  view.rerender(
    <WorkspaceLayoutProvider config={config}>
      <KeyedHost widgetId="axes:fork-1" />
    </WorkspaceLayoutProvider>
  );

  expect(mockBodyLifecycle.unmounts.axes || 0).toBeGreaterThan(0);
  expect(mockBodyLifecycle.mounts.axes || 0).toBeGreaterThan(initialMounts);
  expect(contentIsHidden(getShell(view.container).querySelector('[data-widget-content]'))).toBe(true);

  fireEvent.click(getCollapseButton(getShell(view.container)));
  expect(config.read().widgets.axes.minimized).toBe(true);
  expect(config.read().widgets['axes:fork-1'].minimized).toBe(false);
  view.unmount();
});

test('Visualizer bypasses layout, stays visible, and is ignored by bulk collapse', () => {
  const config = createConfig(['visualizer'], false);
  const view = render(
    <WorkspaceLayoutProvider config={config}>
      <BulkControls widgetIds={['visualizer']} />
      <WidgetHost widgetId="visualizer" onFork={jest.fn()} onRemove={jest.fn()} />
    </WorkspaceLayoutProvider>
  );

  expect(screen.getByTestId('visualizer-body')).toBeInTheDocument();
  expect(view.container.querySelector('[data-widget-body="visualizer"]')).toBeNull();
  expect(view.container.querySelector('button[aria-label="Expand"]')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Bulk collapse' }));
  expect(config.read().widgets.visualizer.minimized).toBe(false);
  expect(screen.getByTestId('visualizer-body')).toBeInTheDocument();
  view.unmount();
});
