import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn((name, _payload, callback) => {
  if (name === 'autolevel:getProbeState' && callback) {
    callback(null, {});
  }
});
const mockLoadGCode = jest.fn();
const mockWidgetConfigSet = jest.fn();
const mockSavedScanSettings = {};
let mockProbeStateResponse = {};
const mockControllerListeners = new Map();
const mockController = {
  addListener: jest.fn((name, listener) => {
    mockControllerListeners.set(name, listener);
  }),
  command: mockCommand,
  connection: { ident: 'serial' },
  removeListener: jest.fn((name, listener) => {
    if (mockControllerListeners.get(name) === listener) {
      mockControllerListeners.delete(name);
    }
  }),
  state: {
    parserstate: { modal: { units: 'G21' } },
    status: { machineState: 'Idle' },
  },
  context: { xmin: 0, xmax: 10, ymin: 0, ymax: 10, zmin: -1, zmax: 0 },
  type: 'Grbl',
  workflow: { state: 'idle' },
};

const mockPublish = jest.fn();
const mockSubscribe = jest.fn((name, callback) => {
  const token = `${name}-token`;
  mockPubSubSubscriptions.set(token, callback);
  return token;
});
const mockUnsubscribe = jest.fn(token => mockPubSubSubscriptions.delete(token));
const mockPubSubSubscriptions = new Map();

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('pubsub-js', () => ({
  publish: (...args) => mockPublish(...args),
  subscribe: (...args) => mockSubscribe(...args),
  unsubscribe: (...args) => mockUnsubscribe(...args),
}));

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    loadGCode: (...args) => mockLoadGCode(...args),
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: (value, options = {}) => value.replace(/{{(\w+)}}/g, (_match, key) => options[key]),
  },
}));

jest.mock('@app/widgets/shared/WidgetConfig', () => ({
  __esModule: true,
  default: class MockWidgetConfig {
    get(path, fallback) {
      if (Object.prototype.hasOwnProperty.call(mockSavedScanSettings, path)) {
        return mockSavedScanSettings[path];
      }
      const values = {
        stepX: 5,
        stepY: 5,
        startX: 0,
        startY: 0,
        endX: 10,
        endY: 10,
        clearanceZ: 5,
        startZ: 2,
        endZ: -1,
        feedrate: 100,
      };
      return Object.prototype.hasOwnProperty.call(values, path) ? values[path] : fallback;
    }

    set(path, value) {
      mockWidgetConfigSet(path, value);
      if (path === 'scanPattern' || path === 'scanDirection') {
        mockSavedScanSettings[path] = value;
      }
    }
  },
}));

const { useLoadGCodeMutation } = require('@app/queries/gcode');
const { default: AutolevelWidget, getValidationErrors } = require('../index');

const widgetProps = {
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  sortable: { filterClassName: '', handleClassName: '' },
  view: 'normal',
  widgetId: 'autolevel-test',
};

const emitController = (name, ...args) => {
  act(() => {
    mockControllerListeners.get(name)?.(...args);
  });
};

const getPublication = name => mockPublish.mock.calls.filter(([eventName]) => eventName === name);

const selectScanOption = async (control, option) => {
  const toggle = screen.getByRole('button', { name: control });
  fireEvent.click(toggle);
  const item = await screen.findByRole('menuitem', { name: option });
  await waitFor(() => expect(document.activeElement.closest('[role="menu"]')).not.toBeNull());
  fireEvent.click(item);
  await waitFor(() => expect(toggle).toHaveFocus());
};

function GCodeMutationProbe() {
  const mutation = useLoadGCodeMutation();
  return (
    <button
      type="button"
      onClick={() => mutation.mutate({
        meta: { name: 'part.gcode', gcode: 'G1 X1' },
        context: { xmin: 1 },
      })}
    >
      Load G-code
    </button>
  );
}

const startFullProbe = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
  await screen.findByText('Probing progress: 0/9 points');
};

const emitProbePoint = (current, z = -0.2) => {
  emitController('autolevel:update', {
    current,
    total: 9,
    probedPos: { x: current - 1, y: 0, z },
    minZ: z,
    maxZ: -0.2,
    maxDeviation: Math.abs(z + 0.2),
  });
};

describe('Autolevel workflow owner', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockCommand.mockClear();
    mockCommand.mockImplementation((name, _payload, callback) => {
      if (name === 'autolevel:getProbeState' && callback) {
        callback(null, mockProbeStateResponse);
      }
    });
    mockLoadGCode.mockReset();
    mockWidgetConfigSet.mockReset();
    Object.keys(mockSavedScanSettings).forEach(key => delete mockSavedScanSettings[key]);
    mockProbeStateResponse = {};
    mockController.addListener.mockClear();
    mockController.removeListener.mockClear();
    mockPublish.mockClear();
    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();
    mockControllerListeners.clear();
    mockPubSubSubscriptions.clear();
  });

  test('selects patterns and direction with focused menus, previews, and a full-mode command', async () => {
    const user = userEvent.setup();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      const preview = screen.getByRole('group', { name: 'Scan pattern preview' });
      expect(within(preview).getByRole('img', { name: 'Raster' })).toHaveAttribute('data-selected', '');

      fireEvent.click(screen.getByRole('button', { name: 'Scan Pattern' }));
      const raster = await screen.findByRole('menuitem', { name: 'Raster' });
      await waitFor(() => expect(document.activeElement.closest('[role="menu"]')).not.toBeNull());
      await user.keyboard('{Home}');
      await waitFor(() => expect(raster).toHaveFocus());
      expect(raster).toHaveAttribute('data-selected', '');
      expect(raster).toHaveAttribute('aria-current', 'true');
      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Zigzag' })).toHaveFocus());
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveFocus());
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Zigzag');
      expect(within(preview).getByRole('img', { name: 'Zigzag' })).toHaveAttribute('data-selected', '');
      expect(within(preview).getByRole('img', { name: 'Raster' })).not.toHaveAttribute('data-selected');

      const selectPattern = async name => {
        await selectScanOption('Scan Pattern', name);
        expect(within(preview).getByRole('img', { name })).toHaveAttribute('data-selected', '');
        expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent(name);
      };
      await selectPattern('Spiral In');
      await selectPattern('Spiral Out');
      await selectPattern('Raster');
      await selectPattern('Spiral Out');
      fireEvent.click(screen.getByRole('button', { name: 'Scan Pattern' }));
      const selectedPattern = await screen.findByRole('menuitem', { name: 'Spiral Out' });
      await waitFor(() => expect(document.activeElement.closest('[role="menu"]')).not.toBeNull());
      expect(selectedPattern).toHaveAttribute('data-selected', '');
      expect(selectedPattern).toHaveAttribute('aria-current', 'true');
      fireEvent.click(selectedPattern);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveFocus());
      await selectScanOption('Scan Direction', 'Along Y Axis');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along Y Axis');
      fireEvent.click(screen.getByRole('button', { name: 'Scan Direction' }));
      const selectedDirection = await screen.findByRole('menuitem', { name: 'Along Y Axis' });
      await waitFor(() => expect(document.activeElement.closest('[role="menu"]')).not.toBeNull());
      expect(selectedDirection).toHaveAttribute('data-selected', '');
      expect(selectedDirection).toHaveAttribute('aria-current', 'true');
      fireEvent.click(selectedDirection);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveFocus());
      await selectScanOption('Scan Direction', 'Along X Axis');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along X Axis');
      await selectScanOption('Scan Direction', 'Along Y Axis');
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [],
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: 'mm',
          snapX: 2.5,
          snapY: 2.5,
          stepX: 5,
          stepY: 5,
          scanPattern: 'spiral-out',
          scanDirection: 'y',
          interactable: true,
        },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
      await screen.findByText('Probing progress: 0/9 points');
      expect(mockCommand).toHaveBeenCalledWith('autolevel:start', {
        mode: 'full',
        startX: 0,
        endX: 10,
        stepX: 5,
        startY: 0,
        endY: 10,
        stepY: 5,
        clearanceZ: 5,
        startZ: 2,
        endZ: -1,
        feedrate: 100,
        scanPattern: 'spiral-out',
        scanDirection: 'y',
      });
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toBeDisabled();
      emitProbePoint(1);
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [{ x: 0, y: 0, z: -0.2 }],
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: 'mm',
          snapX: 2.5,
          snapY: 2.5,
          stepX: 5,
          stepY: 5,
          scanPattern: 'spiral-out',
          scanDirection: 'y',
          interactable: false,
        },
      });
      emitController('autolevel:complete');
      expect(screen.getByText('Probe Compensation')).toBeInTheDocument();
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', expect.objectContaining({
        config: expect.objectContaining({
          stepX: 5, stepY: 5, scanPattern: 'spiral-out', scanDirection: 'y', interactable: false,
        }),
      }));
      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G20' } },
        status: { machineState: 'Idle' },
      });
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', expect.objectContaining({
        config: expect.objectContaining({
          units: 'in',
          stepX: 0.1969,
          stepY: 0.1969,
          scanPattern: 'spiral-out',
          scanDirection: 'y',
          interactable: false,
        }),
      }));
    } finally {
      view.dispose();
    }
  });

  test('persists enum strings across unit changes and a remount', async () => {
    let view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      await selectScanOption('Scan Pattern', 'Spiral In');
      await selectScanOption('Scan Direction', 'Along Y Axis');
      expect(mockSavedScanSettings).toEqual({ scanPattern: 'spiral-in', scanDirection: 'y' });
      expect(mockWidgetConfigSet).toHaveBeenCalledWith('scanPattern', 'spiral-in');
      expect(mockWidgetConfigSet).toHaveBeenCalledWith('scanDirection', 'y');
      mockWidgetConfigSet.mockClear();

      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G20' } },
        status: { machineState: 'Idle' },
      });
      expect(mockWidgetConfigSet).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Spiral In');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along Y Axis');
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', expect.objectContaining({
        config: expect.objectContaining({
          units: 'in',
          stepX: 0.1969,
          stepY: 0.1969,
          scanPattern: 'spiral-in',
          scanDirection: 'y',
        }),
      }));
      await selectScanOption('Scan Pattern', 'Spiral Out');
      expect(mockSavedScanSettings).toEqual({ scanPattern: 'spiral-out', scanDirection: 'y' });
      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G21' } },
        status: { machineState: 'Idle' },
      });
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Spiral Out');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along Y Axis');
      view.dispose();
      view = renderAppUI(<AutolevelWidget {...widgetProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Spiral Out');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along Y Axis');
      expect(within(screen.getByRole('group', { name: 'Scan pattern preview' }))
        .getByRole('img', { name: 'Spiral Out' })).toHaveAttribute('data-selected', '');
    } finally {
      view.dispose();
    }
  });

  test.each([
    ['unknown', 'diagonal'],
    [null, 123],
  ])('normalizes invalid stored scan settings %p and %p', (scanPattern, scanDirection) => {
    Object.assign(mockSavedScanSettings, { scanPattern, scanDirection });
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Raster');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along X Axis');
      expect(mockSavedScanSettings).toEqual({ scanPattern: 'raster', scanDirection: 'x' });
      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G20' } },
        status: { machineState: 'Idle' },
      });
      expect(screen.getByRole('button', { name: 'Scan Pattern' })).toHaveTextContent('Raster');
      expect(screen.getByRole('button', { name: 'Scan Direction' })).toHaveTextContent('Along X Axis');
    } finally {
      view.dispose();
    }
  });

  test('rejects inverted bounds and restores each last valid bound on blur', () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      const endX = screen.getByRole('spinbutton', { name: 'End X' });
      const endY = screen.getByRole('spinbutton', { name: 'End Y' });
      fireEvent.focus(endX);
      fireEvent.change(endX, { target: { value: '-1' } });
      fireEvent.focus(endY);
      fireEvent.change(endY, { target: { value: '-2' } });
      expect(screen.getByText('End X must be greater than or equal to Start X')).toBeInTheDocument();
      expect(screen.getByText('End Y must be greater than or equal to Start Y')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Probing' })).toBeDisabled();
      expect(mockCommand).not.toHaveBeenCalledWith('autolevel:start', expect.anything());
      fireEvent.blur(endY);
      fireEvent.blur(endX);
      expect(endX).toHaveValue(10);
      expect(endY).toHaveValue(10);
      expect(screen.getByRole('button', { name: 'Start Probing' })).toBeEnabled();
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', expect.objectContaining({
        config: expect.objectContaining({ endX: 10, endY: 10, scanPattern: 'raster', scanDirection: 'x' }),
      }));

      fireEvent.focus(endX);
      fireEvent.change(endX, { target: { value: '0' } });
      fireEvent.blur(endX);
      expect(endX).toHaveValue(0);
      expect(screen.getByRole('button', { name: 'Start Probing' })).toBeEnabled();
    } finally {
      view.dispose();
    }
  });

  test('hides the grid for empty or zero steps and restores it after correction', () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      for (const name of ['Step X', 'Step Y']) {
        const step = screen.getByRole('spinbutton', { name });
        for (const invalid of ['', '0']) {
          fireEvent.change(step, { target: { value: invalid } });
          expect(within(diagram).queryByText('START')).not.toBeInTheDocument();
          expect(within(diagram).queryByText('END')).not.toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Start Probing' })).toBeDisabled();
          expect(screen.getByText('0 points')).toBeInTheDocument();
        }
        expect(mockCommand).not.toHaveBeenCalledWith('autolevel:start', expect.anything());
        fireEvent.change(step, { target: { value: '5' } });
        expect(within(diagram).getByText('START')).toBeInTheDocument();
        expect(within(diagram).getByText('END')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start Probing' })).toBeEnabled();
      }
    } finally {
      view.dispose();
    }
  });

  test('rejects non-finite values in validation', () => {
    const errors = getValidationErrors({
      startX: Infinity,
      endX: 10,
      stepX: 5,
      startY: 0,
      endY: 10,
      stepY: 5,
      clearanceZ: 5,
      startZ: 2,
      endZ: -1,
      feedrate: 100,
    });
    expect(errors).toEqual({ startX: 'Must be a number' });
  });

  test('uses epsilon-corrected point counts in setup, confirmation, and progress', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      fireEvent.change(screen.getByRole('spinbutton', { name: 'End X' }), { target: { value: '0.3' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: 'End Y' }), { target: { value: '0' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Step X' }), { target: { value: '0.1' } });
      expect(screen.getByText('4 points')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      expect(within(screen.getByRole('dialog')).getByText('4 points')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
      await screen.findByText('Probing progress: 0/4 points');
      expect(mockCommand).toHaveBeenCalledWith('autolevel:start', expect.objectContaining({
        endX: 0.3, endY: 0, stepX: 0.1,
      }));
    } finally {
      view.dispose();
    }
  });

  test('does not republish a delayed setup overlay after probing begins', async () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      await startFullProbe();
      mockPublish.mockClear();
      act(() => jest.advanceTimersByTime(50));
      expect(getPublication('autolevel:showProbeVisualization')).toHaveLength(0);
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('leaves the single-point test command unchanged when scan options are selected', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      await selectScanOption('Scan Pattern', 'Zigzag');
      await selectScanOption('Scan Direction', 'Along Y Axis');
      fireEvent.click(screen.getByRole('button', { name: 'Test Probe' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Test Probe' }));
      await waitFor(() => expect(mockCommand).toHaveBeenCalledWith('autolevel:start', {
        mode: 'test', clearanceZ: 5, startZ: 2, endZ: -1, feedrate: 100,
      }));
    } finally {
      view.dispose();
    }
  });

  test('loads G-code through the query mutation with metadata and controller context', async () => {
    mockLoadGCode.mockResolvedValue({ body: { name: 'part.gcode', gcode: 'G1 X1' } });
    const view = renderAppUI(<GCodeMutationProbe />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Load G-code' }));
      await waitFor(() => expect(mockLoadGCode).toHaveBeenCalledWith(
        { name: 'part.gcode', gcode: 'G1 X1' },
        { xmin: 1 },
      ));
      expect(mockLoadGCode).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
    }
  });

  test('starts on the landing view with an idle empty probe session', () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      expect(screen.getByRole('button', { name: 'Start New Probe' })).toBeInTheDocument();
      expect(screen.queryByText('Probing progress:')).not.toBeInTheDocument();
      expect(screen.queryByText('Points probed:')).not.toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('hides the old overlay and then publishes a fresh interactive probe area', () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));

      expect(mockPublish).toHaveBeenNthCalledWith(1, 'autolevel:hideProbeVisualization');

      act(() => jest.advanceTimersByTime(50));

      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [],
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: 'mm',
          snapX: 2.5,
          snapY: 2.5,
          stepX: 5,
          stepY: 5,
          scanPattern: 'raster',
          scanDirection: 'x',
          interactable: true,
        },
      });
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('republishes fresh interactive visualization when setup bounds or steps change', () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      mockPublish.mockClear();

      fireEvent.change(view.container.querySelector('#autolevel-step-x'), {
        target: { value: '2' },
      });
      fireEvent.change(view.container.querySelector('#autolevel-end-y'), {
        target: { value: '12' },
      });

      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [],
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 12,
          units: 'mm',
          snapX: 1,
          snapY: 2.5,
          stepX: 2,
          stepY: 5,
          scanPattern: 'raster',
          scanDirection: 'x',
          interactable: true,
        },
      });
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('republishes fresh bounds on a controller unit change without persisting display values', () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      mockPublish.mockClear();
      mockWidgetConfigSet.mockClear();

      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G20' } },
        status: { machineState: 'Idle' },
      });

      expect(mockWidgetConfigSet).not.toHaveBeenCalled();
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', expect.objectContaining({
        probeData: [],
        config: expect.objectContaining({
          startX: 0,
          startY: 0,
          endX: 0.3937,
          endY: 0.3937,
          units: 'in',
          snapX: 0.09845,
          snapY: 0.09845,
          stepX: 0.1969,
          stepY: 0.1969,
          scanPattern: 'raster',
          scanDirection: 'x',
          interactable: true,
        }),
      }));
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('blocks a full probe start when a setup field is invalid', async () => {
    const user = userEvent.setup();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));

      const stepX = view.container.querySelector('#autolevel-step-x');
      expect(stepX).toHaveAttribute('aria-label', 'Step X');
      stepX.focus();
      await user.clear(stepX);
      await user.keyboard('0');

      const startProbing = screen.getByRole('button', { name: 'Start Probing' });
      expect(startProbing).toBeDisabled();
      startProbing.focus();
      await user.keyboard('{Enter}');

      expect(mockCommand).not.toHaveBeenCalledWith('autolevel:start', expect.anything());
    } finally {
      view.dispose();
    }
  });

  test('confirms a full probe once with display-unit values and computed total points', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
      await screen.findByText('Probing progress: 0/9 points');

      expect(mockCommand).toHaveBeenCalledWith('autolevel:start', {
        mode: 'full',
        startX: 0,
        endX: 10,
        stepX: 5,
        startY: 0,
        endY: 10,
        stepY: 5,
        clearanceZ: 5,
        startZ: 2,
        endZ: -1,
        feedrate: 100,
        scanPattern: 'raster',
        scanDirection: 'x',
      });
      expect(screen.getByText('Probing progress: 0/9 points')).toBeInTheDocument();
      expect(getPublication('autolevel:hideProbeVisualization')).toHaveLength(2);
    } finally {
      view.dispose();
    }
  });

  test('appends controller probe updates and publishes all points as a read-only visualization', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
      await screen.findByText('Probing progress: 0/9 points');
      mockPublish.mockClear();

      emitController('autolevel:update', {
        current: 1,
        total: 9,
        probedPos: { x: 0, y: 0, z: -0.2 },
        minZ: -0.2,
        maxZ: -0.2,
        maxDeviation: 0,
      });
      emitController('autolevel:update', {
        current: 2,
        total: 9,
        probedPos: { x: 5, y: 0, z: -0.3 },
        minZ: -0.3,
        maxZ: -0.2,
        maxDeviation: 0.1,
      });

      expect(screen.getByText('Probing progress: 2/9 points')).toBeInTheDocument();
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [
          { x: 0, y: 0, z: -0.2 },
          { x: 5, y: 0, z: -0.3 },
        ],
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: 'mm',
          snapX: 2.5,
          snapY: 2.5,
          stepX: 5,
          stepY: 5,
          scanPattern: 'raster',
          scanDirection: 'x',
          interactable: false,
        },
      });
    } finally {
      view.dispose();
    }
  });

  test('completes into Apply and does not accept a later point after stop cleanup', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
      await screen.findByText('Probing progress: 0/9 points');
      emitController('autolevel:update', {
        current: 1,
        total: 9,
        probedPos: { x: 0, y: 0, z: -0.2 },
        minZ: -0.2,
        maxZ: -0.2,
        maxDeviation: 0,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Stop Probing' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Stop Probing' }).at(-1));
      expect(mockCommand).toHaveBeenCalledWith('autolevel:stop');
      expect(mockCommand.mock.calls.filter(([name]) => name === 'autolevel:stop')).toHaveLength(1);

      mockPublish.mockClear();
      emitController('autolevel:update', {
        current: 2,
        total: 9,
        probedPos: { x: 5, y: 0, z: -0.3 },
        minZ: -0.3,
        maxZ: -0.2,
        maxDeviation: 0.1,
      });
      expect(getPublication('autolevel:showProbeVisualization')).toHaveLength(0);
      expect(screen.queryByText('Probing progress: 2/9 points')).not.toBeInTheDocument();

      emitController('autolevel:complete');
      expect(screen.getByText('Probe Compensation')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('hides the overlay and rejects late updates after a probing disconnect', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      await startFullProbe();
      emitProbePoint(1, -0.2);
      mockPublish.mockClear();

      emitController('connection:error', new Error('serial disconnected'));
      expect(getPublication('autolevel:hideProbeVisualization')).toHaveLength(1);

      emitProbePoint(2, -0.3);
      expect(getPublication('autolevel:showProbeVisualization')).toHaveLength(0);
      expect(screen.queryByText('Probing progress: 2/9 points')).not.toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test.each([
    ['in-progress', 2, 4, 'Probing progress: 2/4 points', 'Stop Probing'],
    ['completed', 4, 4, null, 'Probe Compensation'],
  ])('restores a mounted %s probe session and read-only visualization', (_label, count, total, progressText, viewText) => {
    const probedPositions = Array.from({ length: count }, (_value, index) => ({
      x: index * 5,
      y: 0,
      z: -0.2 - index * 0.1,
    }));
    mockProbeStateResponse = {
      state: {
        probedPositions,
        probePoints: Array.from({ length: total }, (_value, index) => ({ x: index, y: 0 })),
        minZ: -0.5,
        maxZ: -0.2,
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
        },
      },
    };
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      expect(screen.getByText(viewText)).toBeInTheDocument();
      if (progressText) {
        expect(screen.getByText(progressText)).toBeInTheDocument();
      }
      expect(mockPublish).toHaveBeenCalledWith('autolevel:showProbeVisualization', {
        probeData: probedPositions,
        config: {
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 10,
          units: 'mm',
          snapX: 2.5,
          snapY: 2.5,
          stepX: 5,
          stepY: 5,
          scanPattern: 'raster',
          scanDirection: 'x',
          interactable: false,
        },
      });
    } finally {
      view.dispose();
    }
  });

  test('uses Tonic widget header-control icons and Font Awesome only for unsupported commands', async () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      expect(view.container.querySelector('[data-icon="MenuIcon"]')).toBeInTheDocument();
      expect(view.container.querySelector('[data-icon="ChevronUpIcon"]')).toBeInTheDocument();
      expect(view.container.querySelector('[data-icon="MoreIcon"]')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'More' }));

      await waitFor(() => expect(screen.getByText('Enter Full Screen')).toBeInTheDocument());

      expect(document.querySelector('[data-icon="expand"]')).toBeInTheDocument();
      expect(document.querySelector('[data-icon="code-branch"]')).toBeInTheDocument();
      expect(document.querySelector('[data-icon="CloseIcon"]')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('rounds one probe-area PubSub update and removes it with controller listeners on unmount', () => {
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      const areaSubscription = mockSubscribe.mock.calls.find(([name]) => name === 'autolevel:probeAreaUpdated');
      expect(areaSubscription).toBeDefined();
      act(() => areaSubscription[1]('autolevel:probeAreaUpdated', {
        startX: 1.234,
        startY: 2.345,
        endX: 11.236,
        endY: 12.347,
      }));

      expect(view.container.querySelector('input[name="startX"]')).toHaveValue(1.23);
      expect(view.container.querySelector('input[name="startY"]')).toHaveValue(2.35);
      expect(view.container.querySelector('input[name="endX"]')).toHaveValue(11.24);
      expect(view.container.querySelector('input[name="endY"]')).toHaveValue(12.35);
    } finally {
      view.dispose();
    }

    expect(mockUnsubscribe).toHaveBeenCalledWith('autolevel:probeAreaUpdated-token');
    expect(mockController.removeListener.mock.calls.map(([name]) => name)).toEqual(expect.arrayContaining([
      'connection:open',
      'connection:change',
      'workflow:state',
      'controller:state',
      'autolevel:update',
      'autolevel:complete',
    ]));
  });

  test('compensates only after an explicit file action and publishes the loaded response', async () => {
    const compensatedGcode = 'G1 X1\nG1 Z-1';
    mockLoadGCode.mockResolvedValue({ body: { name: 'AL_part.gcode', gcode: compensatedGcode } });
    mockCommand.mockImplementation((name, payload, callback) => {
      if (name === 'autolevel:getProbeState' && callback) {
        callback(null, {});
      }
      if (name === 'autolevel:applyProbeCompensation' && callback) {
        callback(null, { compensatedGcode });
      }
    });
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      expect(mockLoadGCode).not.toHaveBeenCalled();
      await startFullProbe();
      emitProbePoint(1, -0.2);
      emitProbePoint(2, -0.3);
      emitProbePoint(3, -0.1);
      emitController('autolevel:complete');
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });

      await waitFor(() => expect(mockLoadGCode).toHaveBeenCalledWith(
        { name: 'AL_part.gcode', gcode: compensatedGcode },
        mockController.context,
      ));
      expect(mockCommand.mock.calls.filter(([name]) => name === 'autolevel:applyProbeCompensation')).toHaveLength(1);
      expect(mockPublish).toHaveBeenCalledWith('gcode:load', {
        name: 'AL_part.gcode',
        gcode: compensatedGcode,
        isProbeCompensationApplied: true,
      });
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });

  test('keeps the original compensation workflow data when loading compensated G-code fails', async () => {
    const compensatedGcode = 'G1 X1\nG1 Z-1';
    mockLoadGCode
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce({ body: { name: 'AL_part.gcode', gcode: compensatedGcode } });
    mockCommand.mockImplementation((name, _payload, callback) => {
      if (name === 'autolevel:getProbeState' && callback) {
        callback(null, {});
      }
      if (name === 'autolevel:applyProbeCompensation' && callback) {
        callback(null, { compensatedGcode });
      }
    });
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      await startFullProbe();
      emitProbePoint(1, -0.2);
      emitProbePoint(2, -0.3);
      emitProbePoint(3, -0.1);
      emitController('autolevel:complete');
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });

      await waitFor(() => expect(screen.getByText('Failed to load compensated G-code to workspace')).toBeInTheDocument());
      expect(getPublication('gcode:load')).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(mockLoadGCode).toHaveBeenCalledTimes(2));
      const compensationCalls = mockCommand.mock.calls.filter(([name]) => name === 'autolevel:applyProbeCompensation');
      expect(compensationCalls).toHaveLength(2);
      expect(compensationCalls[1][1]).toEqual({
        gcode: 'G1 X1',
        probeData: [
          { x: 0, y: 0, z: -0.2 },
          { x: 1, y: 0, z: -0.3 },
          { x: 2, y: 0, z: -0.1 },
        ],
      });
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });
});
