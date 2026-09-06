/* eslint-env jest */
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

import SmoothieController from '../SmoothieController';
import config from '../../../services/configstore';
import monitor from '../../../services/monitor';
import * as autolevel from '../../../lib/autolevel';
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
import { SMOOTHIE_ACTIVE_STATE_HOLD } from '../constants';

const originalConfigGet = config.get;
let configOverrides = {};
let configGetSpy = null;
let controllers = [];
const tempFiles = [];

const setConfig = (overrides) => {
  Object.assign(configOverrides, overrides);
};

const create = () => {
  const { controller, writes } = createController(SmoothieController);
  controllers.push(controller);
  return { controller, writes };
};

const written = (writes) => writes.map((entry) => entry.data);

// SmoothieController forwards no context to connection.write, but the source
// distinction is observable on the 'serialport:write' socket event.
const captureSerialWrites = (controller) => {
  const events = [];
  controller.sockets['test-socket'] = {
    emit: (event, ...args) => {
      if (event === 'serialport:write') {
        events.push({ data: args[0], context: args[1] });
      }
    },
  };
  return events;
};

// Drives the feeder queue to completion: each runner "ok" releases the next
// queued line, and feeder holds (M0) are lifted the same way.
const pumpFeeder = (controller) => {
  for (;;) {
    if (controller.feeder.state.hold) {
      controller.feeder.unhold();
    }
    if (controller.feeder.size() === 0 && !controller.feeder.isPending()) {
      return;
    }
    controller.runner.emit('ok', { raw: 'ok' });
  }
};

const seedStatus = (controller, patch) => {
  controller.runner.state = {
    ...controller.runner.state,
    status: { ...controller.runner.state.status, ...patch },
  };
};

const seedModal = (controller, patch) => {
  controller.runner.state = {
    ...controller.runner.state,
    parserstate: {
      ...controller.runner.state.parserstate,
      modal: { ...controller.runner.state.parserstate.modal, ...patch },
    },
  };
};

const waitForCallback = (callback) => new Promise((resolve, reject) => {
  let attempts = 0;
  const check = () => {
    if (callback.mock.calls.length > 0) {
      resolve();
      return;
    }
    if (attempts > 1000) {
      reject(new Error('callback was never invoked'));
      return;
    }
    attempts += 1;
    setImmediate(check);
  };
  check();
});

beforeEach(() => {
  configOverrides = {};
  configGetSpy = jest.spyOn(config, 'get').mockImplementation((key, defaultValue) => (
    Object.prototype.hasOwnProperty.call(configOverrides, key)
      ? configOverrides[key]
      : originalConfigGet.call(config, key, defaultValue)
  ));
});

afterEach(async () => {
  configGetSpy.mockRestore();
  controllers.forEach((controller) => controller.destroy());
  controllers = [];
  await Promise.all(tempFiles.splice(0).map((file) => fsp.unlink(file).catch(() => {})));
});

describe('SmoothieController', () => {
  describe('simple commands', () => {
    test('feedhold writes suspend with the client write source', () => {
      const { controller, writes } = create();
      const serialEvents = captureSerialWrites(controller);

      controller.command('feedhold');

      expect(written(writes)).toEqual(['suspend\n']);
      expect(serialEvents[0]).toEqual({ data: 'suspend\n', context: { source: WRITE_SOURCE_CLIENT } });
    });

    test('cyclestart writes resume', () => {
      const { controller, writes } = create();

      controller.command('cyclestart');

      expect(written(writes)).toEqual(['resume\n']);
    });

    test('statusreport writes the realtime question mark without a newline', () => {
      const { controller, writes } = create();

      controller.command('statusreport');

      expect(written(writes)).toEqual(['?']);
      expect(controller.actionMask.replyStatusReport).toBe(true);
    });

    test('homing writes the Smoothie homing command', () => {
      const { controller, writes } = create();

      controller.command('homing');

      expect(written(writes)).toEqual(['$H\n']);
    });

    test('sleep writes nothing (not supported)', () => {
      const { controller, writes } = create();

      controller.command('sleep');

      expect(writes).toEqual([]);
    });

    test('unlock writes the alarm unlock command', () => {
      const { controller, writes } = create();

      controller.command('unlock');

      expect(written(writes)).toEqual(['$X\n']);
    });

    test('reset writes a realtime control-x and drops the feeder queue', () => {
      const { controller, writes } = create();

      controller.command('gcode', 'G0 X1');
      controller.command('reset');

      expect(written(writes)).toEqual(['G0 X1\n', '\x18']);
      expect(controller.feeder.size()).toBe(0);
    });
  });

  describe('overrides', () => {
    test.each([
      [0, 150, 'M220S100', 100],
      [100, 150, 'M220S200', 200],
      [-10, 15, 'M220S10', 10],
      [30, 100, 'M220S130', 130],
    ])('feedOverride %p with ovF=%p writes %s', (value, seededOvF, expectedCommand, expectedOvF) => {
      const { controller, writes } = create();
      seedStatus(controller, { ovF: seededOvF });

      controller.command('feedOverride', value);

      expect(written(writes)).toEqual([`${expectedCommand}\n`]);
      expect(controller.runner.state.status.ovF).toBe(expectedOvF);
    });

    test.each([
      [0, 150, 'M221S100', 100],
      [100, 150, 'M221S200', 200],
      [-10, 15, 'M221S10', 10],
      [30, 100, 'M221S130', 130],
    ])('spindleOverride %p with ovS=%p writes %s', (value, seededOvS, expectedCommand, expectedOvS) => {
      const { controller, writes } = create();
      seedStatus(controller, { ovS: seededOvS });

      controller.command('spindleOverride', value);

      expect(written(writes)).toEqual([`${expectedCommand}\n`]);
      expect(controller.runner.state.status.ovS).toBe(expectedOvS);
    });

    test('override lines are fed through the feeder write source', () => {
      const { controller, writes } = create();
      const serialEvents = captureSerialWrites(controller);
      seedStatus(controller, { ovF: 100 });

      controller.command('feedOverride', 30);

      expect(written(writes)).toEqual(['M220S130\n']);
      expect(serialEvents[0].data).toBe('M220S130\n');
      expect(serialEvents[0].context.source).toBe(WRITE_SOURCE_FEEDER);
    });

    test('feedOverride without a seeded ovF writes M220SNaN because the runner status is unguarded', () => {
      const { controller, writes } = create();

      controller.command('feedOverride', 30);

      expect(written(writes)).toEqual(['M220SNaN\n']);
      expect(Number.isNaN(controller.runner.state.status.ovF)).toBe(true);
    });

    test('rapidOverride is not supported and writes nothing', () => {
      const { controller, writes } = create();

      controller.command('rapidOverride', 50);

      expect(writes).toEqual([]);
    });
  });

  describe('lasertest', () => {
    test('lasertest:on fires the laser at 0% power in manual mode by default', () => {
      const { controller, writes } = create();

      controller.command('lasertest:on');

      expect(written(writes)).toEqual(['M3\n', 'fire 0\n']);
    });

    test('lasertest:on fires, dwells, and turns the laser off when a duration is given', () => {
      const { controller, writes } = create();

      controller.command('lasertest:on', 50, 1000);

      expect(written(writes)).toEqual(['M3\n', 'fire 50\n', 'G4P1\n', 'fire off\n', 'M5\n']);
    });

    test('lasertest:off turns the laser off and returns to auto mode', () => {
      const { controller, writes } = create();

      controller.command('lasertest:off');

      expect(written(writes)).toEqual(['fire off\n', 'M5\n']);
    });
  });

  describe('sender workflow', () => {
    test('gcode:load stores the program plus the dwell line and returns the sender snapshot', () => {
      const { controller, writes } = create();
      const callback = jest.fn();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2', callback);

      expect(writes).toEqual([]);
      expect(callback).toHaveBeenCalledTimes(1);
      const [err, snapshot] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(snapshot).toMatchObject({
        name: 'gcode-test',
        total: 3,
        sent: 0,
        received: 0,
        hold: false,
      });
    });

    test('gcode:load accepts the callback in the context position', () => {
      const { controller } = create();
      const callback = jest.fn();

      controller.command('gcode:load', 'gcode-test', 'G0 X1', callback);

      const [err, snapshot] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(snapshot).toMatchObject({ name: 'gcode-test', total: 2 });
    });

    test('gcode:start streams the short program into the controller buffer', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n']);
    });

    test('gcode:pause suspends the machine', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');
      controller.command('gcode:pause');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n', 'suspend\n']);
    });

    test('gcode:resume resumes the machine after a pause', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');
      controller.command('gcode:pause');
      controller.command('gcode:resume');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n', 'suspend\n', 'resume\n']);
    });

    test('gcode:resume writes the next line once the buffer has space again', () => {
      const { controller, writes } = create();
      const program = Array.from({ length: 30 }, () => 'G0 X1').join('\n');

      controller.command('gcode:load', 'gcode-test', program);
      controller.command('gcode:start');
      expect(written(writes)).toHaveLength(19);
      controller.command('gcode:pause');
      expect(written(writes)[19]).toBe('suspend\n');
      controller.command('gcode:resume');
      expect(written(writes)[20]).toBe('resume\n');
      expect(written(writes)[21]).toBe('G0 X1\n');
      expect(written(writes)).toHaveLength(22);
    });

    test('gcode:stop writes nothing unless the machine is on hold', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');
      controller.command('gcode:pause');
      controller.command('gcode:stop');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n', 'suspend\n']);
    });

    test('gcode:stop writes resume when the active state is Hold', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');
      controller.command('gcode:pause');
      controller.state = { status: { activeState: SMOOTHIE_ACTIVE_STATE_HOLD } };
      controller.command('gcode:stop');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n', 'suspend\n', 'resume\n']);
    });

    test('gcode:unload clears the sender without writing', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:unload');

      expect(writes).toEqual([]);
      expect(controller.sender.state.name).toBe('');
      expect(controller.sender.state.total).toBe(0);
    });
  });

  describe('deprecated aliases', () => {
    test.each([
      ['start', 'gcode:start', (ctl) => {
        ctl.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      }],
      ['stop', 'gcode:stop', (ctl) => {
        ctl.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
        ctl.state = { status: { activeState: SMOOTHIE_ACTIVE_STATE_HOLD } };
      }],
      ['pause', 'gcode:pause', (ctl) => {
        ctl.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      }],
      ['resume', 'gcode:resume', (ctl) => {
        ctl.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
        ctl.command('gcode:start');
        ctl.command('gcode:pause');
      }],
    ])('%s produces the same writes as %s', (alias, canonical, prepare) => {
      const aliasState = create();
      const canonicalState = create();
      prepare(aliasState.controller);
      prepare(canonicalState.controller);

      aliasState.controller.command(alias);
      canonicalState.controller.command(canonical);

      expect(aliasState.writes.length).toBeGreaterThan(0);
      expect(written(aliasState.writes)).toEqual(written(canonicalState.writes));
    });
  });

  describe('feeder commands', () => {
    test('gcode feeds lines through the feeder source and filters empty lines', () => {
      const { controller, writes } = create();
      const serialEvents = captureSerialWrites(controller);

      controller.command('gcode', 'G0 X1\n\nG0 X2');

      expect(written(writes)).toEqual(['G0 X1\n']);

      pumpFeeder(controller);

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n']);
      expect(serialEvents.map((event) => event.context.source)).toEqual([
        WRITE_SOURCE_FEEDER,
        WRITE_SOURCE_FEEDER,
      ]);
    });

    test('feeder:feed feeds commands like gcode', () => {
      const { controller, writes } = create();

      controller.command('feeder:feed', 'G0 X1');

      expect(written(writes)).toEqual(['G0 X1\n']);
    });

    test('feeder:start resumes the feeder and drains the queue', () => {
      const { controller, writes } = create();

      controller.command('feeder:feed', 'G0 X5\nG0 X6');
      controller.command('feeder:start');

      expect(written(writes)).toEqual(['G0 X5\n', 'resume\n', 'G0 X6\n']);
    });

    test('feeder:start does nothing while a program is running', () => {
      const { controller, writes } = create();

      controller.command('gcode:load', 'gcode-test', 'G0 X1\nG0 X2');
      controller.command('gcode:start');
      controller.command('feeder:feed', 'G0 X5');
      controller.command('feeder:start');

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n', 'G4 S0.5\n', 'G0 X5\n']);
    });

    test('feeder:stop drops queued lines', () => {
      const { controller, writes } = create();

      controller.command('feeder:feed', 'G0 X5\nG0 X6');
      controller.command('feeder:stop');
      pumpFeeder(controller);

      expect(written(writes)).toEqual(['G0 X5\n']);
    });
  });

  describe('macros and watch directory', () => {
    const macros = [{ id: 'm1', name: 'Macro One', content: 'G0 X1\nG0 X2' }];

    test('macro:run feeds the macro content through the feeder', () => {
      const { controller, writes } = create();
      setConfig({ macros });
      const callback = jest.fn();

      controller.command('macro:run', 'm1', {}, callback);

      expect(written(writes)).toEqual(['G0 X1\n']);

      pumpFeeder(controller);

      expect(written(writes)).toEqual(['G0 X1\n', 'G0 X2\n']);
      expect(callback).toHaveBeenCalledWith(null);
    });

    test('macro:load loads the macro content into the sender', () => {
      const { controller, writes } = create();
      setConfig({ macros });
      const callback = jest.fn();

      controller.command('macro:load', 'm1', {}, callback);

      expect(writes).toEqual([]);
      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
        name: 'Macro One',
        total: 3,
      }));
    });

    test('missing macros invoke neither the feeder nor the callback', () => {
      const { controller, writes } = create();
      setConfig({ macros });
      const runCallback = jest.fn();
      const loadCallback = jest.fn();

      controller.command('macro:run', 'missing', {}, runCallback);
      controller.command('macro:load', 'missing', {}, loadCallback);

      expect(writes).toEqual([]);
      expect(runCallback).not.toHaveBeenCalled();
      expect(loadCallback).not.toHaveBeenCalled();
    });

    test('watchdir:load reads the file through the monitor and loads it', () => {
      const { controller, writes } = create();
      jest.spyOn(monitor, 'readFile').mockImplementation((file, callback) => callback(null, 'G0 X1\nG0 X2'));
      const callback = jest.fn();

      controller.command('watchdir:load', 'watch/x.nc', callback);

      expect(monitor.readFile).toHaveBeenCalledWith('watch/x.nc', expect.any(Function));
      expect(writes).toEqual([]);
      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
        name: 'watch/x.nc',
        total: 3,
      }));
    });

    test('watchdir:load forwards monitor read errors to the callback', () => {
      const { controller, writes } = create();
      jest.spyOn(monitor, 'readFile').mockImplementation((file, callback) => callback(new Error('read failed')));
      const callback = jest.fn();

      controller.command('watchdir:load', 'watch/x.nc', callback);

      expect(writes).toEqual([]);
      const [err] = callback.mock.calls[0];
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('read failed');
    });
  });

  describe('tool:change', () => {
    const runToolChange = ({ policy, overrides = {}, modalUnits = 'G21' }) => {
      const { controller, writes } = create();
      setConfig({
        'tool.toolChangePolicy': policy,
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
        ...overrides,
      });
      seedModal(controller, { units: modalUnits });
      controller.command('tool:change');
      pumpFeeder(controller);
      return written(writes);
    };

    const metricToolChangeSequence = (policyLines) => [
      'G4 S0.5\n',
      'M5\n',
      'G90\n',
      'G53 G0 Z0.000\n',
      'G53 G0 X0.000 Y0.000\n',
      'G4 S0.5\n',
      'M0\n',
      'G53 G0 X0.000 Y0.000\n',
      'G53 G0 Z0.000\n',
      'G4 S0.5\n',
      ...policyLines,
      'G53 G0 Z0.000\n',
      'G53 G0 X0.000 Y0.000\n',
      'G4 S0.5\n',
      'M0\n',
      'G90\n',
      'G0 X0 Y0\n',
      'G0 Z0\n',
      'M5\n',
      'G4 S5\n',
    ];

    test.each([
      ['IGNORE_M6_COMMANDS', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, []],
      ['SEND_M6_COMMANDS', TOOL_CHANGE_POLICY_SEND_M6_COMMANDS, []],
      ['MANUAL_TOOL_CHANGE_WCS', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, [
        'G91 G38.2 F10 Z-1\n',
        'G10 L20 P1 Z0\n',
      ]],
      ['MANUAL_TOOL_CHANGE_TLO', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO, [
        'G91 G38.2 F10 Z-1\n',
        'G4 S1\n',
        'G43.1 Z0\n',
      ]],
      ['MANUAL_TOOL_CHANGE_CUSTOM_PROBING', TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING, [
        'G4 P0.5\n',
        'G30 Z0.1\n',
      ]],
    ])('with policy %s writes the exact resolved sequence', (_name, policy, policyLines) => {
      const overrides = policy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING
        ? { 'tool.toolProbeCustomCommands': 'G4 P0.5\nG30 Z0.1' }
        : {};

      expect(runToolChange({ policy, overrides })).toEqual(metricToolChangeSequence(policyLines));
    });

    test('converts pinned metric config values to imperial units under G20', () => {
      expect(runToolChange({
        policy: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
        modalUnits: 'G20',
        overrides: {
          'tool.toolChangeX': 25.4,
          'tool.toolChangeY': 25.4,
          'tool.toolChangeZ': 25.4,
          'tool.toolProbeDistance': 25.4,
          'tool.toolProbeFeedrate': 254,
          'tool.touchPlateHeight': 12.7,
        },
      })).toEqual([
        'G4 S0.5\n',
        'M5\n',
        'G90\n',
        'G53 G0 Z1.0000\n',
        'G53 G0 X1.0000 Y1.0000\n',
        'G4 S0.5\n',
        'M0\n',
        'G53 G0 X0.0000 Y0.0000\n',
        'G53 G0 Z0.0000\n',
        'G4 S0.5\n',
        'G91 G38.2 F10 Z-1\n',
        'G10 L20 P1 Z0.5\n',
        'G53 G0 Z1.0000\n',
        'G53 G0 X1.0000 Y1.0000\n',
        'G4 S0.5\n',
        'M0\n',
        'G90\n',
        'G0 X0 Y0\n',
        'G0 Z0\n',
        'M5\n',
        'G4 S5\n',
      ]);
    });
  });

  describe('autolevel', () => {
    const gridParams = {
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
    };

    test('autolevel:start in test mode probes once at the current position', () => {
      const { controller, writes } = create();

      controller.command('autolevel:start', { mode: 'test', ...gridParams });

      expect(written(writes)).toEqual(['G90\n']);

      pumpFeeder(controller);

      expect(written(writes)).toEqual([
        'G90\n',
        'G0 Z5\n',
        'G0 Z2\n',
        'G38.2 Z-1 F100\n',
        'G0 Z5\n',
      ]);
    });

    test('autolevel:start in full mode resets probe state and probes the grid', () => {
      const { controller, writes } = create();

      controller.command('autolevel:start', gridParams);

      expect(written(writes)).toEqual(['G90\n']);

      pumpFeeder(controller);

      expect(written(writes)).toEqual([
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
      expect(controller.probeState.config).toEqual(gridParams);
      expect(controller.probeState.probedPositions).toEqual([]);
      expect(controller.probeState.minZ).toBeNull();
      expect(controller.probeState.maxZ).toBeNull();
    });

    test('the probe measurement is stored at the intended grid node with the measured Z', () => {
      const { controller } = create();
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

    test('autolevel:stop resets the connection and clears probe state', () => {
      const { controller, writes } = create();
      controller.probeState = {
        probedPositions: [{ x: 1, y: 2, z: 3 }],
        probePoints: [{ x: 0, y: 0 }],
        minZ: 3,
        maxZ: 3,
        config: gridParams,
      };

      controller.command('autolevel:stop');

      expect(written(writes)).toEqual(['\x18']);
      expect(controller.probeState).toEqual({
        probedPositions: [],
        probePoints: [],
        minZ: null,
        maxZ: null,
        config: null,
      });
    });

    test('autolevel:getProbeState returns the live probe state', () => {
      const { controller } = create();
      const callback = jest.fn();

      controller.command('autolevel:getProbeState', null, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      const [, payload] = callback.mock.calls[0];
      expect(payload.state).toBe(controller.probeState);
    });

    test('autolevel:loadFromFile loads 9-column probe rows', async () => {
      const { controller } = create();
      const filepath = path.join(os.tmpdir(), `cncjs-smoothie-probes-${process.pid}-${Date.now()}.txt`);
      tempFiles.push(filepath);
      await fsp.writeFile(filepath, '0 0 -1.5 0 0 0 0 0 0\n10 0 -1.2 0 0 0 0 0 0\n', 'utf8');
      const callback = jest.fn();

      controller.command('autolevel:loadFromFile', filepath, callback);
      await waitForCallback(callback);

      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: true }));
      expect(controller.probeState.probedPositions).toEqual([
        { x: 0, y: 0, z: -1.5 },
        { x: 10, y: 0, z: -1.2 },
      ]);
      expect(controller.probeState.minZ).toBe(-1.5);
      expect(controller.probeState.maxZ).toBe(-1.2);
    });

    test('autolevel:loadFromFile reports the read error message for a missing file', async () => {
      const { controller } = create();
      const callback = jest.fn();

      controller.command('autolevel:loadFromFile', path.join(os.tmpdir(), 'cncjs-smoothie-missing-probe-file.txt'), callback);
      await waitForCallback(callback);

      const [err, payload] = callback.mock.calls[0];
      expect(typeof err).toBe('string');
      expect(payload).toEqual({ success: false, state: null });
    });

    test('autolevel:saveToFile writes 9-column rows and reports the filepath', async () => {
      const { controller } = create();
      controller.probeState.probedPositions = [
        { x: 0, y: 0, z: -1.5 },
        { x: 10, y: 0, z: -1.2 },
      ];
      const filepath = path.join(os.tmpdir(), `cncjs-smoothie-save-${process.pid}-${Date.now()}.txt`);
      tempFiles.push(filepath);
      const callback = jest.fn();

      controller.command('autolevel:saveToFile', filepath, callback);
      await waitForCallback(callback);

      expect(callback).toHaveBeenCalledWith(null, { success: true, filepath });
      await expect(fsp.readFile(filepath, 'utf8')).resolves.toBe(
        '0 0 -1.5 0 0 0 0 0 0\n10 0 -1.2 0 0 0 0 0 0'
      );
    });

    test('autolevel:applyProbeCompensation returns the compensated G-code from the autolevel lib', () => {
      const { controller } = create();
      const gcode = 'G0 X0 Y0\nG1 Z-1 F100';
      const probeData = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
        { x: 10, y: 10, z: 0 },
      ];
      const callback = jest.fn();

      controller.command('autolevel:applyProbeCompensation', { gcode, probeData }, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        compensatedGcode: autolevel.applyProbeCompensation(gcode, probeData),
      });
    });
  });

  describe('negative tests', () => {
    test('unknown command writes nothing', () => {
      const { controller, writes } = create();

      controller.command('nonexistent');

      expect(writes).toEqual([]);
    });

    test('commands write nothing while the connection is closed', () => {
      const { controller, writes } = create();
      controller.connection.isOpen = false;

      controller.command('feedhold');
      controller.command('statusreport');
      controller.command('homing');
      controller.command('gcode', 'G0 X1');

      expect(writes).toEqual([]);
    });

    test('gcode:load cannot reach the invalid-input error path because the dwell concatenation masks it', () => {
      const { controller } = create();
      const callback = jest.fn();

      controller.command('gcode:load', 'empty', '', callback);

      const [err, snapshot] = callback.mock.calls[0];
      expect(err).toBeNull();
      expect(snapshot).toMatchObject({ name: 'empty', total: 1 });
    });
  });
});
