/* eslint-env jest */
import fs from 'fs';
import os from 'os';
import path from 'path';

import TinyGController from '../TinyGController';
import config from '../../../services/configstore';
import monitor from '../../../services/monitor';
import { WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED, WORKFLOW_STATE_RUNNING } from '../../../lib/Workflow';
import {
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  WRITE_SOURCE_CLIENT,
  WRITE_SOURCE_FEEDER,
} from '../../constants';
import { createController } from '../../__tests__/helpers/createController';

let controllers = [];
let configSpy = null;
const tempFiles = [];

afterEach(() => {
  controllers.forEach((controller) => controller.destroy());
  controllers = [];
  if (configSpy) {
    configSpy.mockRestore();
    configSpy = null;
  }
  tempFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  tempFiles.length = 0;
});

const setupController = (configOverrides = {}) => {
  configSpy = jest.spyOn(config, 'get').mockImplementation((key, defaultValue) => {
    if (Object.prototype.hasOwnProperty.call(configOverrides, key)) {
      return configOverrides[key];
    }
    return defaultValue;
  });

  const { controller, writes } = createController(TinyGController);

  // TinyG connection.write drops the context argument, so write sources are
  // observed through the socket-facing 'serialport:write' event instead.
  const events = [];
  controller.sockets.test = { emit: (event, ...args) => events.push({ event, args }) };
  controllers.push(controller);

  return { controller, writes, events };
};

const data = (writes) => writes.map((entry) => entry.data);

const sourceOf = (events, text) => events
  .filter((entry) => entry.event === 'serialport:write' && entry.args[0] === text)
  .map((entry) => entry.args[1].source);

// The feeder writes one line per machine acknowledgement and parks on M0/%wait
// holds; unholding between next() calls replays the full queue synchronously.
const drainFeeder = (controller) => {
  while (controller.feeder.size() > 0) {
    if (controller.feeder.state.hold) {
      controller.feeder.unhold();
    }
    controller.feeder.next();
  }
};

const seedModal = (controller, modal) => {
  controller.runner.state = {
    ...controller.runner.state,
    sr: {
      ...controller.runner.state.sr,
      modal: {
        ...controller.runner.state.sr.modal,
        ...modal,
      },
    },
  };
};

const captureConsoleOutput = (fn) => {
  const chunks = [];
  const stdoutSpy = jest.spyOn(console._stdout || process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    fn();
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  }
  return chunks.join('');
};

const tempFile = (name) => {
  const file = path.join(os.tmpdir(), name);
  tempFiles.push(file);
  return file;
};

const toolChangeWrites = ({ changeZ, changeXY, probeXY, probeZ, policyLines }) => [
  'G4 P0.5',
  'M5',
  'G90',
  changeZ,
  changeXY,
  'G4 P0.5',
  'M0',
  probeXY,
  probeZ,
  'G4 P0.5',
  ...policyLines,
  changeZ,
  changeXY,
  'G4 P0.5',
  'M0',
  'G90',
  'G0 X0 Y0',
  'G0 Z0',
  'M5',
  'G4 P5',
].map((line) => line + '\n');

describe('TinyGController', () => {
  describe('command handlers', () => {
    test.each([
      ['feedhold', ['!\n', '{"qr":""}\n']],
      ['cyclestart', ['~\n', '{"qr":""}\n']],
      ['statusreport', ['{"sr":null}\n']],
      ['homing', ['G28.2 X0 Y0 Z0\n']],
      ['sleep', []],
      ['unlock', ['{clear:null}\n']],
      ['jogCancel', ['!\n', '%\n']],
    ])('command %s writes %j', (cmd, expected) => {
      const { controller, writes } = setupController();

      controller.command(cmd);

      expect(data(writes)).toEqual(expected);
    });

    test('feedhold and cyclestart write as the client', () => {
      const { controller, writes, events } = setupController();

      controller.command('feedhold');
      controller.command('cyclestart');

      expect(sourceOf(events, '!\n')).toEqual([WRITE_SOURCE_CLIENT]);
      expect(sourceOf(events, '{"qr":""}\n')).toEqual([WRITE_SOURCE_CLIENT, WRITE_SOURCE_CLIENT]);
      expect(sourceOf(events, '~\n')).toEqual([WRITE_SOURCE_CLIENT]);
      expect(writes).toHaveLength(4);
    });

    test('reset writes a bare control character and clears the feeder', () => {
      const { controller, writes, events } = setupController();

      controller.command('feeder:feed', ['G21', 'G90']);
      controller.command('reset');

      expect(data(writes)).toEqual(['G21\n', '\x18']);
      expect(sourceOf(events, '\x18')).toEqual([WRITE_SOURCE_CLIENT]);
      expect(controller.feeder.size()).toBe(0);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    });

    describe('feedOverride', () => {
      test.each([
        [0, '{mfo:1}'],
        [150, '{mfo:2}'],
        [-96, '{mfo:0.05}'],
        [10, '{mfo:1.1}'],
      ])('feedOverride %i writes %s via the feeder', (value, expected) => {
        const { controller, writes, events } = setupController();
        controller.runner.settings.mfo = 1;

        controller.command('feedOverride', value);

        expect(data(writes)).toEqual([expected + '\n']);
        expect(sourceOf(events, expected + '\n')).toEqual([WRITE_SOURCE_FEEDER]);
      });
    });

    describe('spindleOverride', () => {
      test.each([
        [0, '{sso:1}'],
        [150, '{sso:2}'],
        [-96, '{sso:0.05}'],
        [10, '{sso:1.1}'],
      ])('spindleOverride %i writes %s via the feeder', (value, expected) => {
        const { controller, writes } = setupController();
        controller.runner.settings.sso = 1;

        controller.command('spindleOverride', value);

        expect(data(writes)).toEqual([expected + '\n']);
      });
    });

    describe('rapidOverride', () => {
      test.each([
        [0, '{mto:1}'],
        [100, '{mto:1}'],
        [50, '{mto:0.5}'],
        [25, '{mto:0.25}'],
      ])('rapidOverride %i writes %s via the feeder', (value, expected) => {
        const { controller, writes } = setupController();

        controller.command('rapidOverride', value);

        expect(data(writes)).toEqual([expected + '\n']);
      });

      test('rapidOverride ignores unsupported values', () => {
        const { controller, writes } = setupController();

        controller.command('rapidOverride', 75);

        expect(writes).toEqual([]);
      });
    });

    describe('energizeMotors', () => {
      test('energizeMotors:on without a motor timeout writes nothing', () => {
        const { controller, writes } = setupController();

        controller.command('energizeMotors:on');

        expect(writes).toEqual([]);
        expect(controller.timer.energizeMotors).toBeNull();
      });

      test('energizeMotors:on energizes motors once and arms the timer', () => {
        const { controller, writes } = setupController();
        controller.state.mt = 1;

        controller.command('energizeMotors:on');
        controller.command('energizeMotors:on');

        expect(data(writes)).toEqual(['{me:0}\n', '{pwr:n}\n']);
        expect(controller.timer.energizeMotors).not.toBeNull();
      });

      test('energizeMotors:off de-energizes motors and stops the timer', () => {
        const { controller, writes } = setupController();
        controller.state.mt = 1;

        controller.command('energizeMotors:on');
        controller.command('energizeMotors:off');

        expect(data(writes)).toEqual(['{me:0}\n', '{pwr:n}\n', '{md:0}\n', '{pwr:n}\n']);
        expect(controller.timer.energizeMotors).toBeNull();
      });
    });

    describe('lasertest', () => {
      test('lasertest:on with defaults fires the laser at zero power', () => {
        const { controller, writes } = setupController();

        controller.command('lasertest:on');

        expect(data(writes)).toEqual(['M3S0\n']);
      });

      test('lasertest:on with a duration adds dwell and shutdown lines', () => {
        const { controller, writes } = setupController();

        controller.command('lasertest:on', 50, 250, 2000);
        drainFeeder(controller);

        expect(data(writes)).toEqual(['M3S1000\n', 'G4P0.25\n', 'M5S0\n']);
      });

      test('lasertest:off shuts the laser down', () => {
        const { controller, writes } = setupController();

        controller.command('lasertest:off');

        expect(data(writes)).toEqual(['M5S0\n']);
      });
    });
  });

  describe('gcode and feeder commands', () => {
    test('gcode feeds non-blank lines through the feeder with its context', () => {
      const { controller, writes, events } = setupController();

      controller.command('gcode', 'G21\n\n  \nG90', { myContext: true });
      expect(data(writes)).toEqual(['G21\n']);

      drainFeeder(controller);
      expect(data(writes)).toEqual(['G21\n', 'G90\n']);

      const [event] = events.filter((entry) => entry.event === 'serialport:write' && entry.args[0] === 'G21\n');
      expect(event.args[1]).toMatchObject({ myContext: true, source: WRITE_SOURCE_FEEDER });
    });

    test('feeder:feed delegates to the gcode handler', () => {
      const { controller, writes } = setupController();

      controller.command('feeder:feed', 'G0 X0');

      expect(data(writes)).toEqual(['G0 X0\n']);
    });

    test('feeder:start cycles the machine and drains the first queued line', () => {
      const { controller, writes, events } = setupController();

      controller.command('feeder:feed', ['G0 X0', 'G0 X1']);
      controller.command('feeder:start');

      expect(data(writes)).toEqual(['G0 X0\n', '~\n', '{"qr":""}\n', 'G0 X1\n']);
      expect(sourceOf(events, '~\n')).toEqual([WRITE_SOURCE_CLIENT]);
      expect(sourceOf(events, 'G0 X1\n')).toEqual([WRITE_SOURCE_FEEDER]);
    });

    test('feeder:start is a no-op while a program is running', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:start');
      controller.command('feeder:start');

      expect(writes).toEqual([]);
    });

    test('feeder:stop clears the queue without writing', () => {
      const { controller, writes } = setupController();

      controller.command('feeder:feed', ['G0 X0', 'G0 X1']);
      controller.command('feeder:stop');
      drainFeeder(controller);

      expect(data(writes)).toEqual(['G0 X0\n']);
      expect(controller.feeder.size()).toBe(0);
    });
  });

  describe('sender workflow', () => {
    test('gcode:load stores the program plus a planner dwell and reports sender state', () => {
      const { controller, writes, events } = setupController();
      const callback = jest.fn();

      controller.command('gcode:load', 'test.nc', 'G21\nG90', callback);

      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'test.nc', total: 3 }));
      expect(controller.sender.state.gcode).toBe('G21\nG90\n%wait ; Wait for the planner to empty');
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
      expect(writes).toEqual([]);
      expect(events.filter((entry) => entry.event === 'gcode:load')).toHaveLength(1);
    });

    test('gcode:load pads blank and non-string programs with the planner dwell instead of failing', () => {
      const runScenario = (gcode) => {
        const { controller, writes } = setupController();
        const callback = jest.fn();

        controller.command('gcode:load', 'test.nc', gcode, callback);

        return { callback, writes };
      };

      // The handler appends the '%wait' dwell before Sender.load, so the
      // "Invalid G-code" error branch is unreachable for these inputs.
      const blank = runScenario('');
      expect(blank.callback).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'test.nc', total: 1 }));
      expect(blank.writes).toEqual([]);

      const nonString = runScenario(undefined);
      expect(nonString.callback).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'test.nc', total: 2 }));
      expect(nonString.writes).toEqual([]);
    });

    test('gcode:unload clears the sender without writing', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      controller.command('gcode:unload');

      expect(data(writes)).toEqual([]);
      expect(controller.sender.state.gcode).toBe('');
      expect(controller.sender.state.name).toBe('');
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    });

    test('gcode:start sends the first program line with an N-prefixed line number', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      controller.command('gcode:start');

      expect(data(writes)).toEqual(['N1G21\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
      expect(controller.sender.state.sent).toBe(1);
    });

    test('gcode:pause feedholds and reports the queue', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      controller.command('gcode:start');
      controller.command('gcode:pause');

      expect(data(writes)).toEqual(['N1G21\n', '!\n', '{"qr":""}\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_PAUSED);
      expect(controller.sender.state.hold).toBe(true);
    });

    test('gcode:resume resumes the sender before reporting the queue', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      controller.command('gcode:start');
      controller.command('gcode:pause');
      controller.command('gcode:resume');

      expect(data(writes)).toEqual(['N1G21\n', '!\n', '{"qr":""}\n', '~\n', 'N2G90\n', '{"qr":""}\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_RUNNING);
      expect(controller.sender.state.hold).toBe(false);
    });

    test('gcode:stop without force only reports the queue', () => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      controller.command('gcode:start');
      controller.command('gcode:stop');

      expect(data(writes)).toEqual(['N1G21\n', '{"qr":""}\n']);
      expect(controller.workflow.state).toBe(WORKFLOW_STATE_IDLE);
    });

    test.each([
      [undefined, ['!\n', '%\n', 'M30\n', '{"qr":""}\n']],
      [100.04, ['\x04\n', 'M30\n', '{"qr":""}\n']],
      [101.02, ['\x04\n', '{"qr":""}\n']],
    ])('gcode:stop with force and firmware build %p kills the job accordingly', (fb, expected) => {
      const { controller, writes } = setupController();

      controller.command('gcode:load', 'test.nc', 'G21\nG90');
      if (fb !== undefined) {
        controller.settings.fb = fb;
      }
      controller.command('gcode:stop', { force: true });

      expect(data(writes)).toEqual(expected);
    });

    test.each([
      ['start', 'gcode:start'],
      ['stop', 'gcode:stop'],
      ['pause', 'gcode:pause'],
      ['resume', 'gcode:resume'],
    ])('deprecated alias %s writes identically to %s', (alias, canonical) => {
      const runScenario = (cmd) => {
        const { controller, writes } = setupController();
        controller.command('gcode:load', 'test.nc', 'G21\nG90');
        controller.command(cmd);
        return data(writes);
      };

      expect(runScenario(alias)).toEqual(runScenario(canonical));
    });

    test('deprecated aliases log a deprecation warning', () => {
      const output = captureConsoleOutput(() => {
        const { controller } = setupController();
        controller.command('start');
      });

      expect(output).toContain('is deprecated');
    });
  });

  describe('macros and watchdir', () => {
    const macros = [{ id: 'm1', name: 'box.nc', content: 'G21\nG90' }];

    test('macro:run feeds the macro content', () => {
      const { controller, writes } = setupController({ macros });
      const callback = jest.fn();

      controller.command('macro:run', 'm1', {}, callback);
      drainFeeder(controller);

      expect(callback).toHaveBeenCalledWith(null);
      expect(data(writes)).toEqual(['G21\n', 'G90\n']);
    });

    test('macro:run without a matching macro writes nothing and skips the callback', () => {
      const { controller, writes } = setupController({ macros });
      const callback = jest.fn();

      controller.command('macro:run', 'missing', callback);

      expect(callback).not.toHaveBeenCalled();
      expect(writes).toEqual([]);
    });

    test('macro:load loads the macro into the sender', () => {
      const { controller, writes } = setupController({ macros });
      const callback = jest.fn();

      controller.command('macro:load', 'm1', callback);

      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'box.nc', total: 3 }));
      expect(controller.sender.state.gcode).toBe('G21\nG90\n%wait ; Wait for the planner to empty');
      expect(writes).toEqual([]);
    });

    test('macro:load without a matching macro skips the callback', () => {
      const { controller } = setupController({ macros });
      const callback = jest.fn();

      controller.command('macro:load', 'missing', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    test('watchdir:load loads the monitored file into the sender', () => {
      const { controller, writes } = setupController();
      const readFileSpy = jest.spyOn(monitor, 'readFile').mockImplementation((file, callback) => callback(null, 'G21\nG90'));
      const callback = jest.fn();

      controller.command('watchdir:load', 'part.nc', callback);

      expect(readFileSpy).toHaveBeenCalledWith('part.nc', expect.any(Function));
      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'part.nc', total: 3 }));
      expect(controller.sender.state.gcode).toBe('G21\nG90\n%wait ; Wait for the planner to empty');
      expect(writes).toEqual([]);
      readFileSpy.mockRestore();
    });

    test('watchdir:load forwards read errors to the callback', () => {
      const { controller } = setupController();
      const readFileSpy = jest.spyOn(monitor, 'readFile').mockImplementation((file, callback) => callback(new Error('boom')));
      const callback = jest.fn();

      controller.command('watchdir:load', 'part.nc', callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].message).toBe('boom');
      readFileSpy.mockRestore();
    });
  });

  describe('tool:change', () => {
    const metricPins = {
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

    test.each([
      [TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, 'ignore M6 commands'],
      [TOOL_CHANGE_POLICY_SEND_M6_COMMANDS, 'send M6 commands'],
    ])('metric sequence with policy %i (%s)', (policy) => {
      const { controller, writes } = setupController({
        ...metricPins,
        'tool.toolChangePolicy': policy,
      });
      seedModal(controller, { spindle: 'M5', wcs: 'G54' });

      controller.command('tool:change');
      drainFeeder(controller);

      expect(data(writes)).toEqual(toolChangeWrites({
        changeZ: 'G53 G0 Z0.000',
        changeXY: 'G53 G0 X0.000 Y0.000',
        probeXY: 'G53 G0 X0.000 Y0.000',
        probeZ: 'G53 G0 Z0.000',
        policyLines: [],
      }));
    });

    test('metric sequence with the manual tool change WCS policy probes and offsets the WCS', () => {
      const { controller, writes } = setupController({
        ...metricPins,
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      });
      seedModal(controller, { spindle: 'M5', wcs: 'G54' });

      controller.command('tool:change');
      drainFeeder(controller);

      expect(data(writes)).toEqual(toolChangeWrites({
        changeZ: 'G53 G0 Z0.000',
        changeXY: 'G53 G0 X0.000 Y0.000',
        probeXY: 'G53 G0 X0.000 Y0.000',
        probeZ: 'G53 G0 Z0.000',
        policyLines: ['G91 G38.2 F10 Z-1', 'G10 L20 P1 Z0'],
      }));
    });

    test('metric sequence with the manual tool change TLO policy probes and sets a tool offset', () => {
      const { controller, writes } = setupController({
        ...metricPins,
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
      });
      seedModal(controller, { spindle: 'M5', wcs: 'G54' });

      controller.command('tool:change');
      drainFeeder(controller);

      expect(data(writes)).toEqual(toolChangeWrites({
        changeZ: 'G53 G0 Z0.000',
        changeXY: 'G53 G0 X0.000 Y0.000',
        probeXY: 'G53 G0 X0.000 Y0.000',
        probeZ: 'G53 G0 Z0.000',
        policyLines: ['G91 G38.2 F10 Z-1', 'G4 P1', '{tofz:0}'],
      }));
    });

    test('metric sequence with the custom probing policy inserts the configured commands', () => {
      const { controller, writes } = setupController({
        ...metricPins,
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
        'tool.toolProbeCustomCommands': 'G38.2 Z-5 F25\nG92 Z0',
      });
      seedModal(controller, { spindle: 'M5', wcs: 'G54' });

      controller.command('tool:change');
      drainFeeder(controller);

      expect(data(writes)).toEqual(toolChangeWrites({
        changeZ: 'G53 G0 Z0.000',
        changeXY: 'G53 G0 X0.000 Y0.000',
        probeXY: 'G53 G0 X0.000 Y0.000',
        probeZ: 'G53 G0 Z0.000',
        policyLines: ['G38.2 Z-5 F25', 'G92 Z0'],
      }));
    });

    test('imperial units convert pinned millimeter positions and values', () => {
      const { controller, writes } = setupController({
        'tool.toolChangePolicy': TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
        'tool.toolChangeX': 25.4,
        'tool.toolChangeY': 0,
        'tool.toolChangeZ': 25.4,
        'tool.toolProbeX': 0,
        'tool.toolProbeY': 0,
        'tool.toolProbeZ': 0,
        'tool.toolProbeCommand': 'G38.2',
        'tool.toolProbeDistance': 25.4,
        'tool.toolProbeFeedrate': 254,
        'tool.touchPlateHeight': 25.4,
      });
      seedModal(controller, { spindle: 'M5', wcs: 'G54', units: 'G20' });

      controller.command('tool:change');
      drainFeeder(controller);

      expect(data(writes)).toEqual(toolChangeWrites({
        changeZ: 'G53 G0 Z1.0000',
        changeXY: 'G53 G0 X1.0000 Y0.0000',
        probeXY: 'G53 G0 X0.0000 Y0.0000',
        probeZ: 'G53 G0 Z0.0000',
        policyLines: ['G91 G38.2 F10 Z-1', 'G10 L20 P1 Z1'],
      }));
    });
  });

  describe('autolevel', () => {
    test('autolevel:start in test mode emits the exact five-line probe sequence', () => {
      const { controller, writes } = setupController();

      controller.command('autolevel:start', {
        mode: 'test',
        clearanceZ: 5,
        startZ: 1,
        endZ: -1,
        feedrate: 100,
      });
      drainFeeder(controller);

      expect(data(writes)).toEqual([
        'G90\n',
        'G0 Z5\n',
        'G0 Z1\n',
        'G38.2 Z-1 F100\n',
        'G0 Z5\n',
      ]);
    });

    test('autolevel:start in full mode probes a 2x2 grid in row-major order', () => {
      const params = {
        mode: 'full',
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
      const { controller, writes } = setupController();

      controller.command('autolevel:start', params);
      drainFeeder(controller);

      const point = (x, y, index) => [
        'G90\n',
        'G0 Z5\n',
        `G0 X${x} Y${y}\n`,
        'G0 Z1\n',
        `G38.2 Z-1 F${index === 0 ? 50 : 100}\n`,
        'G0 Z5\n',
      ];
      expect(data(writes)).toEqual([
        ...point(0, 0, 0),
        ...point(10, 0, 1),
        ...point(0, 10, 2),
        ...point(10, 10, 3),
      ]);
      expect(controller.probeState.probePoints).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
      ]);
      expect(controller.probeState.probedPositions).toEqual([]);
      expect(controller.probeState.config).toEqual({
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
      });
    });

    test('autolevel:stop resets the board and clears the probe state', () => {
      const { controller, writes } = setupController();

      controller.command('autolevel:start', {
        mode: 'full',
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
      });
      controller.command('autolevel:stop');

      expect(data(writes)).toEqual(['G90\n', '\x18']);
      expect(controller.feeder.size()).toBe(0);
      expect(controller.probeState).toEqual({
        probedPositions: [],
        probePoints: [],
        minZ: null,
        maxZ: null,
        config: null,
      });
    });

    test('autolevel:getProbeState reports the current probe state', () => {
      const { controller } = setupController();
      controller.probeState.probedPositions = [{ x: 1, y: 2, z: 3 }];
      const callback = jest.fn();

      controller.command('autolevel:getProbeState', null, callback);

      expect(callback).toHaveBeenCalledWith(null, { state: controller.probeState });
    });

    test('autolevel:loadFromFile parses nine-column probe rows', async () => {
      const { controller } = setupController();
      const file = tempFile('cncjs-tinyg-probe-data.txt');
      fs.writeFileSync(file, '0 0 1 0 0 0 0 0 0\n10 0 -2 0 0 0 0 0 0\n', 'utf8');
      const callback = jest.fn();

      await new Promise((resolve) => {
        controller.command('autolevel:loadFromFile', file, (...args) => {
          callback(...args);
          resolve();
        });
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const [err, payload] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(payload.success).toBe(true);
      expect(controller.probeState.probedPositions).toEqual([
        { x: 0, y: 0, z: 1 },
        { x: 10, y: 0, z: -2 },
      ]);
      expect(controller.probeState.minZ).toBe(-2);
      expect(controller.probeState.maxZ).toBe(1);
    });

    test('autolevel:loadFromFile reports missing files via the callback', async () => {
      const { controller } = setupController();
      const file = tempFile('cncjs-tinyg-missing-probe-data.txt');
      const callback = jest.fn();

      await new Promise((resolve) => {
        controller.command('autolevel:loadFromFile', file, (...args) => {
          callback(...args);
          resolve();
        });
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const [err, payload] = callback.mock.calls[0];
      expect(err).toContain('ENOENT');
      expect(payload).toEqual({ success: false, state: null });
    });

    test('autolevel:saveToFile writes exactly nine columns per row', async () => {
      const { controller } = setupController();
      controller.probeState.probedPositions = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 },
      ];
      const file = tempFile('cncjs-tinyg-probe-save.txt');
      const callback = jest.fn();

      await new Promise((resolve) => {
        controller.command('autolevel:saveToFile', file, (...args) => {
          callback(...args);
          resolve();
        });
      });

      expect(callback).toHaveBeenCalledWith(null, { success: true, filepath: file });
      expect(fs.readFileSync(file, 'utf8')).toBe('1 2 3 0 0 0 0 0 0\n4 5 6 0 0 0 0 0 0');
    });

    test('autolevel:applyProbeCompensation returns the compensated gcode via the callback', () => {
      const { controller } = setupController();
      const callback = jest.fn();
      const probeData = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
        { x: 10, y: 10, z: 0 },
      ];

      controller.command('autolevel:applyProbeCompensation', { gcode: 'M5\nG90', probeData }, callback);

      expect(callback).toHaveBeenCalledWith(null, { compensatedGcode: 'M5\nG90' });
    });
  });

  describe('negative cases', () => {
    test('unknown command writes nothing', () => {
      const { controller, writes } = setupController();

      controller.command('nonexistent');

      expect(writes).toEqual([]);
    });

    test('a closed connection suppresses client and feeder writes', () => {
      const { controller, writes } = setupController();
      controller.connection.isOpen = false;

      controller.command('feedhold');
      controller.command('gcode', 'G21\nG90');
      controller.command('homing');

      expect(writes).toEqual([]);
    });
  });
});
