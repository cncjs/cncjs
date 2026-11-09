import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockWrite = jest.fn();
const mockWriteln = jest.fn();
const mockListeners = new Map();
const mockConfigSet = jest.fn();

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
  settings: { baudrate: 115200 },
  state: {
    extruder: { deg: 20, degTarget: 200, power: 64 },
    feedrate: 1200,
    heatedBed: { deg: 25, degTarget: 60, power: 32 },
    modal: {},
    ovF: 100,
    ovS: 100,
    spindle: 8000,
  },
  type: 'Marlin',
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
    get(path, defaultValue) {
      if (path.endsWith('.expanded')) {
        return true;
      }
      return defaultValue;
    }

    set(...args) {
      mockConfigSet(...args);
    }
  },
}));

jest.mock('../FadeInOut', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

const MarlinWidget = require('../index').default;

const widgetProps = {
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  sortable: { filterClassName: 'filter', handleClassName: 'handle' },
  view: 'normal',
  widgetId: 'marlin-test',
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

describe('Marlin state contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockConfigSet.mockClear();
    mockListeners.clear();
    mockController.type = 'Marlin';
    mockController.connection.ident = 'serial';
    mockController.state = {
      extruder: { deg: 20, degTarget: 200, power: 64 },
      feedrate: 1200,
      heatedBed: { deg: 25, degTarget: 60, power: 32 },
      modal: {},
      ovF: 100,
      ovS: 100,
      spindle: 8000,
    };
  });

  test('merges a partial Marlin state report without erasing heater data', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

    expect(screen.getByText('20°C / 200°C')).toBeVisible();

    emit('controller:state', 'Marlin', { feedrate: 2400 });

    expect(screen.getByText('20°C / 200°C')).toBeVisible();
    expect(screen.getByText('2400')).toBeVisible();
  });

  test('ignores reports from another controller type', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

    emit('controller:state', 'Grbl', { feedrate: 9999 });

    expect(screen.getByText('1200')).toBeVisible();
    expect(screen.queryByText('9999')).not.toBeInTheDocument();
  });

  test('removes each listener before a remount registers its replacement', () => {
    const first = renderAppUI(<MarlinWidget {...widgetProps} />);

    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([1, 1, 1, 1]);
    first.unmount();
    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([0, 0, 0, 0]);

    renderAppUI(<MarlinWidget {...widgetProps} />);

    expect([...mockListeners.values()].map(listeners => listeners.size)).toEqual([1, 1, 1, 1]);
  });

  test('hides controller actions after disconnect', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

    expect(screen.getByLabelText('Marlin commands')).toBeVisible();
    emit('connection:change', 'disconnected', false);

    expect(screen.queryByLabelText('Marlin commands')).not.toBeInTheDocument();
    expect(screen.queryByText('20°C / 200°C')).not.toBeInTheDocument();
  });
});

describe('Marlin command contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockConfigSet.mockClear();
    mockListeners.clear();
    mockController.type = 'Marlin';
    mockController.connection.ident = 'serial';
    mockController.state = {
      extruder: { deg: 20, degTarget: 200, power: 64 },
      feedrate: 1200,
      heatedBed: { deg: 25, degTarget: 60, power: 32 },
      modal: {},
      ovF: 100,
      ovS: 100,
      spindle: 8000,
    };
  });

  test('sends each Marlin command menu payload unchanged', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

    [
      'Get Extruder Temperature (M105)',
      'Get Current Position (M114)',
      'Get Firmware Version and Capabilities (M115)',
    ].forEach(label => {
      fireEvent.click(screen.getByLabelText('Marlin commands'));
      fireEvent.click(screen.getByText(label));
    });

    expect(mockWriteln.mock.calls).toEqual([['M105'], ['M114'], ['M115']]);
  });

  test('sets hotend and bed temperatures before requesting a temperature report', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);
    const [extruderInput, heatedBedInput] = screen.getAllByRole('spinbutton');

    fireEvent.change(extruderInput, { target: { value: '215' } });
    fireEvent.click(screen.getByTitle('Set the target temperature for the extruder'));
    fireEvent.change(heatedBedInput, { target: { value: '70' } });
    fireEvent.click(screen.getByTitle('Set the target temperature for the heated bed'));

    expect(mockCommand.mock.calls).toEqual([
      ['gcode', 'M104 S215'],
      ['gcode', 'M105'],
      ['gcode', 'M140 S70'],
      ['gcode', 'M105'],
    ]);
  });

  test('sends the exact feed and spindle override values', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

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

  test('switches modal tabs without commands and preserves the refresh protocol', () => {
    renderAppUI(<MarlinWidget {...widgetProps} />);

    fireEvent.click(screen.getByLabelText('Marlin controller info'));
    fireEvent.click(screen.getByRole('tab', { name: 'Controller Settings' }));
    expect(mockWriteln).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Refresh'));

    expect(mockWriteln.mock.calls).toEqual([['$#'], ['$$']]);
  });
});
