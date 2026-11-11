/* eslint-env jest */
import config from '../../../services/configstore';
import GrblController from '../GrblController';
import GrblSimulator from '../../../../../grbl-simulator/grbl-simulator';
import { createController } from '../../__tests__/helpers/createController';

jest.mock('../../../lib/logger', () => {
  const loggers = new Map();
  const createLogger = () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    silly: jest.fn(),
  });
  const logger = (namespace) => {
    if (!loggers.has(namespace)) {
      loggers.set(namespace, createLogger());
    }
    return loggers.get(namespace);
  };
  logger.loggers = loggers;
  return {
    __esModule: true,
    default: logger,
    getLevel: jest.fn(() => 'info'),
    setLevel: jest.fn(),
  };
});

// Two probe runs can each wait out the probe deadline
jest.setTimeout(70000);

const devices = [];

// A Grbl v1.1 device, driven through the same code paths a serial port uses:
//   controller.connection.write  ->  GrblSimulator.processLineAsync
//   simulator replies + probe reports  ->  controller.runner.parse
// The simulator parses the G-code, runs the G38.2 probe cycles, and reports the
// measured position as `[PRB:x,y,z:1]`, so the probe results below come from the
// device rather than from the commanded coordinates.
const createSimulatedController = () => {
  jest.spyOn(config, 'get').mockImplementation((key, defaultValue) => defaultValue);

  const { controller } = createController(GrblController);
  clearInterval(controller.queryTimer);

  const simulator = new GrblSimulator();
  const written = [];
  const responses = [];
  const probeUpdates = [];

  const parse = (response) => {
    responses.push(response);
    controller.runner.parse(response);
  };

  controller.connection = {
    isOpen: true,
    write: (data) => {
      const line = String(data).trim();

      if (line.length === 0) {
        return;
      }

      written.push(line);

      if (line.length === 1) {
        // Real-time command (?, !, ~, Ctrl-X, overrides): answered immediately
        const response = simulator.processRealtimeCommand(line);
        if (response) {
          parse(response);
        }
        return;
      }

      simulator.processLineAsync(line, parse);
    },
    close: (callback = () => {}) => callback(),
  };

  // Asynchronous reports the device pushes on its own, such as a probe result
  simulator.on('data', parse);

  // The controller broadcasts to connected clients, so observe progress from one
  const socket = {
    id: 'autolevel-simulator-test',
    emit: (eventName, ...args) => {
      if (eventName === 'autolevel:update') {
        probeUpdates.push(args[0]);
      }
    },
  };
  controller.addConnection(socket);

  controller.runner.parse(simulator.getStartupMessage());

  devices.push({ controller, simulator, socket });

  return { controller, simulator, written, responses, probeUpdates };
};

const PROBE_OPTIONS = {
  mode: 'full',
  startX: 0,
  endX: 40,
  stepX: 20,
  startY: 0,
  endY: 20,
  stepY: 20,
  clearanceZ: 5,
  startZ: 1,
  endZ: -5,
  // Far above a real probe feed on purpose: the simulator interpolates moves in
  // real time, and only the visit order is under test.
  feedrate: 3000,
};

const axisPositionCount = (start, end, step) => Math.floor((end - start) / step) + 1;

const PROBE_POINT_COUNT =
  axisPositionCount(PROBE_OPTIONS.startX, PROBE_OPTIONS.endX, PROBE_OPTIONS.stepX) *
  axisPositionCount(PROBE_OPTIONS.startY, PROBE_OPTIONS.endY, PROBE_OPTIONS.stepY);

// Probe targets the head rapids to before each probe cycle, in the order written
const probeTargets = (written) => written
  .map(line => line.match(/^G0 X(-?[\d.]+) Y(-?[\d.]+)$/))
  .filter(Boolean)
  .map(match => [Number(match[1]), Number(match[2])]);

// Probe results reported by the device: [PRB:x,y,z:1]
const probeResults = (responses) => responses
  .map(response => String(response).match(/\[PRB:(-?[\d.]+),(-?[\d.]+),(-?[\d.]+):(\d)\]/))
  .filter(Boolean)
  .map(match => ({
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
    result: Number(match[4]),
  }));

const xyDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const longestHop = (order) => Math.max(...order.slice(1).map((point, index) => xyDistance(point, order[index])));

const timers = [];

const probeUntilDone = (controller, expectedCount) => new Promise((resolve) => {
  const deadline = Date.now() + 30000;
  const timer = setInterval(() => {
    // Keep the runner's machine/work positions current, as the query timer does
    controller.write('?');

    const done = controller.probeState.probedPositions.length >= expectedCount;

    if (done || Date.now() > deadline) {
      clearInterval(timer);
      resolve(done);
    }
  }, 50);

  timers.push(timer);
});

// The last retract is written after the final probe report, and the simulated
// motion takes real time: wait until the head is back at the clearance height.
const waitForRetract = (simulator) => new Promise((resolve) => {
  const deadline = Date.now() + 10000;
  const timer = setInterval(() => {
    const retracted = Math.abs(simulator.machinePosition.z - PROBE_OPTIONS.clearanceZ) < 0.01;

    if (retracted || Date.now() > deadline) {
      clearInterval(timer);
      resolve(retracted);
    }
  }, 25);

  timers.push(timer);
});

const sendDeviceLine = (simulator, line) => new Promise((resolve) => {
  simulator.processLineAsync(line, resolve);
});

// The simulator defaults to 500 mm/min rapids ($110-$112), which makes every G0
// take seconds of real time. Only the visit order is under test, so raise them.
const configureSimulator = (simulator) => ['$110=20000', '$111=20000', '$112=20000']
  .reduce((chain, line) => chain.then(() => sendDeviceLine(simulator, line)), Promise.resolve());

const runProbe = async (scanPattern, scanDirection) => {
  const result = createSimulatedController();

  await configureSimulator(result.simulator);

  result.controller.command('autolevel:start', {
    ...PROBE_OPTIONS,
    scanPattern,
    scanDirection,
  });

  const completed = await probeUntilDone(result.controller, PROBE_POINT_COUNT);
  const settled = completed ? await waitForRetract(result.simulator) : false;

  return { ...result, completed, settled };
};

describe('GrblController autolevel against a Grbl v1.1 simulator', () => {
  afterEach(() => {
    while (timers.length > 0) {
      clearInterval(timers.pop());
    }
    while (devices.length > 0) {
      const { controller, simulator, socket } = devices.pop();
      controller.removeConnection(socket);
      controller.destroy();
      // The simulator runs a planner loop that would keep the process alive
      simulator.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('probe order on the device', () => {
    // Each case names the visit order the device must see, independent of the
    // scan-path implementation: 3 columns x 2 rows.
    const cases = [
      ['raster', 'x', [[0, 0], [20, 0], [40, 0], [0, 20], [20, 20], [40, 20]]],
      ['zigzag', 'x', [[0, 0], [20, 0], [40, 0], [40, 20], [20, 20], [0, 20]]],
      ['zigzag', 'y', [[0, 0], [0, 20], [20, 20], [20, 0], [40, 0], [40, 20]]],
      ['spiral-in', 'x', [[0, 0], [20, 0], [40, 0], [40, 20], [20, 20], [0, 20]]],
      ['spiral-out', 'y', [[20, 0], [40, 0], [40, 20], [20, 20], [0, 20], [0, 0]]],
    ];

    test.each(cases)(
      '%s along %s probes every node once, in order, without a rejected line',
      async (scanPattern, scanDirection, expected) => {
        const { controller, simulator, written, responses, probeUpdates, completed, settled } =
          await runProbe(scanPattern, scanDirection);

        expect(completed).toBe(true);
        expect(settled).toBe(true);
        expect(responses.filter(response => /error:|ALARM/.test(String(response)))).toEqual([]);

        // The head visits the grid in the selected scan order
        expect(probeTargets(written)).toEqual(expected);

        // The device completed one probe cycle per node, at the commanded node
        const results = probeResults(responses);
        expect(results.length).toBe(expected.length);
        expect(results.map(result => result.result)).toEqual(expected.map(() => 1));
        results.forEach((result, index) => {
          expect(result.x).toBeCloseTo(expected[index][0], 1);
          expect(result.y).toBeCloseTo(expected[index][1], 1);
        });

        // Measurements are stored node by node, in visit order, keeping the
        // measured Z from the device
        expect(controller.probeState.probedPositions.map(({ x, y }) => [x, y])).toEqual(expected);
        controller.probeState.probedPositions.forEach((position, index) => {
          expect(position.z).toBeCloseTo(results[index].z, 3);
          // The surface sits near -3mm; the commanded probe depth is -5mm, so a
          // stored Z between the two can only come from the probe report
          expect(position.z).toBeGreaterThan(-4);
          expect(position.z).toBeLessThan(-2);
        });
        expect(controller.probeState.minZ).toBeLessThan(controller.probeState.maxZ);

        // Progress reports reach every node exactly once, in the same order
        expect(probeUpdates.map(({ current }) => current)).toEqual(expected.map((_, index) => index + 1));

        // The device ends on the last node of the path, retracted to clearance height
        const last = expected[expected.length - 1];
        expect(simulator.machinePosition.x).toBeCloseTo(last[0], 1);
        expect(simulator.machinePosition.y).toBeCloseTo(last[1], 1);
        expect(simulator.machinePosition.z).toBeCloseTo(PROBE_OPTIONS.clearanceZ, 1);
      }
    );
  });

  test('zigzag removes the row return rapid that raster pays', async () => {
    const raster = await runProbe('raster', 'x');
    const zigzag = await runProbe('zigzag', 'x');

    const rasterOrder = probeTargets(raster.written);
    const zigzagOrder = probeTargets(zigzag.written);

    expect(rasterOrder.length).toBe(6);
    expect(zigzagOrder.length).toBe(6);

    // Zigzag continues from where the previous row ended: every hop is one step
    expect(longestHop(zigzagOrder)).toBeCloseTo(PROBE_OPTIONS.stepX, 3);

    // Raster rapids back across the area at the start of each new row
    expect(longestHop(rasterOrder)).toBeGreaterThan(PROBE_OPTIONS.endX - PROBE_OPTIONS.startX);
  });

  describe('rejected scan options', () => {
    test.each([
      ['scanPattern', 'zig-zag'],
      ['scanDirection', 'z'],
    ])('an unsupported %s value aborts the probe instead of probing another path', (option, value) => {
      const { controller, written } = createSimulatedController();

      expect(() => controller.command('autolevel:start', {
        ...PROBE_OPTIONS,
        [option]: value,
      })).toThrow(RangeError);

      expect(written).toEqual([]);
      expect(controller.probeState.probePoints).toEqual([]);
      expect(controller.probeState.probedPositions).toEqual([]);
    });
  });
});
