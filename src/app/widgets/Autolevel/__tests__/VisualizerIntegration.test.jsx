import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockControllerListeners = new Map();
const mockPubsubListeners = new Map();
const mockCommand = jest.fn((name, _payload, callback) => {
  mockTrace.push(name);
  if (name === 'autolevel:getProbeState' && callback) {
    callback(null, {});
  }
});
const mockPublish = jest.fn();
const mockLoadGCode = jest.fn();
const mockConfigSet = jest.fn();
const mockTrace = [];
const mockVisualizerEngine = {
  dispose: jest.fn(),
  hideProbe: jest.fn(),
  resize: jest.fn(),
  showProbe: jest.fn(),
  update: jest.fn(),
  updateProbe: jest.fn(),
};
const mockPubsub = {
  publish: (name, data) => {
    mockTrace.push(name);
    if (data === undefined) {
      mockPublish(name);
    } else {
      mockPublish(name, data);
    }
    mockPubsubListeners.get(`${name}-token`)?.(name, data);
  },
  subscribe: (name, listener) => {
    const token = `${name}-token`;
    mockPubsubListeners.set(token, listener);
    return token;
  },
  unsubscribe: token => mockPubsubListeners.delete(token),
};
const mockController = {
  addListener: jest.fn((name, listener) => mockControllerListeners.set(name, listener)),
  command: mockCommand,
  connection: { ident: 'serial' },
  context: { xmin: 0, xmax: 10, ymin: 0, ymax: 10, zmin: -1, zmax: 0 },
  removeListener: jest.fn((name, listener) => {
    if (mockControllerListeners.get(name) === listener) {
      mockControllerListeners.delete(name);
    }
  }),
  state: {
    parserstate: { modal: { units: 'G21' } },
    status: { machineState: 'Idle' },
  },
  type: 'Grbl',
  workflow: { state: 'idle' },
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));
jest.mock('pubsub-js', () => ({ __esModule: true, default: mockPubsub, ...mockPubsub }));
jest.mock('@app/api', () => ({
  __esModule: true,
  default: { loadGCode: (...args) => mockLoadGCode(...args) },
}));
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: (value, options = {}) => value.replace(/{{(\w+)}}/g, (_match, key) => options[key]) },
}));
jest.mock('@app/widgets/shared/WidgetConfig', () => ({
  __esModule: true,
  default: class MockWidgetConfig {
    get(path, fallback) {
      const values = {
        clearanceZ: 5,
        endX: 10,
        endY: 10,
        endZ: -1,
        feedrate: 100,
        startX: 0,
        startY: 0,
        startZ: 2,
        stepX: 5,
        stepY: 5,
      };
      return Object.prototype.hasOwnProperty.call(values, path) ? values[path] : fallback;
    }

    set(...args) {
      mockConfigSet(...args);
    }
  },
}));
jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn((_path, fallback) => fallback),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}));
jest.mock('../../Visualizer/VisualizerEngine', () => ({
  createVisualizerEngine: jest.fn(() => mockVisualizerEngine),
}));

const AutolevelWidget = require('../index').default;
const useVisualizer = require('../../Visualizer/useVisualizer').default;

const widgetProps = {
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  sortable: { filterClassName: '', handleClassName: '' },
  view: 'normal',
  widgetId: 'autolevel-r5',
};

const emitController = (name, ...args) => {
  act(() => mockControllerListeners.get(name)(...args));
};

const emitProbePoint = (current, z) => {
  emitController('autolevel:update', {
    current,
    total: 9,
    maxDeviation: Math.abs(z + 0.2),
    maxZ: -0.1,
    minZ: z,
    probedPos: { x: current - 1, y: 0, z },
  });
};

const startFullProbe = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
  await act(() => {
    fireEvent.click(screen.getAllByRole('button', { name: 'Start Probing' }).at(-1));
    return Promise.resolve();
  });
  await screen.findByText('Probing progress: 0/9 points');
};

function VisualizerProbe() {
  const { containerRef } = useVisualizer({ viewState: {} });
  return <div ref={containerRef} />;
}

describe('Autolevel Visualizer integration acceptance', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockControllerListeners.clear();
    mockPubsubListeners.clear();
    mockCommand.mockImplementation((name, _payload, callback) => {
      mockTrace.push(name);
      if (name === 'autolevel:getProbeState' && callback) {
        callback(null, {});
      }
    });
    mockLoadGCode.mockReset();
    mockTrace.length = 0;
    Object.values(mockVisualizerEngine).forEach(mock => mock.mockClear());
  });

  test('publishes the interactive area, accepts drag bounds, and sends display-unit updates', () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:hideProbeVisualization');

      act(() => jest.advanceTimersByTime(50));
      expect(mockPublish).toHaveBeenLastCalledWith('autolevel:showProbeVisualization', {
        probeData: [],
        config: {
          endX: 10,
          endY: 10,
          interactable: true,
          snapX: 2.5,
          snapY: 2.5,
          startX: 0,
          startY: 0,
          units: 'mm',
        },
      });

      const areaListener = mockPubsubListeners.get('autolevel:probeAreaUpdated-token');
      act(() => areaListener('autolevel:probeAreaUpdated', {
        startX: 1.234,
        startY: 2.345,
        endX: 11.236,
        endY: 12.347,
      }));
      expect(view.container.querySelector('input[name="startX"]')).toHaveValue(1.23);
      expect(view.container.querySelector('input[name="endY"]')).toHaveValue(12.35);

      mockPublish.mockClear();
      fireEvent.blur(view.container.querySelector('input[name="endY"]'));
      expect(mockPublish).toHaveBeenCalledWith('autolevel:updateProbeVisualization', {
        config: {
          startX: 1.23,
          startY: 2.35,
          endX: 11.24,
          endY: 12.35,
          units: 'mm',
        },
      });
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('delivers metric and imperial probe events to the Visualizer engine', () => {
    jest.useFakeTimers();
    const view = renderAppUI(
      <>
        <AutolevelWidget {...widgetProps} />
        <VisualizerProbe />
      </>,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start New Probe' }));
      act(() => jest.advanceTimersByTime(50));
      expect(mockVisualizerEngine.showProbe).toHaveBeenLastCalledWith(expect.objectContaining({
        config: expect.objectContaining({ startX: 0, endX: 10, units: 'mm' }),
      }));

      emitController('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G20' } },
        status: { machineState: 'Idle' },
      });
      expect(mockVisualizerEngine.showProbe).toHaveBeenLastCalledWith(expect.objectContaining({
        config: expect.objectContaining({
          startX: 0,
          endX: 0.3937,
          units: 'in',
        }),
      }));

      const areaListener = mockPubsubListeners.get('autolevel:probeAreaUpdated-token');
      act(() => areaListener('autolevel:probeAreaUpdated', {
        startX: 1.23,
        startY: 2.34,
        endX: 3.45,
        endY: 4.56,
      }));
      fireEvent.blur(view.container.querySelector('input[name="endY"]'));
      expect(mockVisualizerEngine.updateProbe).toHaveBeenLastCalledWith({
        config: {
          startX: 1.23,
          startY: 2.34,
          endX: 3.45,
          endY: 4.56,
          units: 'in',
        },
      });
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('preserves start, stop, and hide ordering for a probe workflow', async () => {
    jest.useFakeTimers();
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      mockCommand.mockClear();
      mockPublish.mockClear();
      mockTrace.length = 0;
      await startFullProbe();

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
      });
      expect(mockPublish.mock.calls.map(([eventName]) => eventName)).toEqual([
        'autolevel:hideProbeVisualization',
        'autolevel:hideProbeVisualization',
      ]);

      fireEvent.click(screen.getByRole('button', { name: 'Stop Probing' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Stop Probing' }).at(-1));
      expect(mockCommand.mock.calls.map(([name]) => name)).toEqual([
        'autolevel:start',
        'autolevel:stop',
      ]);
      expect(mockCommand).toHaveBeenNthCalledWith(2, 'autolevel:stop');
      expect(mockPublish.mock.calls.map(([eventName]) => eventName)).toEqual([
        'autolevel:hideProbeVisualization',
        'autolevel:hideProbeVisualization',
        'autolevel:hideProbeVisualization',
      ]);
      expect(mockTrace).toEqual([
        'autolevel:hideProbeVisualization',
        'autolevel:hideProbeVisualization',
        'autolevel:start',
        'autolevel:stop',
        'autolevel:hideProbeVisualization',
      ]);
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });

  test('applies completed probe data before loading compensated G-code and publishing its metadata', async () => {
    jest.useFakeTimers();
    const compensatedGcode = 'G1 X1\nG1 Z-1';
    mockLoadGCode.mockImplementation(() => {
      mockTrace.push('loadGCode');
      return Promise.resolve({ body: { name: 'AL_part.gcode', gcode: compensatedGcode } });
    });
    mockCommand.mockImplementation((name, _payload, callback) => {
      mockTrace.push(name);
      if (name === 'autolevel:getProbeState' && callback) {
        callback(null, {});
      }
      if (name === 'autolevel:applyProbeCompensation' && callback) {
        callback(null, { compensatedGcode });
      }
    });
    const view = renderAppUI(<AutolevelWidget {...widgetProps} />);

    try {
      mockController.context = {
        wposx: 1.5,
        wposy: -2.5,
        wposz: 0.25,
        xmin: 1,
        xmax: 11,
        ymin: -2,
        ymax: 8,
        zmin: -1,
        zmax: 0,
      };
      await startFullProbe();
      act(() => jest.advanceTimersByTime(50));
      emitProbePoint(1, -0.2);
      emitProbePoint(2, -0.3);
      emitProbePoint(3, -0.1);
      emitController('autolevel:complete');
      mockTrace.length = 0;
      mockPublish.mockClear();

      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });

      await waitFor(() => expect(mockLoadGCode).toHaveBeenCalledWith(
        { name: 'AL_part.gcode', gcode: compensatedGcode },
        {
          wposx: 1.5,
          wposy: -2.5,
          wposz: 0.25,
          xmin: 1,
          xmax: 11,
          ymin: -2,
          ymax: 8,
          zmin: -1,
          zmax: 0,
        },
      ));
      expect(mockLoadGCode).toHaveBeenCalledTimes(1);
      expect(mockCommand.mock.calls.filter(([name]) => name === 'autolevel:applyProbeCompensation')).toEqual([
        ['autolevel:applyProbeCompensation', {
          gcode: 'G1 X1',
          probeData: [
            { x: 0, y: 0, z: -0.2 },
            { x: 1, y: 0, z: -0.3 },
            { x: 2, y: 0, z: -0.1 },
          ],
        }, expect.any(Function)],
      ]);
      expect(mockPublish).toHaveBeenCalledWith('gcode:load', {
        name: 'AL_part.gcode',
        gcode: compensatedGcode,
        isProbeCompensationApplied: true,
      });
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockTrace).toEqual([
        'autolevel:applyProbeCompensation',
        'loadGCode',
        'gcode:load',
      ]);
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
  });
});
