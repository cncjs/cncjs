import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockWrite = jest.fn();
const mockWriteln = jest.fn();
const mockListeners = new Map();
const mockController = {
  addListener: jest.fn((eventName, callback) => {
    const callbacks = mockListeners.get(eventName) || [];
    mockListeners.set(eventName, [...callbacks, callback]);
  }),
  command: mockCommand,
  connection: { ident: 'tinyg-test' },
  removeListener: jest.fn((eventName, callback) => {
    const callbacks = mockListeners.get(eventName) || [];
    mockListeners.set(eventName, callbacks.filter(item => item !== callback));
  }),
  settings: { fv: 0.97, mfo: 1, mto: 1, sso: 1 },
  state: {
    feedrate: 100,
    line: 10,
    machineState: 1,
    modal: { units: 'G21' },
    pwr: { 1: 1 },
    qr: 4,
    velocity: 200,
  },
  type: 'TinyG',
  write: mockWrite,
  writeln: mockWriteln,
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: (value, data) => (data ? value.replace('{{n}}', data.n) : value),
    t: value => value,
  },
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({ get: () => true, set: jest.fn() }),
}));

const TinyGWidget = require('../index').default;
const Overrides = require('../Overrides').default;

const widgetProps = {
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  sortable: { filterClassName: 'filter', handleClassName: 'handle' },
  view: 'normal',
  widgetId: 'tinyg-test',
};

function emit(eventName, ...args) {
  act(() => {
    (mockListeners.get(eventName) || []).forEach(callback => callback(...args));
  });
}

function pressRepeatable(element) {
  const button = element.closest('button');
  fireEvent.mouseDown(button);
  fireEvent.mouseUp(button);
}

describe('TinyG controller contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockController.addListener.mockClear();
    mockController.removeListener.mockClear();
    mockListeners.clear();
  });

  test('merges a partial TinyG state report without erasing prior fields', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    emit('controller:state', 'TinyG', { feedrate: 250 });

    expect(screen.getByText('250')).toBeVisible();
    expect(screen.getByText('10')).toBeVisible();
    expect(screen.getByText('Millimeters (G21)')).toBeVisible();
  });

  test('merges partial firmware settings and retains g2core override values', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    emit('controller:settings', 'TinyG', { fv: 0.99 });

    expect(screen.getByLabelText('Reset feed rate override')).toBeVisible();
    expect(screen.getByLabelText('Reset spindle override')).toBeVisible();
    expect(screen.getByLabelText('Trajectory planner 100%')).toBeVisible();
  });

  test('sends every TinyG command menu payload with its original transport and order', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    [
      'Status Report (?)',
      'Queue Flush (%)',
      'Kill Job (^d)',
      'Clear Alarm ($clear)',
      'Help',
      'Show System Settings',
      'Show All Settings',
      'List Self Tests',
      'Restore Defaults',
    ].forEach(label => {
      fireEvent.click(screen.getByLabelText('TinyG commands'));
      fireEvent.click(screen.getByText(label));
    });

    expect(mockWrite.mock.calls).toEqual([['\x04']]);
    expect(mockCommand.mock.calls).toEqual([['unlock']]);
    expect(mockWriteln.mock.calls).toEqual([
      ['?'],
      ['!%'],
      ['{"qr":""}'],
      ['h'],
      ['$sys'],
      ['$$'],
      ['$test'],
      ['$defa=1'],
    ]);
  });

  test('sends motor power commands in the required order', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable Motors' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disable Motors' }));

    expect(mockCommand.mock.calls).toEqual([
      ['gcode', '{me:0}'],
      ['gcode', '{pwr:n}'],
      ['gcode', '{md:0}'],
      ['gcode', '{pwr:n}'],
    ]);
  });

  test('sends the exact feed, spindle, and rapid override values', () => {
    renderAppUI(<Overrides ovF={100} ovS={100} ovT={100} />);

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
    fireEvent.click(screen.getByLabelText('Trajectory planner 100%'));
    fireEvent.click(screen.getByLabelText('Trajectory planner 50%'));
    fireEvent.click(screen.getByLabelText('Trajectory planner 25%'));

    expect(mockCommand.mock.calls).toEqual([
      ['feed_override', -10], ['feed_override', -1], ['feed_override', 1], ['feed_override', 10], ['feed_override', 0],
      ['spindle_override', -10], ['spindle_override', -1], ['spindle_override', 1], ['spindle_override', 10], ['spindle_override', 0],
      ['rapid_override', 100], ['rapid_override', 50], ['rapid_override', 25],
    ]);
  });

  test('ignores other controller types and removes every listener on unmount', () => {
    const first = renderAppUI(<TinyGWidget {...widgetProps} />);

    emit('controller:state', 'Grbl', { line: 99 });
    expect(screen.getByText('10')).toBeVisible();
    expect([...mockListeners.values()].every(callbacks => callbacks.length === 1)).toBe(true);

    first.unmount();
    expect([...mockListeners.values()].every(callbacks => callbacks.length === 0)).toBe(true);

    renderAppUI(<TinyGWidget {...widgetProps} />);
    expect([...mockListeners.values()].every(callbacks => callbacks.length === 1)).toBe(true);
  });

  test('hides all command controls after disconnect', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    emit('connection:change', {}, false);

    expect(screen.queryByLabelText('TinyG commands')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('TinyG controller info')).not.toBeInTheDocument();
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockWriteln).not.toHaveBeenCalled();
  });

  test('shows live controller state and settings in modal tabs without sending commands', () => {
    renderAppUI(<TinyGWidget {...widgetProps} />);

    fireEvent.click(screen.getByLabelText('TinyG controller info'));
    expect(screen.getByRole('tab', { name: 'Controller State' })).toBeVisible();
    expect(screen.getByText(/"line": 10/)).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Controller Settings' }));
    expect(screen.getByText(/"fv": 0.97/)).toBeVisible();
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockWriteln).not.toHaveBeenCalled();
  });
});
