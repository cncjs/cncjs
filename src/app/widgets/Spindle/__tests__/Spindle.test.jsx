import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockConfigSet = jest.fn();
let mockSpeed = 1000;

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    command: mockCommand,
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({
    get: (path, fallback) => (path === 'speed' ? mockSpeed : fallback),
    set: (path, value) => {
      mockConfigSet(path, value);
    },
  }),
}));

const Spindle = require('../Spindle').default;
const SpindleWidget = require('../index').default;

const renderSpindle = (props = {}) => renderAppUI(
  <Spindle
    isActionable
    mistCoolant={false}
    floodCoolant={false}
    spindle={null}
    {...props}
  />
);

const getAction = label => screen.getByRole('button', { name: label });

describe('Spindle Tonic primitive pilot', () => {
  beforeEach(() => {
    mockSpeed = 1000;
    jest.clearAllMocks();
  });

  test('preserves M7/M8/M9/M3/M4/M5 command payloads', () => {
    renderAppUI(
      <Spindle
        isActionable
        mistCoolant={false}
        floodCoolant={false}
        spindle={null}
      />
    );

    const buttons = screen.getAllByRole('button');
    ['M7', 'M8', 'M9', 'M3', 'M4', 'M5'].forEach((label, index) => {
      expect(buttons[index]).toHaveTextContent(label);
      fireEvent.click(buttons[index]);
    });

    expect(mockCommand).toHaveBeenNthCalledWith(1, 'gcode', 'M7');
    expect(mockCommand).toHaveBeenNthCalledWith(2, 'gcode', 'M8');
    expect(mockCommand).toHaveBeenNthCalledWith(3, 'gcode', 'M9');
    expect(mockCommand).toHaveBeenNthCalledWith(4, 'gcode', 'M3 S1000');
    expect(mockCommand).toHaveBeenNthCalledWith(5, 'gcode', 'M4 S1000');
    expect(mockCommand).toHaveBeenNthCalledWith(6, 'gcode', 'M5');
    expect(mockCommand).toHaveBeenCalledTimes(6);
  });

  test('disables every command when the controller is not actionable', () => {
    renderAppUI(
      <Spindle
        isActionable={false}
        mistCoolant={false}
        floodCoolant={false}
        spindle={null}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(6);
    screen.getAllByRole('button').forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  test('persists positive and non-positive speed values through config', () => {
    renderSpindle();

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '2400' } });
    expect(mockConfigSet).toHaveBeenLastCalledWith('speed', 2400);

    fireEvent.change(input, { target: { value: '-10' } });
    expect(mockConfigSet).toHaveBeenLastCalledWith('speed', 0);
  });

  test('names the speed field and completes a spindle command from the keyboard', async () => {
    const user = userEvent.setup();
    renderSpindle();

    const input = screen.getByRole('spinbutton', { name: 'Spindle Speed' });
    input.focus();
    await user.clear(input);
    await user.keyboard('2400');

    const action = getAction('M3');
    action.focus();
    await user.keyboard('{Enter}');

    expect(mockConfigSet).toHaveBeenLastCalledWith('speed', 2400);
    expect(mockCommand).toHaveBeenCalledTimes(1);
    expect(mockCommand).toHaveBeenCalledWith('gcode', 'M3 S2400');
  });

  test('uses the current speed draft without sending a command on edit', () => {
    renderSpindle();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2400' } });

    expect(mockCommand).not.toHaveBeenCalled();
    fireEvent.click(getAction('M3'));

    expect(mockCommand).toHaveBeenCalledTimes(1);
    expect(mockCommand).toHaveBeenCalledWith('gcode', 'M3 S2400');
  });

  test('sends bare M3 and M4 commands for numeric zero', () => {
    renderSpindle();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });

    expect(getAction('M3')).not.toBeDisabled();
    expect(getAction('M4')).not.toBeDisabled();
    fireEvent.click(getAction('M3'));
    fireEvent.click(getAction('M4'));

    expect(mockCommand).toHaveBeenCalledTimes(2);
    expect(mockCommand).toHaveBeenNthCalledWith(1, 'gcode', 'M3');
    expect(mockCommand).toHaveBeenNthCalledWith(2, 'gcode', 'M4');
  });

  test('disables M3 and M4 for empty and invalid speed drafts', () => {
    renderSpindle();

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });

    expect(getAction('M3')).toBeDisabled();
    expect(getAction('M4')).toBeDisabled();
    expect(getAction('M5')).not.toBeDisabled();
    expect(mockCommand).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '-10' } });

    expect(getAction('M3')).toBeDisabled();
    expect(getAction('M4')).toBeDisabled();
    expect(mockCommand).not.toHaveBeenCalled();
  });

  test('keeps the widget view controlled by the host', () => {
    const onViewChange = jest.fn();

    renderAppUI(
      <SpindleWidget
        widgetId="spindle"
        onFork={jest.fn()}
        onRemove={jest.fn()}
        view="normal"
        onViewChange={onViewChange}
        sortable={{ handleClassName: '', filterClassName: '' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('collapsed');
  });
});
