import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CONNECTION_STATE_CONNECTED,
  CONNECTION_STATE_DISCONNECTED,
} from '@app/constants/connection';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockConfigSet = jest.fn();
const mockStore = {
  connection: { state: CONNECTION_STATE_CONNECTED },
  controller: {
    workflow: { state: 'idle' },
    reformedMachineState: 'IDLE',
    modal: { units: 'G21', wcs: 'G54' },
  },
};
const configValues = {
  useTLO: false,
  probeAxis: 'Z',
  probeCommand: 'G38.2',
  probeDepth: 10,
  probeFeedrate: 100,
  touchPlateHeight: 1,
  retractionDistance: 2,
};

jest.mock('react-redux', () => ({
  connect: mapStateToProps => Component => props => (
    <Component {...mapStateToProps(mockStore)} {...props} />
  ),
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: { command: mockCommand },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: (value, variables = {}) => value.replace(/{{(.*?)}}/g, (_, key) => variables[key]),
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
      configValues[path] = value;
      mockConfigSet(path, value);
    },
  }),
}));

jest.mock('@app/components/CodePreview', () => ({
  __esModule: true,
  default: ({ data }) => <pre>{data}</pre>,
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

const ProbeModal = require('../modals/ProbeModal').default;
const Probe = require('../Probe').default;

const probeData = {
  probeAxis: 'Z',
  probeCommand: 'G38.2',
  probeDepth: 10,
  probeFeedrate: 100,
  touchPlateHeight: 1,
  retractionDistance: 2,
  wcs: 'G54',
};

describe('Probe modal command contract', () => {
  beforeEach(() => {
    Object.assign(configValues, {
      useTLO: false,
      probeAxis: 'Z',
      probeCommand: 'G38.2',
      probeDepth: 10,
      probeFeedrate: 100,
      touchPlateHeight: 1,
      retractionDistance: 2,
    });
    mockStore.connection.state = CONNECTION_STATE_CONNECTED;
    mockStore.controller.workflow.state = 'idle';
    mockStore.controller.reformedMachineState = 'IDLE';
    jest.clearAllMocks();
  });

  test('cancels without sending a probe command', () => {
    const onClose = jest.fn();

    renderAppUI(<ProbeModal onClose={onClose} probeData={probeData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockCommand).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('sends exactly one complete WCS probe command from the preview', async () => {
    const onClose = jest.fn();

    renderAppUI(<ProbeModal onClose={onClose} probeData={probeData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Probe' }));

    await waitFor(() => expect(mockCommand).toHaveBeenCalledTimes(1));
    expect(mockCommand).toHaveBeenCalledWith('gcode', [
      '; Z-Probe',
      'G91',
      'G38.2 Z-10 F100',
      'G90',
      '; Set the active WCS Z0',
      'G10 L20 P1 Z1',
      '; Retract from the touch plate',
      'G91',
      'G0 Z2',
      'G90',
    ].join('\n'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('opens a preview with the controlled probe draft without sending G-code', async () => {
    renderAppUI(<Probe />);

    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    fireEvent.click(screen.getByRole('button', { name: 'G38.3' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Probe Depth' }), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Probe Axis X' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('G38.3 X-12 F100');
    expect(dialog).toHaveTextContent('G10 L20 P1 X1');
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockConfigSet).toHaveBeenCalledWith('probeAxis', 'X');
    expect(mockConfigSet).toHaveBeenCalledWith('probeCommand', 'G38.3');
    expect(mockConfigSet).toHaveBeenCalledWith('probeDepth', 12);
  });

  test('opens a probe preview from keyboard-only draft entry', async () => {
    const user = userEvent.setup();
    renderAppUI(<Probe />);

    const depth = screen.getByRole('spinbutton', { name: 'Probe Depth' });
    depth.focus();
    await user.clear(depth);
    await user.keyboard('12');

    const openPreview = screen.getByRole('button', { name: 'Probe Axis Z' });
    openPreview.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mockConfigSet).toHaveBeenCalledWith('probeDepth', 12);
    expect(mockCommand).not.toHaveBeenCalled();
  });

  test('does not open a probe preview while disconnected or while the workflow is active', () => {
    mockStore.connection.state = CONNECTION_STATE_DISCONNECTED;
    const { rerender } = renderAppUI(<Probe />);

    expect(screen.getByRole('button', { name: 'Probe Axis Z' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Probe Axis Z' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    mockStore.connection.state = CONNECTION_STATE_CONNECTED;
    mockStore.controller.workflow.state = 'running';
    rerender(<Probe />);

    expect(screen.getByRole('button', { name: 'Probe Axis Z' })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('does not open a probe preview from an invalid draft', () => {
    renderAppUI(<Probe />);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Probe Depth' }), {
      target: { value: '' },
    });

    expect(screen.getByRole('button', { name: 'Probe Axis Z' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Probe Axis Z' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCommand).not.toHaveBeenCalled();
  });
});
