import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import {
  CONNECTION_STATE_CONNECTED,
  CONNECTION_STATE_DISCONNECTED,
} from '@app/constants/connection';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockConfigSet = jest.fn();
const mockStore = {
  connection: { state: CONNECTION_STATE_CONNECTED },
  controller: {},
};
const configValues = {
  'test.power': 10,
  'test.duration': 250,
  'test.maxS': 1200,
  'panel.laserTest.expanded': true,
};

jest.mock('react-redux', () => ({
  connect: mapStateToProps => Component => props => (
    <Component {...mapStateToProps(mockStore)} {...props} />
  ),
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

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({
    get: (path, fallback) => (
      Object.prototype.hasOwnProperty.call(configValues, path)
        ? configValues[path]
        : fallback
    ),
    set: (path, value) => {
      mockConfigSet(path, value);
      configValues[path] = value;
    },
  }),
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/components/RepeatableButton', () => {
  throw new Error('Laser must own repeat behavior on Tonic Button');
});

const LaserTest = require('../LaserTest').default;
const LaserIntensityOverride = require('../LaserIntensityOverride').default;
const LaserWidget = require('../index').default;

const renderLaserTest = (props = {}) => renderAppUI(<LaserTest {...props} />);

const renderOverride = (props = {}) => renderAppUI(
  <LaserIntensityOverride value={0} {...props} />
);

describe('Laser widget command contracts', () => {
  beforeEach(() => {
    jest.useRealTimers();
    Object.assign(configValues, {
      'test.power': 10,
      'test.duration': 250,
      'test.maxS': 1200,
      'panel.laserTest.expanded': true,
    });
    mockStore.connection.state = CONNECTION_STATE_CONNECTED;
    jest.clearAllMocks();
  });

  test('sends one laser test start and stop command with the controlled drafts', () => {
    renderLaserTest();

    const power = screen.getByRole('slider', { name: 'Laser power' });
    expect(power).toHaveAttribute('min', '0');
    expect(power).toHaveAttribute('max', '100');
    expect(power).toHaveValue('10');
    fireEvent.change(power, { target: { value: '11' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Test duration in milliseconds' }), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum S value' }), {
      target: { value: '1400' },
    });

    expect(mockCommand).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Laser Test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Laser Off' }));

    expect(mockCommand).toHaveBeenCalledTimes(2);
    expect(mockCommand).toHaveBeenNthCalledWith(1, 'laser_test', 11, 400, 1400);
    expect(mockCommand).toHaveBeenNthCalledWith(2, 'laser_test', 0);
  });

  test('disables laser test commands while disconnected', () => {
    mockStore.connection.state = CONNECTION_STATE_DISCONNECTED;
    renderLaserTest();

    expect(screen.getByRole('button', { name: 'Laser Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Laser Off' })).toBeDisabled();
    expect(mockCommand).not.toHaveBeenCalled();
  });

  test('sends one command for each override action', () => {
    renderOverride();

    ['-10%', '-1%', '1%', '10%'].forEach(label => {
      fireEvent.mouseDown(screen.getByRole('button', { name: label }));
      fireEvent.mouseUp(document.documentElement);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(mockCommand).toHaveBeenCalledTimes(5);
    expect(mockCommand).toHaveBeenNthCalledWith(1, 'spindle_override', -10);
    expect(mockCommand).toHaveBeenNthCalledWith(2, 'spindle_override', -1);
    expect(mockCommand).toHaveBeenNthCalledWith(3, 'spindle_override', 1);
    expect(mockCommand).toHaveBeenNthCalledWith(4, 'spindle_override', 10);
    expect(mockCommand).toHaveBeenNthCalledWith(5, 'spindle_override', 0);
  });

  test('sends an override command when activated with the keyboard', () => {
    renderOverride();

    fireEvent.keyDown(screen.getByRole('button', { name: '1%' }), {
      key: 'Enter',
    });

    expect(mockCommand).toHaveBeenCalledTimes(1);
    expect(mockCommand).toHaveBeenCalledWith('spindle_override', 1);
  });

  test('preserves repeat delay and interval, then stops after release', () => {
    jest.useFakeTimers();
    renderOverride();

    const action = screen.getByRole('button', { name: '-10%' });
    fireEvent.mouseDown(action);
    expect(mockCommand).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(499));
    expect(mockCommand).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(mockCommand).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(Math.floor(1000 / 15) * 2));
    expect(mockCommand).toHaveBeenCalledTimes(3);

    fireEvent.mouseUp(document.documentElement);
    expect(mockCommand).toHaveBeenCalledTimes(4);
    act(() => jest.advanceTimersByTime(500));
    expect(mockCommand).toHaveBeenCalledTimes(4);
  });

  test('stops repeating on blur, disabled state, and unmount', () => {
    jest.useFakeTimers();
    const { rerender, unmount } = renderAppUI(
      <LaserIntensityOverride value={0} />
    );
    const action = screen.getByRole('button', { name: '-10%' });

    fireEvent.mouseDown(action);
    act(() => jest.advanceTimersByTime(500));
    expect(mockCommand).toHaveBeenCalledTimes(1);
    fireEvent.blur(action);
    act(() => jest.advanceTimersByTime(500));
    expect(mockCommand).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(action);
    rerender(<LaserIntensityOverride value={0} disabled />);
    act(() => jest.advanceTimersByTime(500));
    expect(mockCommand).toHaveBeenCalledTimes(1);

    rerender(<LaserIntensityOverride value={0} />);
    const secondAction = screen.getByRole('button', { name: '-10%' });
    fireEvent.mouseDown(secondAction);
    unmount();
    act(() => jest.advanceTimersByTime(500));
    expect(mockCommand).toHaveBeenCalledTimes(1);
  });

  test('keeps the widget view controlled by the host', () => {
    const onViewChange = jest.fn();

    renderAppUI(
      <LaserWidget
        widgetId="laser"
        onFork={jest.fn()}
        onRemove={jest.fn()}
        view="normal"
        onViewChange={onViewChange}
        sortable={{ handleClassName: '', filterClassName: '' }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]);

    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('collapsed');
  });
});
