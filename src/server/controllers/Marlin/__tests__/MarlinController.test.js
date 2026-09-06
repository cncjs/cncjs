/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';
import logger from '../../../lib/logger';
import serviceContainer from '../../../service-container';
import MarlinController from '../MarlinController';
import {
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  WRITE_SOURCE_CLIENT,
  WRITE_SOURCE_FEEDER,
  WRITE_SOURCE_SENDER,
} from '../../constants';
import { createController } from '../../__tests__/helpers/createController';
// The controller resolves the same userStore singleton from the service
// container, so spying on config.get intercepts its settings lookups.
const config = serviceContainer.resolve('userStore');

jest.mock('../../../lib/logger', () => {
  const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
  const log = levels.reduce((acc, level) => {
    acc[level] = jest.fn();
    return acc;
  }, {});
  const factory = () => log;
  factory.levels = levels;
  factory.getLevel = () => 'info';
  factory.setLevel = () => {};
  return factory;
});

const log = logger('controller:Marlin');

// mapPositionToUnits returns formatted strings ('0.000' metric, '0.0000' imperial),
// so tool_change lines embed those exact zero representations.
const METRIC_ZERO = '0.000';
const IMPERIAL_ZERO = '0.0000';

const PINNED_TOOL_CHANGE_CONFIG = {
  'tool.toolChangeX': 0,
  'tool.toolChangeY': 0,
  'tool.toolChangeZ': 0,
  'tool.toolProbeX': 0,
  'tool.toolProbeY': 0,
  'tool.toolProbeZ': 0,
  'tool.toolProbeCommand': 'G38.2',
  'tool.toolProbeDistance': 1,
  'tool.toolProbeFeedrate': 10,
  'tool.touchPlateHeight': 0,
  'tool.toolProbeCustomCommands': 'G53 G0 X5\nG4 P100',
};

const toolChangeSequence = (policyLines, zero = METRIC_ZERO) => [
  'G4 S0.5\n',
  'M5\n',
  'G90\n',
  `G53 G0 Z${zero}\n`,
  `G53 G0 X${zero} Y${zero}\n`,
  'G4 S0.5\n',
  'M0\n',
  `G53 G0 X${zero} Y${zero}\n`,
  `G53 G0 Z${zero}\n`,
  'G4 S0.5\n',
  ...policyLines,
  `G53 G0 Z${zero}\n`,
  `G53 G0 X${zero} Y${zero}\n`,
  'G4 S0.5\n',
  'M0\n',
  'G90\n',
  'G0 X0 Y0\n',
  'G0 Z0\n',
  'M5\n',
  'G4 S5\n',
];

// Feeder-fed lines advance one per machine "ok"; in tests the queue is drained
// by clearing any hold and pulling the next line until nothing is left.
const drainFeeder = (controller, writes) => {
  for (;;) {
    const written = writes.length;
    controller.feeder.unhold();
    controller.feeder.next();
    if (controller.feeder.size() === 0 && writes.length === written) {
      break;
    }
  }
};

describe('MarlinController', () => {
  let controller;
  let writes;
  let tempDir;
  let configGetSpy;

  const setup = () => {
    const harness = createController(MarlinController);
    controller = harness.controller;
    writes = harness.writes;
    return harness;
  };

  const mockConfigGet = (overrides = {}) => {
    configGetSpy.mockImplementation((key, defaultValue) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
      }
      if (key === 'events') {
        return [];
      }
      return defaultValue;
    });
  };

  beforeEach(() => {
    configGetSpy = jest.spyOn(config, 'get').mockImplementation((key, defaultValue) => (
      key === 'events' ? [] : defaultValue
    ));
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marlin-controller-test-'));
  });

  afterEach(() => {
    if (controller) {
      controller.destroy();
      controller = null;
    }
    writes = null;
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('basic commands', () => {
    test('homing writes the Marlin auto home command', () => {
      setup();
      controller.command('homing');
      expect(writes).toEqual([{ data: 'G28\n', context: { source: WRITE_SOURCE_CLIENT } }]);
    });

    test('reset writes the emergency stop command', () => {
      setup();
      controller.command('reset');
      expect(writes).toEqual([{ data: 'M112\n', context: { source: WRITE_SOURCE_CLIENT } }]);
    });

    test('feed_hold triggers the event without writing', () => {
      setup();
      const trigger = jest.spyOn(controller.event, 'trigger');
      controller.command('feed_hold');
      expect(writes).toEqual([]);
      expect(trigger).toHaveBeenCalledWith('feed_hold');
    });

    test('cycle_start triggers the event without writing', () => {
      setup();
      const trigger = jest.spyOn(controller.event, 'trigger');
      controller.command('cycle_start');
      expect(writes).toEqual([]);
      expect(trigger).toHaveBeenCalledWith('cycle_start');
    });

    test('sleep triggers the event without writing', () => {
      setup();
      const trigger = jest.spyOn(controller.event, 'trigger');
      controller.command('sleep');
      expect(writes).toEqual([]);
      expect(trigger).toHaveBeenCalledWith('sleep');
    });

    test('unlock is a no-op', () => {
      setup();
      const trigger = jest.spyOn(controller.event, 'trigger');
      controller.command('unlock');
      expect(writes).toEqual([]);
      expect(trigger).not.toHaveBeenCalled();
    });

    test('lasertest:off writes the zero-power sequence with feeder source', () => {
      setup();
      controller.command('lasertest:off');
      expect(writes).toEqual([
        { data: 'M5\n', context: { source: WRITE_SOURCE_FEEDER } },
        { data: 'M3S0\n', context: { source: WRITE_SOURCE_FEEDER } },
      ]);
    });

    test('statusreport is not a known command', () => {
      setup();
      controller.command('statusreport');
      expect(writes).toEqual([]);
      expect(log.error).toHaveBeenCalledWith('Unknown command: statusreport');
    });

    test('commands do not write when the connection is closed', () => {
      setup();
      controller.connection.isOpen = false;
      controller.command('homing');
      controller.command('reset');
      controller.command('gcode', 'G0 X1');
      controller.command('lasertest:off');
      expect(writes).toEqual([]);
    });
  });

  describe('feedOverride', () => {
    test.each([
      [100, 0, 'M220S100\n'],
      [100, 450, 'M220S500\n'],
      [100, -200, 'M220S10\n'],
      [100, 50, 'M220S150\n'],
    ])('ovF=%i value=%i feeds %s', (ovF, value, expected) => {
      setup();
      controller.runner.state.ovF = ovF;
      controller.command('feedOverride', value);
      expect(writes).toEqual([{ data: expected, context: { source: WRITE_SOURCE_FEEDER } }]);
    });

    test('updates the runner feed override state', () => {
      setup();
      controller.runner.state.ovF = 100;
      controller.command('feedOverride', 50);
      expect(controller.runner.state.ovF).toBe(150);
    });
  });

  describe('spindleOverride', () => {
    test.each([
      [100, 0, 'M221S100\n'],
      [100, 450, 'M221S500\n'],
      [100, -200, 'M221S10\n'],
      [100, 50, 'M221S150\n'],
    ])('ovS=%i value=%i feeds %s', (ovS, value, expected) => {
      setup();
      controller.runner.state.ovS = ovS;
      controller.command('spindleOverride', value);
      expect(writes).toEqual([{ data: expected, context: { source: WRITE_SOURCE_FEEDER } }]);
    });

    test('updates the runner spindle override state', () => {
      setup();
      controller.runner.state.ovS = 100;
      controller.command('spindleOverride', 50);
      expect(controller.runner.state.ovS).toBe(150);
    });
  });

  describe('rapidOverride', () => {
    test('is unsupported and writes nothing', () => {
      setup();
      controller.command('rapidOverride', 50);
      expect(writes).toEqual([]);
    });
  });

  describe('motor and laser', () => {
    test('motor:enable feeds M17', () => {
      setup();
      controller.command('motor:enable');
      expect(writes).toEqual([{ data: 'M17\n', context: { source: WRITE_SOURCE_FEEDER } }]);
    });

    test('motor:disable feeds M18', () => {
      setup();
      controller.command('motor:disable');
      expect(writes).toEqual([{ data: 'M18\n', context: { source: WRITE_SOURCE_FEEDER } }]);
    });

    test('laser_test with zero power writes M5 and M3S0', () => {
      setup();
      controller.command('laser_test');
      expect(writes).toEqual([
        { data: 'M5\n', context: { source: WRITE_SOURCE_FEEDER } },
        { data: 'M3S0\n', context: { source: WRITE_SOURCE_FEEDER } },
      ]);
    });

    test('laser_test with explicit power and maxS writes the scaled S value', () => {
      setup();
      controller.command('laser_test', 50, 0, 1000);
      expect(writes).toEqual([{ data: 'M3S500\n', context: { source: WRITE_SOURCE_FEEDER } }]);
    });

    test('lasertest:on with a duration feeds M3S, dwell and M5', () => {
      setup();
      controller.command('lasertest:on', 100, 50, 255);
      drainFeeder(controller, writes);
      expect(writes.map(write => write.data)).toEqual(['M3S255\n', 'G4 P50\n', 'M5\n']);
      writes.forEach(write => expect(write.context.source).toBe(WRITE_SOURCE_FEEDER));
    });

    test('lasertest:on without a duration feeds only M3S', () => {
      setup();
      controller.command('lasertest:on', 50);
      expect(writes.map(write => write.data)).toEqual(['M3S127.5\n']);
      writes.forEach(write => expect(write.context.source).toBe(WRITE_SOURCE_FEEDER));
    });
  });

  describe('gcode and feeder', () => {
    test('gcode feeds one write per line and empty lines are filtered', () => {
      setup();
      controller.command('gcode', 'G0 X1\n\nG0 Y2');
      expect(writes).toEqual([{ data: 'G0 X1\n', context: { source: WRITE_SOURCE_FEEDER } }]);

      controller.runner.emit('ok', { raw: 'ok' });
      expect(writes).toEqual([
        { data: 'G0 X1\n', context: { source: WRITE_SOURCE_FEEDER } },
        { data: 'G0 Y2\n', context: { source: WRITE_SOURCE_FEEDER } },
      ]);
    });

    test('gcode drops blank and non-string lines', () => {
      setup();
      controller.command('gcode', ['', '  ', null, 'G0 X1']);
      expect(writes.map(write => write.data)).toEqual(['G0 X1\n']);
    });

    test('feeder:feed writes through the feeder source', () => {
      setup();
      controller.command('feeder:feed', 'G0 X1\nG0 Y2');
      expect(writes.map(write => write.data)).toEqual(['G0 X1\n']);
      expect(writes[0].context.source).toBe(WRITE_SOURCE_FEEDER);
    });

    test('feeder_start unholds the feeder and resumes feeding', () => {
      setup();
      controller.command('gcode', 'M109 S200');
      controller.command('gcode', 'G0 X1');
      expect(writes.map(write => write.data)).toEqual(['M109 S200\n']);

      controller.command('feeder_start');
      expect(writes.map(write => write.data)).toEqual(['M109 S200\n', 'G0 X1\n']);
      expect(writes[1].context.source).toBe(WRITE_SOURCE_FEEDER);
    });

    test('feeder_start does nothing while a program is running', () => {
      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command('gcode:start');
      controller.command('gcode', 'G0 X9');
      controller.command('feeder_start');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n']);
    });

    test('feeder_stop clears the queue', () => {
      setup();
      controller.command('gcode', ['G0 X1', 'G0 Y2']);
      expect(writes.map(write => write.data)).toEqual(['G0 X1\n']);

      controller.command('feeder_stop');
      controller.runner.emit('ok', { raw: 'ok' });
      expect(writes.map(write => write.data)).toEqual(['G0 X1\n']);
    });
  });

  describe('gcode:load', () => {
    test('loads a program and returns the sender state via callback', () => {
      setup();
      const callback = jest.fn();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2', callback);
      expect(callback).toHaveBeenCalledTimes(1);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(json.name).toBe('test');
      expect(json.total).toBe(3); // two program lines plus the %wait dwell line
      expect(json.sent).toBe(0);
      expect(json.received).toBe(0);
      expect(writes).toEqual([]);
    });

    test('an empty program still loads because the dwell line is appended before Sender.load', () => {
      // MarlinController concatenates the %wait dwell line with the user G-code
      // before calling Sender.load, so Sender.load's empty-input guard never trips.
      setup();
      const callback = jest.fn();
      controller.command('gcode:load', 'test', '', callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(json.total).toBe(1);
      expect(writes).toEqual([]);
    });
  });

  describe('sender workflow', () => {
    test('gcode:start sends the first program line', () => {
      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command('gcode:start');
      expect(writes).toEqual([{ data: 'G0 X0\n', context: { source: WRITE_SOURCE_SENDER } }]);
      expect(controller.workflow.state).toBe('running');
    });

    test('gcode:pause holds and gcode:resume sends the next line', () => {
      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command('gcode:start');
      controller.command('gcode:pause');
      expect(controller.workflow.state).toBe('paused');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n']);

      controller.command('gcode:resume');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y2\n']);
      expect(writes[1].context.source).toBe(WRITE_SOURCE_SENDER);
    });

    test('gcode:stop stops the workflow and rewinds the sender', () => {
      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command('gcode:start');
      controller.command('gcode:stop');
      expect(controller.workflow.state).toBe('idle');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n']);

      controller.command('gcode:start');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 X0\n']);
    });

    test('gcode:unload clears the sender', () => {
      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command('gcode:start');
      controller.command('gcode:unload');
      expect(controller.sender.state.content).toBe('');
      expect(controller.sender.state.total).toBe(0);
      expect(controller.workflow.state).toBe('idle');
      expect(writes.map(write => write.data)).toEqual(['G0 X0\n']);
    });

    test.each([
      ['start', 'gcode:start'],
      ['stop', 'gcode:stop'],
      ['pause', 'gcode:pause'],
      ['resume', 'gcode:resume'],
    ])('deprecated alias "%s" matches "%s" and logs a warning', (alias, canonical) => {
      const canonicalHarness = createController(MarlinController);
      canonicalHarness.controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      canonicalHarness.controller.command(canonical);

      setup();
      controller.command('gcode:load', 'test', 'G0 X0\nG0 Y2');
      controller.command(alias);

      expect(writes).toEqual(canonicalHarness.writes);
      expect(log.warn).toHaveBeenCalledWith(`Warning: The "${alias}" command is deprecated and will be removed in a future release.`);
      canonicalHarness.controller.destroy();
    });

    test('macro:run feeds the macro content', () => {
      setup();
      mockConfigGet({ macros: [{ id: 'm1', name: 'M1', content: 'G0 X1\nG0 Y2' }] });
      const callback = jest.fn();
      controller.command('macro:run', 'm1', callback);
      expect(callback).toHaveBeenCalledWith(null);
      expect(writes.map(write => write.data)).toEqual(['G0 X1\n']);
    });

    test('macro:run with an unknown id calls back without writing', () => {
      setup();
      mockConfigGet({ macros: [] });
      const callback = jest.fn();
      controller.command('macro:run', 'missing', callback);
      expect(writes).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
    });

    test('macro:load loads the macro content into the sender', () => {
      setup();
      mockConfigGet({ macros: [{ id: 'm1', name: 'M1', content: 'G0 X1' }] });
      const callback = jest.fn();
      controller.command('macro:load', 'm1', callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(json.name).toBe('M1');
      expect(json.total).toBe(2);
    });

    test('watchdir:load reads the file via fs and loads it', () => {
      setup();
      jest.spyOn(fs, 'readFile').mockImplementation((file, encoding, callback) => callback(null, 'G0 X5\nG0 Y5'));
      const callback = jest.fn();
      controller.command('watchdir:load', 'watched.gcode', callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(json.name).toBe('watched.gcode');
      expect(json.total).toBe(3);
    });
  });

  describe('tool_change', () => {
    const runToolChange = (policy, units = 'G21') => {
      mockConfigGet({ ...PINNED_TOOL_CHANGE_CONFIG, 'tool.toolChangePolicy': policy });
      setup();
      controller.runner.state.modal.units = units;
      controller.command('tool_change');
      drainFeeder(controller, writes);
    };

    test.each([
      ['IGNORE_M6_COMMANDS', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, []],
      ['SEND_M6_COMMANDS', TOOL_CHANGE_POLICY_SEND_M6_COMMANDS, []],
      ['MANUAL_TOOL_CHANGE_WCS', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, ['G91 G38.2 F10 Z-1\n', 'G92 Z0\n']],
      ['MANUAL_TOOL_CHANGE_TLO', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO, ['G91 G38.2 F10 Z-1\n', 'G4 S1\n', 'G92 Z0\n']],
      ['MANUAL_TOOL_CHANGE_CUSTOM_PROBING', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING, ['G53 G0 X5\n', 'G4 P100\n']],
    ])('%s writes the exact sequence', (name, policy, policyLines) => {
      runToolChange(policy);
      expect(writes.map(write => write.data)).toEqual(toolChangeSequence(policyLines));
      writes.forEach(write => expect(write.context.source).toBe(WRITE_SOURCE_FEEDER));
    });

    test('converts pinned values to imperial units (G20)', () => {
      runToolChange(TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, 'G20');
      expect(writes.map(write => write.data)).toEqual(toolChangeSequence([
        'G91 G38.2 F0.3937 Z-0.0394\n',
        'G92 Z0\n',
      ], IMPERIAL_ZERO));
    });
  });

  describe('autolevel', () => {
    test('autolevel:start in test mode probes once at the current position', () => {
      setup();
      controller.command('autolevel:start', { mode: 'test', clearanceZ: 5, startZ: 2, endZ: -1, feedrate: 100 });
      drainFeeder(controller, writes);
      expect(writes.map(write => write.data)).toEqual([
        'G90\n',
        'G0 Z5\n',
        'G0 Z2\n',
        'G38.2 Z-1 F100\n',
        'G0 Z5\n',
      ]);
      writes.forEach(write => expect(write.context.source).toBe(WRITE_SOURCE_FEEDER));
      expect(controller.probeState.probePoints).toEqual([]);
    });

    test('autolevel:start in full mode generates the exact probe sequence', () => {
      setup();
      controller.command('autolevel:start', {
        mode: 'full',
        startX: 0,
        endX: 10,
        stepX: 10,
        startY: 0,
        endY: 10,
        stepY: 10,
        clearanceZ: 5,
        startZ: 2,
        endZ: -1,
        feedrate: 100,
      });
      drainFeeder(controller, writes);
      expect(writes.map(write => write.data)).toEqual([
        'G90\n', 'G0 Z5\n', 'G0 X0 Y0\n', 'G0 Z2\n', 'G38.2 Z-1 F50\n', 'G0 Z5\n',
        'G90\n', 'G0 Z5\n', 'G0 X10 Y0\n', 'G0 Z2\n', 'G38.2 Z-1 F100\n', 'G0 Z5\n',
        'G90\n', 'G0 Z5\n', 'G0 X0 Y10\n', 'G0 Z2\n', 'G38.2 Z-1 F100\n', 'G0 Z5\n',
        'G90\n', 'G0 Z5\n', 'G0 X10 Y10\n', 'G0 Z2\n', 'G38.2 Z-1 F100\n', 'G0 Z5\n',
      ]);
      expect(controller.probeState.probePoints).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
      ]);
      expect(controller.probeState.config).toEqual({
        startX: 0,
        endX: 10,
        stepX: 10,
        startY: 0,
        endY: 10,
        stepY: 10,
        clearanceZ: 5,
        startZ: 2,
        endZ: -1,
        feedrate: 100,
      });
    });

    test('autolevel:stop resets the machine and clears the probe state', () => {
      setup();
      controller.probeState.probedPositions = [{ x: 1, y: 2, z: 3 }];
      controller.probeState.probePoints = [{ x: 1, y: 2 }];
      controller.probeState.pendingProbeCapture = true;

      controller.command('autolevel:stop');
      expect(writes).toEqual([{ data: 'M112\n', context: { source: WRITE_SOURCE_CLIENT } }]);
      expect(controller.probeState).toEqual({
        probedPositions: [],
        probePoints: [],
        minZ: null,
        maxZ: null,
        config: null,
      });
    });

    test('autolevel:getProbeState returns the current probe state', () => {
      setup();
      const probeState = {
        probedPositions: [{ x: 1, y: 2, z: 0.5 }],
        minZ: 0.5,
        maxZ: 0.5,
        probePoints: [{ x: 1, y: 2 }],
        config: null,
        pendingProbeCapture: false,
      };
      controller.probeState = probeState;

      const callback = jest.fn();
      controller.command('autolevel:getProbeState', null, callback);
      expect(callback).toHaveBeenCalledTimes(1);

      const [err, res] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(res.state).toBe(probeState);
    });

    test('autolevel:loadFromFile populates the probe state from a 9-column fixture', async () => {
      setup();
      const filepath = path.join(tempDir, 'probe-fixture.txt');
      fs.writeFileSync(filepath, '1 2 0.5 0 0 0 0 0 0\n3 4 -1.25 0 0 0 0 0 0\n5 6 2 0 0 0 0 0 0\n');

      const result = await new Promise((resolve) => {
        controller.command('autolevel:loadFromFile', filepath, (err, res) => resolve({ err, res }));
      });
      expect(result.err).toBeNull();
      expect(result.res.success).toBe(true);
      expect(controller.probeState.probedPositions).toEqual([
        { x: 1, y: 2, z: 0.5 },
        { x: 3, y: 4, z: -1.25 },
        { x: 5, y: 6, z: 2 },
      ]);
      expect(controller.probeState.minZ).toBe(-1.25);
      expect(controller.probeState.maxZ).toBe(2);
      expect(writes).toEqual([]);
    });

    test('autolevel:loadFromFile calls back with an error message for a missing file', async () => {
      setup();
      const result = await new Promise((resolve) => {
        controller.command('autolevel:loadFromFile', path.join(tempDir, 'missing.txt'), (err, res) => resolve({ err, res }));
      });
      // The handler passes err.message (a string) instead of an Error instance.
      expect(result.err).toEqual(expect.any(String));
      expect(result.res).toEqual({ success: false, state: null });
    });

    test('autolevel:saveToFile writes 9-column rows and calls back with success', async () => {
      setup();
      const filepath = path.join(tempDir, 'probe-out.txt');
      controller.probeState.probedPositions = [{ x: 1, y: 2, z: 0.5 }, { x: 3, y: 4, z: -1.25 }];

      const result = await new Promise((resolve) => {
        controller.command('autolevel:saveToFile', filepath, (err, res) => resolve({ err, res }));
      });
      expect(result.err).toBeNull();
      expect(result.res).toEqual({ success: true, filepath });
      expect(fs.readFileSync(filepath, 'utf8')).toBe('1 2 0.5 0 0 0 0 0 0\n3 4 -1.25 0 0 0 0 0 0');
    });

    test('autolevel:applyProbeCompensation returns compensated G-code via callback', () => {
      setup();
      const callback = jest.fn();
      const probeData = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
        { x: 10, y: 10, z: 0 },
      ];
      controller.command('autolevel:applyProbeCompensation', { gcode: 'G0 X5 Y5', probeData }, callback);
      expect(callback).toHaveBeenCalledWith(null, { compensatedGcode: 'G0 X5.000 Y5.000 Z0.000' });
    });

    test('autolevel:applyProbeCompensation passes G-code through when probe data is insufficient', () => {
      setup();
      const callback = jest.fn();
      controller.command('autolevel:applyProbeCompensation', { gcode: 'G0 X5 Y5', probeData: [{ x: 0, y: 0, z: 0 }] }, callback);
      expect(callback).toHaveBeenCalledWith(null, { compensatedGcode: 'G0 X5 Y5' });
    });

    test('completing a G38.2 line queries the position and flags probe capture', () => {
      setup();
      controller.probeState.probePoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      controller.history.writeLine = 'G38.2 Z-1';

      controller.runner.emit('ok', { raw: 'ok' });
      expect(writes).toEqual([{ data: 'M114\n', context: { source: WRITE_SOURCE_CLIENT } }]);
      expect(controller.probeState.pendingProbeCapture).toBe(true);
      expect(controller.history.writeLine).toBe('');
    });

    test('the position report after a probe is captured into the probe state', () => {
      setup();
      controller.probeState.probePoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      controller.history.writeLine = 'G38.2 Z-1';
      controller.runner.emit('ok', { raw: 'ok' });

      controller.runner.state.pos = { x: '1.000', y: '2.000', z: '3.000' };
      controller.runner.emit('pos', { raw: 'X:1.000 Y:2.000 Z:3.000 E:0.000' });
      expect(controller.probeState.pendingProbeCapture).toBe(false);
      expect(controller.probeState.probedPositions).toEqual([{ x: 1, y: 2, z: 3 }]);
      expect(controller.probeState.minZ).toBe(3);
      expect(controller.probeState.maxZ).toBe(3);
    });
  });
});
