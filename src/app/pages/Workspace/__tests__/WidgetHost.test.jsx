import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AutolevelWidget from '@app/widgets/Autolevel';
import ConnectionWidget from '@app/widgets/Connection';
import Widget from '../Widget';

let mockBodyUnmountCount = 0;

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
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
    Space: () => null,
  };
});

jest.mock('@app/api', () => ({
  loadGCode: jest.fn(),
}));
jest.mock('@app/queries/gcode', () => ({
  useLoadGCodeMutation: () => ({ mutate: jest.fn() }),
}));
jest.mock('@app/widgets/Axes', () => 'AxesWidget');
jest.mock('@app/widgets/Console', () => 'ConsoleWidget');
jest.mock('@app/widgets/Custom', () => 'CustomWidget');
jest.mock('@app/widgets/GCode', () => 'GCodeWidget');
jest.mock('@app/widgets/Grbl', () => 'GrblWidget');
jest.mock('@app/widgets/Laser', () => 'LaserWidget');
jest.mock('@app/widgets/Macro', () => 'MacroWidget');
jest.mock('@app/widgets/Marlin', () => 'MarlinWidget');
jest.mock('@app/widgets/Probe', () => 'ProbeWidget');
jest.mock('@app/widgets/Smoothie', () => 'SmoothieWidget');
jest.mock('@app/widgets/Spindle', () => 'SpindleWidget');
jest.mock('@app/widgets/TinyG', () => 'TinyGWidget');
jest.mock('@app/widgets/Tool', () => 'ToolWidget');
jest.mock('@app/widgets/Visualizer', () => 'VisualizerWidget');
jest.mock('@app/widgets/Webcam', () => 'WebcamWidget');

jest.mock('@app/components/Widget', () => {
  const React = require('react');
  const Primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const Widget = ({ children, borderless, fullscreen, ...props }) => React.createElement(
    'section',
    {
      ...props,
      'data-borderless': String(Boolean(borderless)),
      'data-fullscreen': String(Boolean(fullscreen)),
    },
    children
  );
  Widget.Header = Primitive;
  Widget.Content = Primitive;
  Widget.Sortable = Primitive;
  Widget.Title = Primitive;
  Widget.Controls = Primitive;
  return Widget;
});

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    connection: { ident: null },
    type: 'Grbl',
    state: {},
    workflow: { state: 'idle' },
    addListener: jest.fn(),
    removeListener: jest.fn(),
    command: jest.fn((name, params, callback) => {
      if (callback) {
        callback(null, null);
      }
    }),
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/WidgetConfig', () => {
  return class MockWidgetConfig {
    get(path, defaultValue) {
      return defaultValue;
    }

    set() {}
  };
});

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => {
  return ({ children }) => children;
});

jest.mock('@app/widgets/Connection/Connection', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'connection-content' });
});

jest.mock('@app/widgets/Autolevel/LandingView', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'autolevel-content' });
});
jest.mock('@app/widgets/Autolevel/SetupProbeView', () => () => null);
jest.mock('@app/widgets/Autolevel/ApplyView', () => () => null);
jest.mock('@app/widgets/Autolevel/StartProbeModal', () => () => null);
jest.mock('@app/widgets/Autolevel/StopProbeModal', () => () => null);
jest.mock('@app/widgets/Autolevel/TestProbeModal', () => () => null);

jest.mock('../widgetRegistry', () => {
  const React = require('react');
  const Body = ({ view, onViewChange, ...props }) => {
    React.useEffect(() => () => {
      mockBodyUnmountCount += 1;
    }, []);

    const hasLayout = typeof view === 'string';

    return React.createElement(
      'output',
      {
        'data-testid': 'body',
        'data-layout': hasLayout ? view : null,
        'data-has-layout-actions': String(
          typeof onViewChange === 'function'
        ),
      },
      <>
        {props.children}
        {hasLayout && (
          <>
            <button
              type="button"
              onClick={() => onViewChange(view === 'collapsed' ? 'normal' : 'collapsed')}
            >
              Toggle collapse
            </button>
            <button
              type="button"
              onClick={() => onViewChange(view === 'fullscreen' ? 'normal' : 'fullscreen')}
            >
              Toggle fullscreen
            </button>
          </>
        )}
      </>
    );
  };
  return {
    WIDGET_REGISTRY: {
      axes: { Component: Body, hasFrame: true },
      visualizer: { Component: Body, hasFrame: false },
    },
  };
});

jest.mock('../useWorkspaceLayout', () => {
  const React = require('react');
  return {
    useWorkspaceLayout: () => {
      const [view, setView] = React.useState('collapsed');

      return {
        getWidgetView: () => view,
        setWidgetView: (widgetId, nextView) => {
          if (widgetId) {
            setView(nextView);
          }
        },
      };
    },
  };
});

test('widget host receives declarative layout props without a component ref', () => {
  mockBodyUnmountCount = 0;
  render(<Widget widgetId="axes" />);

  const body = screen.getByTestId('body');
  expect(body).toHaveAttribute('data-layout', 'collapsed');
  expect(body).toHaveAttribute('data-has-layout-actions', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Toggle collapse' }));
  fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }));
  expect(body).toHaveAttribute('data-layout', 'fullscreen');
  expect(mockBodyUnmountCount).toBe(0);
});

test('Visualizer bypasses layout context and unknown widget returns null', () => {
  const view = render(<Widget widgetId="visualizer" />);
  expect(screen.getByTestId('body')).not.toHaveAttribute('data-layout');

  view.rerender(<Widget widgetId="unknown" />);
  expect(screen.queryByTestId('body')).not.toBeInTheDocument();
});

test('host passes widget props through unchanged', () => {
  render(<Widget widgetId="axes:fork-1" sortable={{ handleClassName: 'handle' }} />);
  expect(screen.getByTestId('body')).toBeInTheDocument();
});

test('Connection shell dispatches layout actions through props', () => {
  const layout = {
    view: 'collapsed',
    onViewChange: jest.fn(),
  };

  render(
    <ConnectionWidget
      widgetId="connection"
      {...layout}
      onFork={jest.fn()}
      onRemove={jest.fn()}
      sortable={{}}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
  expect(layout.onViewChange).toHaveBeenCalledWith('normal');
  expect(screen.getByTestId('connection-content')).toBeInTheDocument();
});

test('Autolevel shell forwards layout actions without local layout state', () => {
  const layout = {
    view: 'normal',
    onViewChange: jest.fn(),
  };

  render(
    <AutolevelWidget
      widgetId="autolevel"
      {...layout}
      onFork={jest.fn()}
      onRemove={jest.fn()}
      sortable={{}}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(layout.onViewChange).toHaveBeenCalledWith('collapsed');

  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enter Full Screen' }));
  expect(layout.onViewChange).toHaveBeenCalledWith('fullscreen');
});
