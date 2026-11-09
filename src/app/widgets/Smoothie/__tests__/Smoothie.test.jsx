import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockWrite = jest.fn();
const mockWriteln = jest.fn();
const mockListeners = new Map();

const mockController = {
  addListener: jest.fn((eventName, listener) => {
    const listeners = mockListeners.get(eventName) || new Set();
    listeners.add(listener);
    mockListeners.set(eventName, listeners);
  }),
  command: mockCommand,
  connection: { ident: 'serial' },
  removeListener: jest.fn((eventName, listener) => {
    mockListeners.get(eventName)?.delete(listener);
  }),
  settings: { version: 'edge' },
  state: {
    parserstate: {
      feedrate: 1200,
      modal: { units: 'G21' },
      spindle: 8000,
      tool: 1,
    },
    status: { machineState: 'Idle', ovF: 100, ovS: 100 },
  },
  type: 'Smoothie',
  write: mockWrite,
  writeln: mockWriteln,
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/widgets/shared/WidgetConfig', () => ({
  __esModule: true,
  default: class MockWidgetConfig {
    get(path) {
      return path.endsWith('.expanded');
    }

    set() {}
  },
}));

const SmoothieWidget = require('../index').default;

const widgetProps = {
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  sortable: { filterClassName: 'filter', handleClassName: 'handle' },
  view: 'normal',
  widgetId: 'smoothie-test',
};

function emit(eventName, ...args) {
  act(() => {
    mockListeners.get(eventName)?.forEach(listener => listener(...args));
  });
}

function pressRepeatable(element) {
  const button = element.closest('button');
  fireEvent.mouseDown(button);
  fireEvent.mouseUp(button);
}

describe('Smoothie state contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockListeners.clear();
    mockController.connection.ident = 'serial';
    mockController.type = 'Smoothie';
    mockController.state = {
      parserstate: {
        feedrate: 1200,
        modal: { units: 'G21' },
        spindle: 8000,
        tool: 1,
      },
      status: { machineState: 'Idle', ovF: 100, ovS: 100 },
    };
  });

  test('merges a partial Smoothie state report without erasing parser data', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    expect(screen.getByText('1200')).toBeVisible();
    expect(screen.getAllByText('100%')).toHaveLength(2);

    emit('controller:state', 'Smoothie', { status: { machineState: 'Run' } });

    expect(screen.getByText('1200')).toBeVisible();
    expect(screen.getByText('Run')).toBeVisible();
    expect(screen.getAllByText('100%')).toHaveLength(2);
  });

  test('ignores reports from another controller type', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    emit('controller:state', 'Grbl', { parserstate: { feedrate: 9999 } });

    expect(screen.getByText('1200')).toBeVisible();
    expect(screen.queryByText('9999')).not.toBeInTheDocument();
  });

  test('removes each listener before a remount registers its replacement', () => {
    const first = renderAppUI(<SmoothieWidget {...widgetProps} />);

    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([1, 1, 1, 1]);
    first.unmount();
    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([0, 0, 0, 0]);

    renderAppUI(<SmoothieWidget {...widgetProps} />);

    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([1, 1, 1, 1]);
  });

  test('hides controller actions after disconnect', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    expect(screen.getByLabelText('Smoothie commands')).toBeVisible();
    emit('connection:change', 'disconnected', false);

    expect(screen.queryByLabelText('Smoothie commands')).not.toBeInTheDocument();
    expect(screen.queryByText('1200')).not.toBeInTheDocument();
  });

  test('displays reported units using the Smoothie parser state', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    expect(screen.getByText('Millimeters (G21)')).toBeVisible();
  });
});

describe('Smoothie command contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockListeners.clear();
    mockController.connection.ident = 'serial';
    mockController.type = 'Smoothie';
    mockController.state = {
      parserstate: {
        feedrate: 1200,
        modal: { units: 'G21' },
        spindle: 8000,
        tool: 1,
      },
      status: { machineState: 'Idle', ovF: 100, ovS: 100 },
    };
  });

  test('sends each Smoothie command menu payload unchanged', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    [
      'Status Report (?)',
      'Homing ($H)',
      'Kill Alarm Lock ($X)',
      'Help',
      'View G-code Parameters ($#)',
      'View G-code Parser State ($G)',
    ].forEach(label => {
      fireEvent.click(screen.getByLabelText('Smoothie commands'));
      fireEvent.click(screen.getByText(label));
    });

    expect(mockWrite.mock.calls).toEqual([['?']]);
    expect(mockCommand.mock.calls).toEqual([['homing'], ['unlock']]);
    expect(mockWriteln.mock.calls).toEqual([['help'], ['$#'], ['$G']]);
  });

  test('sends the exact feed and spindle override values', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    pressRepeatable(screen.getAllByText('-10%')[0]);
    pressRepeatable(screen.getAllByText('-1%')[0]);
    pressRepeatable(screen.getAllByText('1%')[0]);
    pressRepeatable(screen.getAllByText('10%')[0]);
    fireEvent.click(screen.getByLabelText('Reset feed rate override'));
    pressRepeatable(screen.getAllByText('-10%')[1]);
    pressRepeatable(screen.getAllByText('-1%')[1]);
    pressRepeatable(screen.getAllByText('1%')[1]);
    pressRepeatable(screen.getAllByText('10%')[1]);
    fireEvent.click(screen.getByLabelText('Reset spindle override'));

    expect(mockCommand.mock.calls).toEqual([
      ['feed_override', -10], ['feed_override', -1], ['feed_override', 1], ['feed_override', 10], ['feed_override', 0],
      ['spindle_override', -10], ['spindle_override', -1], ['spindle_override', 1], ['spindle_override', 10], ['spindle_override', 0],
    ]);
  });

  test('switches modal tabs without commands and refreshes settings with $#', () => {
    renderAppUI(<SmoothieWidget {...widgetProps} />);

    fireEvent.click(screen.getByLabelText('Smoothie controller info'));
    fireEvent.click(screen.getByRole('tab', { name: 'Controller Settings' }));
    expect(mockWriteln).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Refresh'));

    expect(mockWriteln.mock.calls).toEqual([['$#']]);
  });
});
