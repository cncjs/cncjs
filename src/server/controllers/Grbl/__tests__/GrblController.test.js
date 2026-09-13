/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';
import GrblController from '../GrblController';
import serviceContainer from '../../../service-container';
import delay from '../../../lib/delay';
import {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING,
} from '../../../lib/Workflow';
import { createController } from '../../__tests__/helpers/createController';
import {
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  WRITE_SOURCE_CLIENT,
  WRITE_SOURCE_FEEDER,
} from '../../constants';

import logger from '../../../lib/logger';
// The controller resolves the same userStore singleton from the service
// container, so spying on config.get intercepts its settings lookups.
const config = serviceContainer.resolve('userStore');

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

const TOOL_CHANGE_CONFIG = {
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
};

const SHORT_PROGRAM = 'G0 X0\nG0 Y0\nM30';
const LONG_PROGRAM = Array.from({ length: 20 }, () => 'G0 X10').join('\n');

const TOOL_CHANGE_METRIC_PREFIX = [
  'G4 P0.5\n',
  'M5\n',
  'G90\n',
  'G53 G0 Z0.000\n',
  'G53 G0 X0.000 Y0.000\n',
  'G4 P0.5\n',
  'M0\n',
  'G53 G0 X0.000 Y0.000\n',
  'G53 G0 Z0.000\n',
  'G4 P0.5\n',
];

const TOOL_CHANGE_METRIC_SUFFIX = [
  'G53 G0 Z0.000\n',
  'G53 G0 X0.000 Y0.000\n',
  'G4 P0.5\n',
  'M0\n',
  'G90\n',
  'G0 X0 Y0\n',
  'G0 Z0\n',
  'M5\n',
  'G4 P5\n',
];

const TOOL_CHANGE_IMPERIAL_PREFIX = [
  'G4 P0.5\n',
  'M5\n',
  'G90\n',
  'G53 G0 Z0.0000\n',
  'G53 G0 X0.0000 Y0.0000\n',
  'G4 P0.5\n',
  'M0\n',
  'G53 G0 X0.0000 Y0.0000\n',
  'G53 G0 Z0.0000\n',
  'G4 P0.5\n',
];

const TOOL_CHANGE_IMPERIAL_SUFFIX = [
  'G53 G0 Z0.0000\n',
  'G53 G0 X0.0000 Y0.0000\n',
  'G4 P0.5\n',
  'M0\n',
  'G90\n',
  'G0 X0 Y0\n',
  'G0 Z0\n',
  'M5\n',
  'G4 P5\n',
];

const AUTOLEVEL_GRID_WRITES = [
  'G90\n',
  'G0 Z5\n',
  'G0 X0 Y0\n',
  'G0 Z1\n',
  'G38.2 Z-1 F50\n',
  'G0 Z5\n',
  'G90\n',
  'G0 Z5\n',
  'G0 X10 Y0\n',
  'G0 Z1\n',
  'G38.2 Z-1 F100\n',
  'G0 Z5\n',
  'G90\n',
  'G0 Z5\n',
  'G0 X0 Y10\n',
  'G0 Z1\n',
  'G38.2 Z-1 F100\n',
  'G0 Z5\n',
  'G90\n',
  'G0 Z5\n',
  'G0 X10 Y10\n',
  'G0 Z1\n',
  'G38.2 Z-1 F100\n',
  'G0 Z5\n',
];

const PROBE_FIXTURE = '0 0 -1.5 0 0 0 0 0 0\n10 0 -1 0 0 0 0 0 0\n';

const activeControllers = [];
const tempFiles = [];

const getGrblLog = () => logger.loggers.get('controller:Grbl');

const flushFeeder = (controller) => {
  while (controller.feeder.size() > 0) {
    controller.feeder.unhold();
    controller.runner.parse('ok');
  }
};

const setUnitsG20 = (controller) => {
  controller.runner.state = {
    ...controller.runner.state,
    parserstate: {
      ...controller.runner.state.parserstate,
      modal: {
        ...controller.runner.state.parserstate.modal,
        units: 'G20',
      },
    },
  };
};

const createTempFile = (content) => {
  const filepath = path.join(os.tmpdir(), `grbl-controller-test-${process.pid}-${Date.now()}-${tempFiles.length}.gcode`);
  fs.writeFileSync(filepath, content, 'utf8');
  tempFiles.push(filepath);
  return filepath;
};

const setup = (configValues = {}) => {
  jest.spyOn(config, 'get').mockImplementation((key, defaultValue) => {
    return (Object.prototype.hasOwnProperty.call(configValues, key) ? configValues[key] : defaultValue);
  });
  const { controller, writes } = createController(GrblController);
  clearInterval(controller.queryTimer);
  const socketEvents = [];
  controller.sockets.test = { emit: (event, ...args) => socketEvents.push({ event, args }) };
  activeControllers.push(controller);
  return { controller, writes, socketEvents };
};

const serialWrites = (socketEvents) => {
  return socketEvents
    .filter(({ event }) => event === 'connection:write')
    .map(({ args }) => ({ data: args[1], source: args[2] && args[2].source }));
};
describe('GrblController', () => {
  afterEach(() => {
    while (activeControllers.length > 0) {
      const controller = activeControllers.pop();
      controller.destroy();
    }
    while (tempFiles.length > 0) {
      fs.unlinkSync(tempFiles.pop());
    }
    jest.restoreAllMocks();
  });

  describe('realtime and simple commands', () => {
    test.each([
      ['feed_hold', '!'],
      ['cycle_start', '~'],
      ['homing', '$H\n'],
      ['sleep', '$SLP\n'],
      ['unlock', '$X\n'],
      ['reset', '\x18'],
      ['jogCancel', '\x85'],
    ])('%s writes %j without a trailing newline for realtime bytes', (cmd, expected) => {
      const { controller, writes, socketEvents } = setup();

      controller.command(cmd);

      expect(writes.map(write => write.data)).toEqual([expected]);
      expect(serialWrites(socketEvents)).toEqual([{ data: expected, source: WRITE_SOURCE_CLIENT }]);
    });

    test('reset stops the workflow and clears the feeder', () => {
      const { controller, writes } = setup();

      controller.command('gcode', ['G0 X0', 'G0 Y0']);
      controller.command('reset');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', '\x18']);
      expect(controller.feeder.size()).toBe(0);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    });
  });

  describe('feedOverride', () => {
    test.each([
      [0, '\x90'],
      [10, '\x91'],
      [-10, '\x92'],
      [1, '\x93'],
      [-1, '\x94'],
    ])('%i%% writes the realtime override byte', (value, expected) => {
      const { controller, writes } = setup();

      controller.command('feedOverride', value);

      expect(writes.map(write => write.data)).toEqual([expected]);
    });

    test('values without a dedicated realtime byte write nothing', () => {
      const { controller, writes } = setup();

      controller.command('feedOverride', 5);

      expect(writes).toEqual([]);
    });
  });

  describe('spindleOverride', () => {
    test.each([
      [0, '\x99'],
      [10, '\x9a'],
      [-10, '\x9b'],
      [1, '\x9c'],
      [-1, '\x9d'],
    ])('%i%% writes the realtime override byte', (value, expected) => {
      const { controller, writes } = setup();

      controller.command('spindleOverride', value);

      expect(writes.map(write => write.data)).toEqual([expected]);
    });

    test('values without a dedicated realtime byte write nothing', () => {
      const { controller, writes } = setup();

      controller.command('spindleOverride', 5);

      expect(writes).toEqual([]);
    });
  });

  describe('rapidOverride', () => {
    test.each([
      [0, '\x95'],
      [100, '\x95'],
      [50, '\x96'],
      [25, '\x97'],
    ])('%i%% writes the realtime override byte', (value, expected) => {
      const { controller, writes } = setup();

      controller.command('rapidOverride', value);

      expect(writes.map(write => write.data)).toEqual([expected]);
    });

    test('values without a dedicated realtime byte write nothing', () => {
      const { controller, writes } = setup();

      controller.command('rapidOverride', 75);

      expect(writes).toEqual([]);
    });
  });

  describe('lasertest', () => {
    test('lasertest:on with default args shuts the laser down at zero power', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('lasertest:on');
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual(['M5S0\n']);
      expect(serialWrites(socketEvents).map(write => write.source)).toEqual([
        WRITE_SOURCE_FEEDER,
      ]);
    });

    test('lasertest:on with power and duration burns for the given duration', () => {
      const { controller, writes } = setup();

      controller.command('lasertest:on', 50, 100, 1000);
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual([
        'G1F1\n',
        'M3S500\n',
        'G4P0.1\n',
        'M5S0\n',
      ]);
    });

    test('lasertest:off turns the laser off', () => {
      const { controller, writes } = setup();

      controller.command('lasertest:off');

      expect(writes.map(write => write.data)).toEqual(['M5S0\n']);
    });
  });

  describe('feeder', () => {
    test('feeder:feed feeds commands to the feeder queue', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('feeder:feed', ['G0 X0', 'G0 Y0']);
      controller.runner.parse('ok');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y0\n']);
      expect(serialWrites(socketEvents).map(write => write.source)).toEqual([
        WRITE_SOURCE_FEEDER,
        WRITE_SOURCE_FEEDER,
      ]);
    });

    test('feeder_start writes cycle start and then the next queued line', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('feeder:feed', ['G0 X0', 'G0 Y0']);
      controller.command('feeder_start');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', '~', 'G0 Y0\n']);
      expect(serialWrites(socketEvents).map(write => write.source)).toEqual([
        WRITE_SOURCE_FEEDER,
        WRITE_SOURCE_CLIENT,
        WRITE_SOURCE_FEEDER,
      ]);
    });

    test('feeder_start writes only cycle start when the queue is empty', () => {
      const { controller, writes } = setup();

      controller.command('feeder_start');

      expect(writes.map(write => write.data)).toEqual(['~']);
    });

    test('feeder_start writes nothing while a program is running', () => {
      const { controller, writes } = setup();

      controller.command('gcode', ['G0 X0']);
      controller.command('gcode:load', 'test.gcode', SHORT_PROGRAM);
      controller.command('gcode:start');
      const writesAfterStart = writes.length;
      controller.command('feeder_start');

      expect(writes.length).toBe(writesAfterStart);
    });

    test('feeder_stop discards the queued lines', () => {
      const { controller, writes } = setup();

      controller.command('gcode', ['G0 X0', 'G0 Y0']);
      controller.command('feeder_stop');
      controller.runner.parse('ok');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n']);
      expect(controller.feeder.size()).toBe(0);
    });
  });

  describe('gcode', () => {
    test('gcode feeds a multi-line program one line at a time, filtering empty lines and comments', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('gcode', 'G0 X0\n\n   \n; comment\n(parenthesized)\nG0 Y0');
      controller.runner.parse('ok');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y0\n']);
      expect(controller.feeder.size()).toBe(0);
      expect(serialWrites(socketEvents).map(write => write.source)).toEqual([
        WRITE_SOURCE_FEEDER,
        WRITE_SOURCE_FEEDER,
      ]);
    });
  });

  describe('sender workflow', () => {
    test('gcode:load loads the program with an appended dwell and reports the sender state', () => {
      const { controller, writes, socketEvents } = setup();
      const callback = jest.fn();

      controller.command('gcode:load', 'test.gcode', SHORT_PROGRAM, {}, callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(json).toEqual(expect.objectContaining({
        name: 'test.gcode',
        total: 4,
        sent: 0,
        received: 0,
      }));
      expect(controller.sender.state.content).toBe(`${SHORT_PROGRAM}\n%wait ; Wait for the planner to empty`);
      expect(writes).toEqual([]);
      expect(socketEvents.some(({ event }) => event === 'sender:load')).toBe(true);
    });

    test('gcode:load accepts a callback in the context position', () => {
      const { controller } = setup();
      const callback = jest.fn();

      controller.command('gcode:load', 'test.gcode', 'G0 X0', callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(json).toEqual(expect.objectContaining({ name: 'test.gcode', total: 2 }));
    });

    // The controller appends the %wait dwell before Sender.load validates its input,
    // so empty and non-string programs are string-concatenated into a non-empty
    // program instead of reaching the Invalid G-code error branch.
    test.each([
      ['an empty program', '', 1],
      ['a non-string program', 42, 2],
    ])('gcode:load accepts %s because the appended dwell makes it non-empty', (name, gcode, total) => {
      const { controller } = setup();
      const callback = jest.fn();

      controller.command('gcode:load', 'test.gcode', gcode, callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(json).toEqual(expect.objectContaining({ name: 'test.gcode', total }));
    });

    test('gcode:unload stops the workflow and clears the sender', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('gcode:load', 'test.gcode', SHORT_PROGRAM);
      controller.command('gcode:start');
      controller.command('gcode:unload');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y0\n', 'M30\n', 'G4 P0.5\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
      expect(controller.sender.state.name).toBe('');
      expect(controller.sender.state.content).toBe('');
      expect(socketEvents.some(({ event }) => event === 'sender:unload')).toBe(true);
    });

    test('gcode:start streams the program up to the buffer limit and reports running state', () => {
      const { controller, writes } = setup();

      controller.command('gcode:load', 'test.gcode', SHORT_PROGRAM);
      controller.command('gcode:start');

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y0\n', 'M30\n', 'G4 P0.5\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
    });

    test('gcode:start streams a long program until the character-counting buffer is full', () => {
      const { controller, writes } = setup();

      controller.command('gcode:load', 'test.gcode', LONG_PROGRAM);
      controller.command('gcode:start');

      expect(writes.map(write => write.data)).toEqual(Array.from({ length: 17 }, () => 'G0 X10\n'));
      expect(controller.sender.state.sent).toBe(17);
    });

    test('gcode:pause writes feed hold and holds off the sender', () => {
      const { controller, writes } = setup();

      controller.command('gcode:load', 'test.gcode', LONG_PROGRAM);
      controller.command('gcode:start');
      controller.command('gcode:pause');

      expect(writes.map(write => write.data)).toEqual([...Array.from({ length: 17 }, () => 'G0 X10\n'), '!']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_PAUSED);
      expect(controller.sender.state.hold).toBe(true);
    });

    test('gcode:resume writes cycle start and streams the next line', () => {
      const { controller, writes } = setup();

      controller.command('gcode:load', 'test.gcode', LONG_PROGRAM);
      controller.command('gcode:start');
      controller.command('gcode:pause');
      controller.command('gcode:resume');

      expect(writes.map(write => write.data)).toEqual([
        ...Array.from({ length: 17 }, () => 'G0 X10\n'),
        '!',
        '~',
        'G0 X10\n',
      ]);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
      expect(controller.sender.state.hold).toBe(false);
    });

    test('gcode:stop stops the workflow without writing', () => {
      const { controller, writes } = setup();

      controller.command('gcode:load', 'test.gcode', LONG_PROGRAM);
      controller.command('gcode:start');
      controller.command('gcode:stop');

      expect(writes.map(write => write.data)).toEqual(Array.from({ length: 17 }, () => 'G0 X10\n'));
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
      expect(controller.sender.state.sent).toBe(0);
    });

    test('gcode:stop with force holds and then resets while the machine is running', async () => {
      const { controller, writes, socketEvents } = setup();

      // The force-stop handler reads the machine state from the top level of
      // controller.state (GrblController: _.get(this.state, 'machineState', '')).
      controller.state = { machineState: 'Run' };
      controller.command('gcode:stop', { force: true });
      controller.state = { machineState: 'Hold' };
      await delay(600);

      expect(writes.map(write => write.data)).toEqual(['!', '\x18']);
      expect(serialWrites(socketEvents).map(write => write.source)).toEqual([
        WRITE_SOURCE_CLIENT,
        WRITE_SOURCE_CLIENT,
      ]);
    });

    test('gcode:stop with force resets a machine that is already on hold', async () => {
      const { controller, writes } = setup();

      controller.state = { machineState: 'Hold' };
      controller.command('gcode:stop', { force: true });
      await delay(600);

      expect(writes.map(write => write.data)).toEqual(['\x18']);
    });

    test('gcode:stop with force writes nothing when the machine is neither running nor on hold', async () => {
      const { controller, writes } = setup();

      controller.state = { machineState: 'Idle' };
      controller.command('gcode:stop', { force: true });
      await delay(600);

      expect(writes).toEqual([]);
    });
  });

  describe('deprecated aliases', () => {
    test.each([
      ['start', 'gcode:start'],
      ['pause', 'gcode:pause'],
      ['resume', 'gcode:resume'],
      ['stop', 'gcode:stop'],
    ])('%s produces the same writes as %s after loading a program', (alias, canonical) => {
      const canonicalSetup = setup();
      const aliasSetup = setup();
      const { controller: canonicalController, writes: canonicalWrites } = canonicalSetup;
      const { controller: aliasController, writes: aliasWrites } = aliasSetup;

      canonicalController.command('gcode:load', 'test.gcode', SHORT_PROGRAM);
      aliasController.command('gcode:load', 'test.gcode', SHORT_PROGRAM);

      if (canonical !== 'gcode:start') {
        canonicalController.command('gcode:start');
        aliasController.command('gcode:start');
      }
      if (canonical === 'gcode:resume') {
        canonicalController.command('gcode:pause');
        aliasController.command('gcode:pause');
      }

      canonicalController.command(canonical);
      aliasController.command(alias);

      expect(aliasWrites.map(write => write.data)).toEqual(canonicalWrites.map(write => write.data));
      expect(aliasWrites.length).toBeGreaterThan(0);
    });

    test.each([
      ['start', 'gcode:start'],
      ['pause', 'gcode:pause'],
      ['resume', 'gcode:resume'],
      ['stop', 'gcode:stop'],
    ])('%s logs a deprecation warning', (alias) => {
      const { controller } = setup();

      controller.command(alias);

      expect(getGrblLog().warn).toHaveBeenCalledWith(
        `Warning: The "${alias}" command is deprecated and will be removed in a future release.`
      );
    });
  });

  describe('tool_change', () => {
    test.each([
      ['IGNORE_M6_COMMANDS', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, []],
      ['SEND_M6_COMMANDS', TOOL_CHANGE_POLICY_SEND_M6_COMMANDS, []],
      ['MANUAL_TOOL_CHANGE_WCS', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, [
        'G91 G38.2 F10 Z-1\n',
        'G10 L20 P1 Z0\n',
      ]],
      ['MANUAL_TOOL_CHANGE_TLO', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO, [
        'G91 G38.2 F10 Z-1\n',
        'G4 P1\n',
        'G43.1 Z0\n',
      ]],
    ])('%s drives the full tool change and probing sequence', (name, policy, probingLines) => {
      const { controller, writes } = setup({
        ...TOOL_CHANGE_CONFIG,
        'tool.toolChangePolicy': policy,
      });

      controller.command('tool_change');
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual([
        ...TOOL_CHANGE_METRIC_PREFIX,
        ...probingLines,
        ...TOOL_CHANGE_METRIC_SUFFIX,
      ]);
    });

    test('MANUAL_TOOL_CHANGE_CUSTOM_PROBING sends the configured custom probing commands', () => {
      const { controller, writes } = setup({
        ...TOOL_CHANGE_CONFIG,
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
        'tool.toolProbeCustomCommands': 'G38.2 Z-5\nG92 Z0',
      });

      controller.command('tool_change');
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual([
        ...TOOL_CHANGE_METRIC_PREFIX,
        'G38.2 Z-5\n',
        'G92 Z0\n',
        ...TOOL_CHANGE_METRIC_SUFFIX,
      ]);
    });

    test('imperial units convert the tool change and probing values to inches', () => {
      const { controller, writes } = setup({
        ...TOOL_CHANGE_CONFIG,
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      });
      setUnitsG20(controller);

      controller.command('tool_change');
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual([
        ...TOOL_CHANGE_IMPERIAL_PREFIX,
        'G91 G38.2 F0.3937 Z-0.0394\n',
        'G10 L20 P1 Z0\n',
        ...TOOL_CHANGE_IMPERIAL_SUFFIX,
      ]);
    });
  });

  describe('autolevel', () => {
    test('autolevel:start in test mode probes once at the current position', () => {
      const { controller, writes } = setup();

      controller.command('autolevel:start', {
        mode: 'test',
        clearanceZ: 5,
        startZ: 1,
        endZ: -1,
        feedrate: 100,
      });
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual([
        'G90\n',
        'G0 Z5\n',
        'G0 Z1\n',
        'G38.2 Z-1 F100\n',
        'G0 Z5\n',
      ]);
      expect(controller.probeState.config).toBe(null);
    });

    test('autolevel:start in full mode probes a 2x2 grid and seeds the probe state', () => {
      const { controller, writes } = setup();
      const params = {
        startX: 0,
        endX: 10,
        stepX: 10,
        startY: 0,
        endY: 10,
        stepY: 10,
        clearanceZ: 5,
        startZ: 1,
        endZ: -1,
        feedrate: 100,
      };

      controller.command('autolevel:start', params);
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual(AUTOLEVEL_GRID_WRITES);
      expect(controller.probeState.probePoints).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
      ]);
      expect(controller.probeState.probedPositions).toEqual([]);
      expect(controller.probeState.minZ).toBe(null);
      expect(controller.probeState.maxZ).toBe(null);
      expect(controller.probeState.config).toEqual(params);
    });

    test('the probe measurement is stored at the intended grid node with the measured Z', () => {
      const { controller } = setup();
      controller.probeState.probePoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      controller.runner.state.status = {
        mpos: { x: '0.000', y: '0.000', z: '0.000' },
        wpos: { x: '0.000', y: '0.000', z: '0.000' },
      };

      // Quantised reports: the commanded nodes (0,0) and (10,0) read back off-node.
      controller.runner.emit('parameters', {
        raw: '[PRB:0.001,0.001,-1.500:1]',
        name: 'PRB',
        value: { result: 1, x: '0.001', y: '0.001', z: '-1.500' },
      });
      controller.runner.emit('parameters', {
        raw: '[PRB:10.001,-0.001,-1.000:1]',
        name: 'PRB',
        value: { result: 1, x: '10.001', y: '-0.001', z: '-1.000' },
      });

      expect(controller.probeState.probedPositions).toEqual([
        { x: 0, y: 0, z: -1.5 },
        { x: 10, y: 0, z: -1 },
      ]);
      expect(controller.probeState.minZ).toBe(-1.5);
      expect(controller.probeState.maxZ).toBe(-1);
    });

    test('autolevel:stop resets the controller and clears the probe state', () => {
      const { controller, writes } = setup();

      controller.probeState = {
        probedPositions: [{ x: 0, y: 0, z: 0 }],
        probePoints: [{ x: 0, y: 0 }],
        minZ: 0,
        maxZ: 0,
        config: { startX: 0 },
      };

      controller.command('autolevel:stop');

      expect(writes.map(write => write.data)).toEqual(['\x18']);
      expect(controller.probeState).toEqual({
        probedPositions: [],
        probePoints: [],
        minZ: null,
        maxZ: null,
        config: null,
      });
    });

    test('autolevel:getProbeState reports the current probe state', () => {
      const { controller } = setup();

      controller.probeState.minZ = -1.5;
      controller.probeState.maxZ = -1;

      const callback = jest.fn();
      controller.command('autolevel:getProbeState', null, callback);

      expect(callback).toHaveBeenCalledWith(null, { state: controller.probeState });
    });

    test('autolevel:loadFromFile loads nine-column probe rows', async () => {
      const { controller } = setup();
      const filepath = createTempFile(PROBE_FIXTURE);
      const callback = jest.fn();

      controller.command('autolevel:loadFromFile', filepath, callback);
      await delay(100);

      const [err, result] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(result.success).toBe(true);
      expect(controller.probeState.probedPositions).toEqual([
        { x: 0, y: 0, z: -1.5 },
        { x: 10, y: 0, z: -1 },
      ]);
      expect(controller.probeState.minZ).toBe(-1.5);
      expect(controller.probeState.maxZ).toBe(-1);
    });

    test('autolevel:loadFromFile reports an error for a missing file', async () => {
      const { controller } = setup();
      const filepath = path.join(os.tmpdir(), 'grbl-controller-test-does-not-exist.gcode');
      const callback = jest.fn();

      controller.command('autolevel:loadFromFile', filepath, callback);
      await delay(100);

      const [err, result] = callback.mock.calls[0];
      expect(err).toEqual(expect.stringContaining('ENOENT'));
      expect(result).toEqual({ success: false, state: null });
      expect(controller.probeState.probedPositions).toEqual([]);
    });

    test('autolevel:saveToFile writes nine-column probe rows', async () => {
      const { controller } = setup();
      const filepath = path.join(os.tmpdir(), `grbl-controller-test-${process.pid}-${Date.now()}-save.gcode`);
      tempFiles.push(filepath);
      controller.probeState.probedPositions = [
        { x: 0, y: 0, z: -1.5 },
        { x: 10, y: 0, z: -1 },
      ];
      const callback = jest.fn();

      controller.command('autolevel:saveToFile', filepath, callback);
      await delay(100);

      const [err, result] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(result).toEqual({ success: true, filepath });
      expect(fs.readFileSync(filepath, 'utf8')).toBe('0 0 -1.5 0 0 0 0 0 0\n10 0 -1 0 0 0 0 0 0');
    });

    test('autolevel:applyProbeCompensation returns compensated gcode via the callback', () => {
      const { controller } = setup();
      const callback = jest.fn();

      controller.command('autolevel:applyProbeCompensation', {
        gcode: 'G1 X0 Y0 F100',
        probeData: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 0, y: 10, z: 0 },
          { x: 10, y: 10, z: 0 },
        ],
      }, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        compensatedGcode: 'G1 F100 X0.000 Y0.000 Z0.000',
      });
    });

    test('autolevel:applyProbeCompensation passes gcode through when probe data is insufficient', () => {
      const { controller } = setup();
      const callback = jest.fn();

      controller.command('autolevel:applyProbeCompensation', {
        gcode: 'G1 X0 Y0 F100',
        probeData: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
        ],
      }, callback);

      expect(callback).toHaveBeenCalledWith(null, { compensatedGcode: 'G1 X0 Y0 F100' });
    });
  });

  describe('macro and watchdir', () => {
    test('macro:run feeds the macro content through the feeder', () => {
      const { controller, writes } = setup({
        macros: [{ id: 'm1', name: 'Square', content: 'G0 X0\nG0 Y0' }],
      });
      const callback = jest.fn();

      controller.command('macro:run', 'm1', {}, callback);
      flushFeeder(controller);

      expect(writes.map(write => write.data)).toEqual(['G0 X0\n', 'G0 Y0\n']);
      expect(callback).toHaveBeenCalledWith(null);
    });

    test('macro:run with an unknown id writes nothing and skips the callback', () => {
      const { controller, writes } = setup({ macros: [] });
      const callback = jest.fn();

      controller.command('macro:run', 'nope', {}, callback);

      expect(writes).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
    });

    test('macro:load loads the macro content into the sender', () => {
      const { controller, writes } = setup({
        macros: [{ id: 'm1', name: 'Square', content: 'G0 X0' }],
      });
      const callback = jest.fn();

      controller.command('macro:load', 'm1', {}, callback);

      const [err, json] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(json).toEqual(expect.objectContaining({ name: 'Square', total: 2 }));
      expect(writes).toEqual([]);
    });

    test('watchdir:load reads the file through fs and loads it', () => {
      const { controller, writes } = setup();
      const readFileSpy = jest.spyOn(fs, 'readFile').mockImplementation((file, encoding, callback) => {
        callback(null, 'G0 X0\nG0 Y0');
      });
      const callback = jest.fn();

      controller.command('watchdir:load', 'part.nc', callback);

      expect(readFileSpy).toHaveBeenCalledWith('part.nc', 'utf8', expect.any(Function));
      const [err, json] = callback.mock.calls[0];
      expect(err).toBe(null);
      expect(json).toEqual(expect.objectContaining({ name: 'part.nc', total: 3 }));
      expect(writes).toEqual([]);
    });

    test('watchdir:load reports fs read errors', () => {
      const { controller, writes } = setup();
      const failure = new Error('read failure');
      jest.spyOn(fs, 'readFile').mockImplementation((file, encoding, callback) => {
        callback(failure);
      });
      const callback = jest.fn();

      controller.command('watchdir:load', 'part.nc', callback);

      expect(callback).toHaveBeenCalledWith(failure);
      expect(writes).toEqual([]);
    });
  });

  describe('negative', () => {
    test('unknown command writes nothing', () => {
      const { controller, writes, socketEvents } = setup();

      controller.command('nonexistent');

      expect(writes).toEqual([]);
      expect(serialWrites(socketEvents)).toEqual([]);
    });

    test('commands write nothing when the connection is closed', () => {
      const { controller, writes } = setup();
      controller.connection.isOpen = false;

      controller.command('feed_hold');
      controller.command('homing');
      controller.command('gcode', ['G0 X0']);
      controller.command('gcode:load', 'test.gcode', SHORT_PROGRAM);
      controller.command('gcode:start');

      expect(writes).toEqual([]);
    });
  });
});
