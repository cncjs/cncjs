import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ensureArray, ensureFiniteNumber, ensurePositiveNumber, ensureString } from 'ensure-type';
import * as gcodeParser from 'gcode-parser';
import _ from 'lodash';
import {
  CONNECTION_TYPE_SERIAL,
  CONNECTION_TYPE_SOCKET,
} from '../../constants/connection';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import MessageSlot from '../../lib/MessageSlot';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/Sender';
import SerialConnection from '../../lib/SerialConnection';
import SocketConnection from '../../lib/SocketConnection';
import Workflow, {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING
} from '../../lib/Workflow';
import evaluateAssignmentExpression from '../../lib/evaluate-assignment-expression';
import x from '../../lib/json-stringify';
import logger from '../../lib/logger';
import translateExpression from '../../lib/translate-expression';
import serviceContainer from '../../service-container';
import controllers from '../../store/controllers';
import {
  CONTROLLER_COMMAND_SENDER_LOAD,
  CONTROLLER_COMMAND_SENDER_UNLOAD,
  CONTROLLER_COMMAND_SENDER_START,
  CONTROLLER_COMMAND_SENDER_STOP,
  CONTROLLER_COMMAND_SENDER_PAUSE,
  CONTROLLER_COMMAND_SENDER_RESUME,
  CONTROLLER_COMMAND_FEEDER_START,
  CONTROLLER_COMMAND_FEEDER_STOP,
  CONTROLLER_COMMAND_GCODE,
  CONTROLLER_COMMAND_FEED_HOLD,
  CONTROLLER_COMMAND_CYCLE_START,
  CONTROLLER_COMMAND_HOMING,
  CONTROLLER_COMMAND_SLEEP,
  CONTROLLER_COMMAND_UNLOCK,
  CONTROLLER_COMMAND_RESET,
  CONTROLLER_COMMAND_JOG_CANCEL,
  CONTROLLER_COMMAND_FEED_OVERRIDE,
  CONTROLLER_COMMAND_RAPID_OVERRIDE,
  CONTROLLER_COMMAND_SPINDLE_OVERRIDE,
  CONTROLLER_COMMAND_LASER_TEST,
  CONTROLLER_COMMAND_MACRO_LOAD,
  CONTROLLER_COMMAND_MACRO_RUN,
  CONTROLLER_COMMAND_TOOL_CHANGE,
  CONTROLLER_COMMAND_WATCHDIR_LOAD,
  CONTROLLER_EVENT_TRIGGER_CONTROLLER_READY,
  CONTROLLER_EVENT_TRIGGER_SENDER_LOAD,
  CONTROLLER_EVENT_TRIGGER_SENDER_UNLOAD,
  CONTROLLER_EVENT_TRIGGER_SENDER_START,
  CONTROLLER_EVENT_TRIGGER_SENDER_STOP,
  CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE,
  CONTROLLER_EVENT_TRIGGER_SENDER_RESUME,
  CONTROLLER_EVENT_TRIGGER_FEED_HOLD,
  CONTROLLER_EVENT_TRIGGER_CYCLE_START,
  CONTROLLER_EVENT_TRIGGER_HOMING,
  CONTROLLER_EVENT_TRIGGER_SLEEP,
  CONTROLLER_EVENT_TRIGGER_MACRO_LOAD,
  CONTROLLER_EVENT_TRIGGER_MACRO_RUN,
  GLOBAL_OBJECTS as globalObjects,
  // Builtin Commands
  BUILTIN_COMMAND_MSG,
  BUILTIN_COMMAND_WAIT,
  // M6 Tool Change
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  // Units
  IMPERIAL_UNITS,
  METRIC_UNITS,
  // Write Source
  WRITE_SOURCE_CLIENT,
  WRITE_SOURCE_SERVER,
  WRITE_SOURCE_FEEDER,
  WRITE_SOURCE_SENDER
} from '../constants';
import {
  getDeprecatedCommandHandler,
} from '../utils';
import * as builtinCommand from '../utils/builtin-command';
import { isM0, isM1, isM6, isM109, isM190, replaceM6 } from '../utils/gcode';
import { mapPositionToUnits, mapValueToUnits } from '../utils/units';
import MarlinRunner from './MarlinRunner';
import interpret from './interpret';
import {
  MARLIN,
  QUERY_TYPE_POSITION,
  QUERY_TYPE_TEMPERATURE
} from './constants';

const userStore = serviceContainer.resolve('userStore');
const directoryWatcher = serviceContainer.resolve('directoryWatcher');
const shellCommand = serviceContainer.resolve('shellCommand');

const log = logger('controller:Marlin');
const noop = _.noop;

class MarlinController {
  type = MARLIN;

  // CNCEngine
  engine = null;

  // Sockets
  sockets = {};

  // Connection
  connection = null;

  connectionEventListener = {
    data: (data) => {
      log.silly(`< ${data}`);
      this.runner.parse('' + data);
    },
    close: (err) => {
      this.ready = false;
      if (err) {
        log.error(`The connection was closed unexpectedly: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
        log.error(err.message);
      }

      this.close(err => {
        // Remove controller
        const ident = this.connection.ident;
        delete controllers[ident];
        controllers[ident] = undefined;

        // Destroy controller
        this.destroy();
      });
    },
    error: (err) => {
      this.ready = false;
      if (err) {
        log.error(`An unexpected error occurred: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
        log.error(err.message);
      }
    }
  };

  // Marlin
  controller = null;

  ready = false;

  state = {};

  settings = {};

  feedOverride = 100;

  spindleOverride = 100;

  history = {
    // The write source is one of the following:
    // * WRITE_SOURCE_CLIENT
    // * WRITE_SOURCE_SERVER
    // * WRITE_SOURCE_FEEDER
    // * WRITE_SOURCE_SENDER
    writeSource: null,

    writeLine: ''
  };

  // Message Slot
  messageSlot = null;

  // Event Trigger
  event = null;

  // Feeder
  feeder = null;

  // Sender
  sender = null;

  senderFinishTime = 0;

  // Shared context
  sharedContext = {};

  // Workflow
  workflow = null;

  // Query
  queryTimer = null;

  query = {
    // state
    type: null,
    lastQueryTime: 0,

    // action
    issue: () => {
      if (!this.query.type) {
        return;
      }

      const now = new Date().getTime();

      if (this.query.type === QUERY_TYPE_POSITION) {
        this.connection.write('M114\n', {
          source: WRITE_SOURCE_SERVER
        });
        this.query.lastQueryTime = now;
      } else if (this.query.type === QUERY_TYPE_TEMPERATURE) {
        this.connection.write('M105\n', {
          source: WRITE_SOURCE_SERVER
        });
        this.query.lastQueryTime = now;
      } else {
        log.error('Unsupported query type:', this.query.type);
      }

      this.query.type = null;
    }
  };

  // Get the current position of the active nozzle and stepper values.
  queryPosition = (() => {
    let lastQueryTime = 0;

    return _.throttle(() => {
      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      const now = new Date().getTime();

      if (!this.query.type) {
        this.query.type = QUERY_TYPE_POSITION;
        lastQueryTime = now;
      } else if (lastQueryTime > 0) {
        const timespan = Math.abs(now - lastQueryTime);
        const toleranceTime = 5000; // 5 seconds

        if (timespan >= toleranceTime) {
          log.silly(`Reschedule current position query: now=${now}ms, timespan=${timespan}ms`);
          this.query.type = QUERY_TYPE_POSITION;
          lastQueryTime = now;
        }
      }
    }, 500);
  })();

  // Request a temperature report to be sent to the host at some point in the future.
  queryTemperature = (() => {
    let lastQueryTime = 0;

    return _.throttle(() => {
      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      const now = new Date().getTime();

      if (!this.query.type) {
        this.query.type = QUERY_TYPE_TEMPERATURE;
        lastQueryTime = now;
      } else if (lastQueryTime > 0) {
        const timespan = Math.abs(now - lastQueryTime);
        const toleranceTime = 10000; // 10 seconds

        if (timespan >= toleranceTime) {
          log.silly(`Reschedule temperture report query: now=${now}ms, timespan=${timespan}ms`);
          this.query.type = QUERY_TYPE_TEMPERATURE;
          lastQueryTime = now;
        }
      }
    }, 1000);
  })();

  commandHandler = {
    [CONTROLLER_COMMAND_SENDER_LOAD]: (...args) => {
      let [meta, context = {}, callback = noop] = args;
      if (typeof context === 'function') {
        callback = context;
        context = {};
      }

      // G4 P0 or P with a very small value will empty the planner queue and then
      // respond with an ok when the dwell is complete. At that instant, there will
      // be no queued motions, as long as no more commands were sent after the G4.
      // This is the fastest way to do it without having to check the status reports.
      const { name, content } = { ...meta };
      const dwell = '%wait ; Wait for the planner to empty';
      const ok = this.sender.load({
        name,
        content: `${content}\n${dwell}`,
      }, context);
      if (!ok) {
        callback(new Error(`Invalid G-code: name=${name}`));
        return;
      }

      // Emit the 'sender:load' event with the name and content from the sender's state object
      this.emit('sender:load', {
        name: this.sender.state.name,
        content: this.sender.state.content,
      }, context);

      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_LOAD);

      this.workflow.stop();

      const senderState = this.sender.toJSON();
      callback(null, senderState);

      log.debug(`sender: sp=${senderState.sp}, name=${chalk.yellow(JSON.stringify(senderState.name))}, size=${senderState.size}, total=${senderState.total}, context=${JSON.stringify(senderState.context)}`);
    },
    [CONTROLLER_COMMAND_SENDER_UNLOAD]: () => {
      this.workflow.stop();

      // Sender
      this.sender.unload();

      this.emit('sender:unload');
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_UNLOAD);
    },
    [CONTROLLER_COMMAND_SENDER_START]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_START);

      this.workflow.start();

      // Feeder
      this.feeder.reset();

      // Sender
      this.sender.next();
    },
    // @param {object} options The options object.
    // @param {boolean} [options.force] Whether to force stop a G-code program. Defaults to false.
    [CONTROLLER_COMMAND_SENDER_STOP]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_STOP);

      this.workflow.stop();
    },
    [CONTROLLER_COMMAND_SENDER_PAUSE]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);

      this.workflow.pause();
    },
    [CONTROLLER_COMMAND_SENDER_RESUME]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_RESUME);

      this.workflow.resume();
    },
    [CONTROLLER_COMMAND_FEEDER_START]: () => {
      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        return;
      }
      this.feeder.unhold();
      this.feeder.next();
    },
    [CONTROLLER_COMMAND_FEEDER_STOP]: () => {
      this.feeder.reset();
    },
    [CONTROLLER_COMMAND_FEED_HOLD]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_FEED_HOLD);
    },
    [CONTROLLER_COMMAND_CYCLE_START]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_CYCLE_START);
    },
    [CONTROLLER_COMMAND_HOMING]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_HOMING);

      this.writeln('G28.2 X Y Z');
    },
    [CONTROLLER_COMMAND_SLEEP]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SLEEP);

      // Unupported
    },
    [CONTROLLER_COMMAND_UNLOCK]: () => {
      // Unsupported
    },
    [CONTROLLER_COMMAND_RESET]: () => {
      this.workflow.stop();

      this.feeder.reset();

      // M112: Emergency Stop
      this.writeln('M112');
    },
    [CONTROLLER_COMMAND_JOG_CANCEL]: () => {
      // Not supported
    },
    // Feed Overrides
    // @param {number} value A percentage value between 10 and 500. A value of zero will reset to 100%.
    [CONTROLLER_COMMAND_FEED_OVERRIDE]: (...args) => {
      const [value] = args;
      let feedOverride = this.runner.state.ovF;

      if (value === 0) {
        feedOverride = 100;
      } else if ((feedOverride + value) > 500) {
        feedOverride = 500;
      } else if ((feedOverride + value) < 10) {
        feedOverride = 10;
      } else {
        feedOverride += value;
      }
      // M220: Set speed factor override percentage
      this.command(CONTROLLER_COMMAND_GCODE, 'M220S' + feedOverride);

      // enforce state change
      this.runner.state = {
        ...this.runner.state,
        ovF: feedOverride
      };
    },
    // Spindle Speed Overrides
    // @param {number} value A percentage value between 10 and 500. A value of zero will reset to 100%.
    [CONTROLLER_COMMAND_SPINDLE_OVERRIDE]: (...args) => {
      const [value] = args;
      let spindleOverride = this.runner.state.ovS;

      if (value === 0) {
        spindleOverride = 100;
      } else if ((spindleOverride + value) > 500) {
        spindleOverride = 500;
      } else if ((spindleOverride + value) < 10) {
        spindleOverride = 10;
      } else {
        spindleOverride += value;
      }
      // M221: Set extruder factor override percentage
      this.command(CONTROLLER_COMMAND_GCODE, 'M221S' + spindleOverride);

      // enforce state change
      this.runner.state = {
        ...this.runner.state,
        ovS: spindleOverride
      };
    },
    [CONTROLLER_COMMAND_RAPID_OVERRIDE]: () => {
      // Unsupported
    },
    'motor:enable': () => {
      // M17 Enable all stepper motors
      this.command(CONTROLLER_COMMAND_GCODE, 'M17');
    },
    'motor:disable': () => {
      // M18/M84 Disable steppers immediately (until the next move)
      this.command(CONTROLLER_COMMAND_GCODE, 'M18');
    },
    // @param {number} power
    // @param {number} duration
    // @param {number} maxS
    [CONTROLLER_COMMAND_LASER_TEST]: (...args) => {
      const [power = 0, duration = 0, maxS = 255] = args;

      if (!power) {
        this.command(CONTROLLER_COMMAND_GCODE, 'M5');
      }

      this.command(CONTROLLER_COMMAND_GCODE, 'M3S' + ensurePositiveNumber(maxS * (power / 100)));

      if (duration > 0) {
        // G4 [P<time in ms>] [S<time in sec>]
        // If both S and P are included, S takes precedence.
        this.command(CONTROLLER_COMMAND_GCODE, 'G4 P' + ensurePositiveNumber(duration));
        this.command(CONTROLLER_COMMAND_GCODE, 'M5');
      }
    },
    [CONTROLLER_COMMAND_GCODE]: (...args) => {
      const [commands, context] = args;
      const data = ensureArray(commands)
        .join('\n')
        .split(/\r?\n/)
        .filter(line => {
          if (typeof line !== 'string') {
            return false;
          }

          return line.trim().length > 0;
        });

      this.feeder.feed(data, context);

      { // The following criteria must be met to trigger the feeder
        const notBusy = !(this.history.writeSource);
        const senderIdle = (this.sender.state.sent === this.sender.state.received);
        const feederIdle = !(this.feeder.isPending());

        if (notBusy && senderIdle && feederIdle) {
          this.feeder.next();
        }
      }
    },
    [CONTROLLER_COMMAND_MACRO_RUN]: (...args) => {
      let [id, context = {}, callback = noop] = args;
      if (typeof context === 'function') {
        callback = context;
        context = {};
      }

      const macros = userStore.get('macros');
      const macro = _.find(macros, { id: id });

      if (!macro) {
        log.error(`Cannot find the macro: id=${id}`);
        return;
      }

      this.event.trigger(CONTROLLER_EVENT_TRIGGER_MACRO_RUN);

      this.command(CONTROLLER_COMMAND_GCODE, macro.content, context);
      callback(null);
    },
    [CONTROLLER_COMMAND_MACRO_LOAD]: (...args) => {
      let [id, context = {}, callback = noop] = args;
      if (typeof context === 'function') {
        callback = context;
        context = {};
      }

      const macros = userStore.get('macros');
      const macro = _.find(macros, { id: id });

      if (!macro) {
        log.error(`Cannot find the macro: id=${id}`);
        return;
      }

      this.event.trigger(CONTROLLER_EVENT_TRIGGER_MACRO_LOAD);

      const meta = {
        name: macro.name,
        content: macro.content,
      };
      this.command(CONTROLLER_COMMAND_SENDER_LOAD, meta, context, callback);
    },
    [CONTROLLER_COMMAND_TOOL_CHANGE]: () => {
      const modal = this.runner.getModalGroup();
      const units = {
        'G20': IMPERIAL_UNITS,
        'G21': METRIC_UNITS,
      }[modal.units];
      const toolChangePolicy = userStore.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
      const toolChangeX = mapPositionToUnits(userStore.get('tool.toolChangeX', 0), units);
      const toolChangeY = mapPositionToUnits(userStore.get('tool.toolChangeY', 0), units);
      const toolChangeZ = mapPositionToUnits(userStore.get('tool.toolChangeZ', 0), units);
      const toolProbeX = mapPositionToUnits(userStore.get('tool.toolProbeX', 0), units);
      const toolProbeY = mapPositionToUnits(userStore.get('tool.toolProbeY', 0), units);
      const toolProbeZ = mapPositionToUnits(userStore.get('tool.toolProbeZ', 0), units);
      const toolProbeCustomCommands = ensureString(userStore.get('tool.toolProbeCustomCommands')).split('\n');
      const toolProbeCommand = userStore.get('tool.toolProbeCommand', 'G38.2');
      const toolProbeDistance = mapValueToUnits(userStore.get('tool.toolProbeDistance', 1), units);
      const toolProbeFeedrate = mapValueToUnits(userStore.get('tool.toolProbeFeedrate', 10), units);
      const touchPlateHeight = mapValueToUnits(userStore.get('tool.touchPlateHeight', 0), units);

      const context = {
        'tool_change_x': toolChangeX,
        'tool_change_y': toolChangeY,
        'tool_change_z': toolChangeZ,
        'tool_probe_x': toolProbeX,
        'tool_probe_y': toolProbeY,
        'tool_probe_z': toolProbeZ,
        'tool_probe_command': toolProbeCommand,
        'tool_probe_distance': toolProbeDistance,
        'tool_probe_feedrate': toolProbeFeedrate,
        'touch_plate_height': touchPlateHeight,

        // Note: Marlin does not support the World Coordinate System (WCS)
      };

      const lines = [];

      // Wait until the planner queue is empty
      lines.push('%wait');

      // Remember original position and spindle state
      lines.push('%_posx=posx');
      lines.push('%_posy=posy');
      lines.push('%_posz=posz');
      lines.push('%_modal_spindle=modal.spindle');

      // Stop the spindle
      lines.push('M5');

      // Absolute positioning
      lines.push('G90');

      // Move to the tool change position
      lines.push('G53 G0 Z[tool_change_z]');
      lines.push('G53 G0 X[tool_change_x] Y[tool_change_y]');
      lines.push('%wait');

      // Prompt the user to change the tool
      lines.push('%msg Tool Change T[tool]');
      lines.push('M0');

      // Move to the tool probe position
      lines.push('G53 G0 X[tool_probe_x] Y[tool_probe_y]');
      lines.push('G53 G0 Z[tool_probe_z]');
      lines.push('%wait');

      if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
        // Probe the tool
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]');
        // Set the current work Z position (posz) to the touch plate height
        lines.push('G92 Z[touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
        // Probe the tool
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]');
        // Pause for 1 second
        lines.push('%wait 1');
        // Adjust the work Z position by subtracting the touch plate height from the current work Z position (posz)
        lines.push('G92 Z[posz - touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING) {
        lines.push(...toolProbeCustomCommands);
      }

      // Move to the tool change position
      lines.push('G53 G0 Z[tool_change_z]');
      lines.push('G53 G0 X[tool_change_x] Y[tool_change_y]');
      lines.push('%wait');

      // Prompt the user to restart the spindle
      lines.push('%msg Restart Spindle');
      lines.push('M0');

      // Restore the position and spindle state
      lines.push('G90');
      lines.push('G0 X[_posx] Y[_posy]');
      lines.push('G0 Z[_posz]');
      lines.push('[_modal_spindle]');

      // Wait 5 seconds for the spindle to speed up
      lines.push('%wait 5');

      this.command('gcode', lines, context);
    },
    [CONTROLLER_COMMAND_WATCHDIR_LOAD]: (...args) => {
      const [name, callback = noop] = args;
      const context = {}; // empty context
      const filepath = path.join(directoryWatcher.root, name);

      fs.readFile(filepath, 'utf8', (err, content) => {
        if (err) {
          callback(err);
          return;
        }

        const meta = {
          name,
          content,
        };
        this.command(CONTROLLER_COMMAND_SENDER_LOAD, meta, context, callback);
      });
    },
  };

  get connectionState() {
    return {
      type: this.connection.type,
      ident: this.connection.ident,
      options: this.connection.options,
    };
  }

  get isOpen() {
    return this.connection && this.connection.isOpen;
  }

  get isClose() {
    return !this.isOpen;
  }

  get status() {
    return {
      type: this.type,
      connection: this.connectionState,
      sockets: Object.keys(this.sockets).length,
      ready: this.ready,
      settings: this.settings,
      state: this.state,
      feeder: this.feeder.toJSON(),
      sender: this.sender.toJSON(),
      workflow: {
        state: this.workflow.state
      }
    };
  }

  constructor(engine, connectionType = CONNECTION_TYPE_SERIAL, connectionOptions) {
    if (!engine) {
      throw new TypeError(`"engine" must be specified: ${engine}`);
    }

    if (!_.includes([CONNECTION_TYPE_SERIAL, CONNECTION_TYPE_SOCKET], connectionType)) {
      throw new TypeError(`"connectionType" is invalid: ${connectionType}`);
    }

    // Engine
    this.engine = engine;

    connectionOptions = {
      ...connectionOptions,
      writeFilter: (data, context) => {
        const { source = null } = { ...context };
        const line = data.trim();

        // Update write history
        this.history.writeSource = source;
        this.history.writeLine = line;

        if (!line) {
          return data;
        }

        const nextState = {
          ...this.runner.state,
          modal: {
            ...this.runner.state.modal
          }
        };

        interpret(line, (cmd, params) => {
          // motion
          if (_.includes(['G0', 'G1', 'G2', 'G3', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G80'], cmd)) {
            nextState.modal.motion = cmd;

            if (params.F !== undefined) {
              if (cmd === 'G0') {
                nextState.rapidFeedrate = params.F;
              } else {
                nextState.feedrate = params.F;
              }
            }
          }

          // wcs
          if (_.includes(['G54', 'G55', 'G56', 'G57', 'G58', 'G59'], cmd)) {
            nextState.modal.wcs = cmd;
          }

          // plane
          if (_.includes(['G17', 'G18', 'G19'], cmd)) {
            // G17: xy-plane, G18: xz-plane, G19: yz-plane
            nextState.modal.plane = cmd;
          }

          // units
          if (_.includes(['G20', 'G21'], cmd)) {
            // G20: Inches, G21: Millimeters
            nextState.modal.units = cmd;
          }

          // distance
          if (_.includes(['G90', 'G91'], cmd)) {
            // G90: Absolute, G91: Relative
            nextState.modal.distance = cmd;
          }

          // feedrate
          if (_.includes(['G93', 'G94'], cmd)) {
            // G93: Inverse time mode, G94: Units per minute
            nextState.modal.feedrate = cmd;
          }

          // program
          if (_.includes(['M0', 'M1', 'M2', 'M30'], cmd)) {
            nextState.modal.program = cmd;
          }

          // spindle or head
          if (_.includes(['M3', 'M4', 'M5'], cmd)) {
            // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
            nextState.modal.spindle = cmd;

            if (cmd === 'M3' || cmd === 'M4') {
              if (params.S !== undefined) {
                nextState.spindle = params.S;
              }
            }
          }

          // coolant
          if (_.includes(['M7', 'M8', 'M9'], cmd)) {
            const coolant = nextState.modal.coolant;

            // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on
            if (cmd === 'M9' || coolant === 'M9') {
              nextState.modal.coolant = cmd;
            } else {
              nextState.modal.coolant = _.uniq(ensureArray(coolant).concat(cmd)).sort();
              if (nextState.modal.coolant.length === 1) {
                nextState.modal.coolant = nextState.modal.coolant[0];
              }
            }
          }
        });

        if (!_.isEqual(this.runner.state, nextState)) {
          this.runner.state = nextState; // enforce change
        }

        return data;
      }
    };

    // Connection
    if (connectionType === CONNECTION_TYPE_SERIAL) {
      this.connection = new SerialConnection(connectionOptions);
    } else if (connectionType === CONNECTION_TYPE_SOCKET) {
      this.connection = new SocketConnection(connectionOptions);
    }

    // Message Slot
    this.messageSlot = new MessageSlot();

    // Event Trigger
    this.event = new EventTrigger((event, trigger, commands) => {
      log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
      if (trigger === 'system') {
        shellCommand.spawn(commands);
      } else {
        this.command(CONTROLLER_COMMAND_GCODE, commands);
      }
    });

    // Feeder
    this.feeder = new Feeder({
      dataFilter: (line, context) => {
        const originalLine = line;
        line = line.trim();
        context = this.populateContext(context);

        if (line[0] === '%') {
          const [command, commandArgs] = ensureArray(builtinCommand.match(line));

          // %msg
          if (command === BUILTIN_COMMAND_MSG) {
            log.debug(`${command}: line=${x(originalLine)}`);
            const msg = translateExpression(commandArgs, context);
            this.messageSlot.put(msg);
            return '';
          }

          // %wait
          if (command === BUILTIN_COMMAND_WAIT) {
            log.debug(`${command}: line=${x(originalLine)}`);
            this.sender.hold({
              data: BUILTIN_COMMAND_WAIT,
              msg: this.messageSlot.take() ?? originalLine,
            });
            // On Marlin and Smoothie, the "S" parameter will wait for seconds, while the "P" parameter will wait for milliseconds.
            // "G4 S2" and "G4 P2000" are equivalent.
            const delay = parseFloat(commandArgs) || 0.5; // in seconds
            const pauseValue = delay.toFixed(3) * 1;
            return `G4 S${pauseValue}`; // dwell
          }

          // Expression
          // %_x=posx,_y=posy,_z=posz
          const parts = line.split(/;(.*)/s); // `s` is the modifier for single-line mode
          const expr = ensureString(parts[0]).trim().slice(1);
          log.debug(`%: expr=${x(expr)}, line=${x(originalLine)}`);
          evaluateAssignmentExpression(expr, context);
          return '';
        }

        // Example: `G0 X[posx - 8] Y[ymax]` is converted to `G0 X2 Y50`
        line = translateExpression(line, context);

        const { line: strippedLine, words } = gcodeParser.parseLine(line, {
          flatten: true,
          lineMode: 'stripped',
        });
        line = strippedLine;

        // M109 Set extruder temperature and wait for the target temperature to be reached
        if (words.find(isM109)) {
          log.debug(`M109 Wait for extruder temperature to reach target temperature: line=${x(originalLine)}`);

          this.feeder.hold({
            data: 'M109',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M190 Set heated bed temperature and wait for the target temperature to be reached
        if (words.find(isM190)) {
          log.debug(`M190 Wait for heated bed temperature to reach target temperature: line=${x(originalLine)}`);

          this.feeder.hold({
            data: 'M190',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M0 Program Pause
        if (words.find(isM0)) {
          log.debug(`M0 Program Pause: line=${x(originalLine)}`);

          this.feeder.hold({
            data: 'M0',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M1 Program Pause
        if (words.find(isM1)) {
          log.debug(`M1 Program Pause: line=${x(originalLine)}`);

          this.feeder.hold({
            data: 'M1',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M6 Tool Change
        if (words.find(isM6)) {
          log.debug(`M6 Tool Change: line=${x(originalLine)}`);

          const toolChangePolicy = userStore.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
          const isManualToolChange = [
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
          ].includes(toolChangePolicy);

          if (toolChangePolicy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS) {
            // Ignore M6 commands
            line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

            this.feeder.hold({
              data: 'M6',
              msg: this.messageSlot.take() ?? originalLine,
            });
          } else if (toolChangePolicy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS) {
            // Send M6 commands
          } else if (isManualToolChange) {
            // Manual Tool Change
            line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

            this.feeder.hold({
              data: 'M6',
              msg: this.messageSlot.take() ?? originalLine,
            });

            this.command('tool:change');
          }
        }

        return line;
      }
    });
    this.feeder.on('data', (line = '', context = {}) => {
      if (this.isClose) {
        log.error(`Serial port "${this.options.port}" is not accessible`);
        return;
      }

      if (this.runner.isAlarm()) {
        this.feeder.reset();
        log.warn('Stopped sending G-code commands in Alarm mode');
        return;
      }

      line = String(line).trim();
      if (line.length === 0) {
        return;
      }

      this.emit('connection:write', this.connectionState, line + '\n', {
        ...context,
        source: WRITE_SOURCE_FEEDER
      });

      this.connection.write(line + '\n', {
        source: WRITE_SOURCE_FEEDER
      });
      log.silly(`> ${line}`);
    });
    this.feeder.on('hold', noop);
    this.feeder.on('unhold', noop);

    // Sender
    this.sender = new Sender(SP_TYPE_SEND_RESPONSE, {
      dataFilter: (line, context) => {
        const originalLine = line;
        const { sent, received } = this.sender.state;
        line = line.trim();
        context = this.populateContext(context);

        if (line[0] === '%') {
          const [command, commandArgs] = ensureArray(builtinCommand.match(line));

          // %msg
          if (command === BUILTIN_COMMAND_MSG) {
            log.debug(`${command}: line=${x(originalLine)}, sent=${sent}, received=${received}`);
            const msg = translateExpression(commandArgs, context);
            this.messageSlot.put(msg);
            return '';
          }

          // %wait
          if (command === BUILTIN_COMMAND_WAIT) {
            log.debug(`${command}: line=${x(originalLine)}, sent=${sent}, received=${received}`);
            this.sender.hold({
              data: BUILTIN_COMMAND_WAIT,
              msg: this.messageSlot.take() ?? originalLine,
            });
            // On Marlin and Smoothie, the "S" parameter will wait for seconds, while the "P" parameter will wait for milliseconds.
            // "G4 S2" and "G4 P2000" are equivalent.
            const delay = parseFloat(commandArgs) || 0.5; // in seconds
            const pauseValue = delay.toFixed(3) * 1;
            return `G4 S${pauseValue}`; // dwell
          }

          // Expression
          // %_x=posx,_y=posy,_z=posz
          const parts = line.split(/;(.*)/s); // `s` is the modifier for single-line mode
          const expr = ensureString(parts[0]).trim().slice(1);
          log.debug(`%: expr=${x(expr)}, line=${x(originalLine)}, sent=${sent}, received=${received}`);
          evaluateAssignmentExpression(expr, context);
          return '';
        }

        // Example: `G0 X[posx - 8] Y[ymax]` is converted to `G0 X2 Y50`
        line = translateExpression(line, context);

        const { line: strippedLine, words } = gcodeParser.parseLine(line, {
          flatten: true,
          lineMode: 'stripped',
        });
        line = strippedLine;

        // M109 Set extruder temperature and wait for the target temperature to be reached
        if (words.find(isM109)) {
          log.debug(`M109 Wait for extruder temperature to reach target temperature: line=${x(originalLine)}, sent=${sent}, received=${received}`);

          this.sender.hold({
            data: 'M109',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M190 Set heated bed temperature and wait for the target temperature to be reached
        if (words.find(isM190)) {
          log.debug(`M190 Wait for heated bed temperature to reach target temperature: line=${x(originalLine)}, sent=${sent}, received=${received}`);

          this.sender.hold({
            data: 'M190',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M0 Program Pause
        if (words.find(isM0)) {
          log.debug(`M0 Program Pause: line=${x(originalLine)}, sent=${sent}, received=${received}`);

          this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);
          this.workflow.pause({
            data: 'M0',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M1 Program Pause
        if (words.find(isM1)) {
          log.debug(`M1 Program Pause: line=${x(originalLine)}, sent=${sent}, received=${received}`);

          this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);
          this.workflow.pause({
            data: 'M1',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M6 Tool Change
        if (words.find(isM6)) {
          log.debug(`M6 Tool Change: line=${x(originalLine)}, sent=${sent}, received=${received}`);

          const toolChangePolicy = userStore.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
          const isManualToolChange = [
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
            TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
          ].includes(toolChangePolicy);

          if (toolChangePolicy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS) {
            // Ignore M6 commands
            line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

            this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);
            this.workflow.pause({
              data: 'M6',
              msg: this.messageSlot.take() ?? originalLine,
            });
          } else if (toolChangePolicy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS) {
            // Send M6 commands
          } else if (isManualToolChange) {
            // Manual Tool Change
            line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

            this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);
            this.workflow.pause({
              data: 'M6',
              msg: this.messageSlot.take() ?? originalLine,
            });

            this.command(CONTROLLER_COMMAND_TOOL_CHANGE);
          }
        }

        return line;
      }
    });
    this.sender.on('data', (line = '', context = {}) => {
      if (this.isClose) {
        log.error(`Serial port "${this.options.port}" is not accessible`);
        return;
      }

      if (this.workflow.state === WORKFLOW_STATE_IDLE) {
        log.error(`Unexpected workflow state: ${this.workflow.state}`);
        return;
      }

      line = String(line).trim();
      if (line.length === 0) {
        log.warn(`Expected non-empty line: N=${this.sender.state.sent}`);
        return;
      }

      this.connection.write(line + '\n', {
        source: WRITE_SOURCE_SENDER
      });
      log.silly(`> ${line}`);
    });
    this.sender.on('hold', noop);
    this.sender.on('unhold', noop);
    this.sender.on('start', (startTime) => {
      this.senderFinishTime = 0;
    });
    this.sender.on('end', (finishTime) => {
      this.senderFinishTime = finishTime;
    });

    // Workflow
    this.workflow = new Workflow();
    this.workflow.on('start', (...args) => {
      this.emit('workflow:state', this.workflow.state);
      this.sender.rewind();
    });
    this.workflow.on('stop', (...args) => {
      this.emit('workflow:state', this.workflow.state);
      this.sender.rewind();
    });
    this.workflow.on('pause', (...args) => {
      this.emit('workflow:state', this.workflow.state);

      if (args.length > 0) {
        const reason = { ...args[0] };
        this.sender.hold(reason); // Hold reason
      } else {
        this.sender.hold();
      }
    });
    this.workflow.on('resume', (...args) => {
      this.emit('workflow:state', this.workflow.state);

      // Reset feeder prior to resume program execution
      this.feeder.reset();

      // Resume program execution
      this.sender.unhold();
      this.sender.next();
    });

    // Marlin
    this.runner = new MarlinRunner();

    this.runner.on('raw', noop);

    this.runner.on('start', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
      // Marlin sends 'start' as the first message after
      // power-on, but not when the serial port is closed and
      // then re-opened.  Marlin has no software-initiated
      // restart, so 'start' is not dependable as a readiness
      // indicator.  Instead, we send M115 on connection open
      // to request a firmware report, whose response signals
      // Marlin readiness.  On initial power-up, Marlin might
      // miss that first M115 as it boots, so we send this
      // possibly-redundant M115 when we see 'start'.
      this.connection.write('M115\n', {
        source: WRITE_SOURCE_SERVER
      });
    });

    this.runner.on('echo', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    this.runner.on('firmware', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
      if (!this.ready) {
        this.ready = true;
        // Initialize controller
        this.event.trigger(CONTROLLER_EVENT_TRIGGER_CONTROLLER_READY);
      }
    });

    this.runner.on('pos', (res) => {
      log.silly(`controller.on('pos'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

      if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSsource)) {
        this.emit('connection:read', this.connectionState, res.raw);
      }
    });

    this.runner.on('temperature', (res) => {
      log.silly(`controller.on('temperature'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

      if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSource)) {
        this.emit('connection:read', this.connectionState, res.raw);
      }
    });

    this.runner.on('ok', (res) => {
      log.silly(`controller.on('ok'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

      if (res) {
        if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSource)) {
          this.emit('connection:read', this.connectionState, res.raw);
        } else if (!this.history.writeSource) {
          this.emit('connection:read', this.connectionState, res.raw);
          log.error('"history.writeSource" should not be empty');
        }
      }

      this.history.writeSource = null;
      this.history.writeLine = '';

      // Perform preemptive query to prevent starvation
      const now = new Date().getTime();
      const timespan = Math.abs(now - this.query.lastQueryTime);
      if (this.query.type && timespan > 2000) {
        this.query.issue();
        return;
      }

      const { hold, sent, received } = this.sender.state;

      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        if (hold && (received + 1 >= sent)) {
          log.debug(`Continue sending G-code: hold=${hold}, sent=${sent}, received=${received + 1}`);
          this.sender.unhold();
        }
        this.sender.ack();
        this.sender.next();
        return;
      }

      if ((this.workflow.state === WORKFLOW_STATE_PAUSED) && (received < sent)) {
        if (!hold) {
          log.error('The sender does not hold off during the paused state');
        }
        if (received + 1 >= sent) {
          log.debug(`Stop sending G-code: hold=${hold}, sent=${sent}, received=${received + 1}`);
        }
        this.sender.ack();
        this.sender.next();
        return;
      }

      // Feeder
      if (this.feeder.next()) {
        return;
      }

      this.query.issue();
    });

    this.runner.on('error', (res) => {
      // Sender
      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        const ignoreErrors = userStore.get('state.controller.exception.ignoreErrors');
        const pauseError = !ignoreErrors;
        const { lines, received } = this.sender.state;
        const line = ensureString(lines[received - 1]).trim();
        const ln = received + 1;

        this.emit('connection:read', this.connectionState, `> ${line} (ln=${ln})`);
        this.emit('connection:read', this.connectionState, res.raw);

        if (pauseError) {
          this.workflow.pause({ err: true, msg: res.raw });
        }

        this.sender.ack();
        this.sender.next();

        return;
      }

      this.emit('connection:read', this.connectionState, res.raw);

      // Feeder
      this.feeder.next();
    });

    this.runner.on('others', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    this.queryTimer = setInterval(() => {
      if (this.isClose) {
        return;
      }

      // Feeder
      if (this.feeder.peek()) {
        this.emit('feeder:status', this.feeder.toJSON());
      }

      // Sender
      if (this.sender.peek()) {
        this.emit('sender:status', this.sender.toJSON());
      }

      const zeroOffset = _.isEqual(
        this.runner.getWorkPosition(this.state),
        this.runner.getWorkPosition(this.runner.state)
      );

      // Marlin settings
      if (this.settings !== this.runner.settings) {
        this.settings = this.runner.settings;
        this.emit('controller:settings', MARLIN, this.settings);
        this.emit('Marlin:settings', this.settings); // Backward compatibility
      }

      // Marlin state
      if (this.state !== this.runner.state) {
        this.state = this.runner.state;
        this.emit('controller:state', MARLIN, this.state);
        this.emit('Marlin:state', this.state); // Backward compatibility
      }

      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      // M114: Get Current Position
      this.queryPosition();

      // M105: Report Temperatures
      this.queryTemperature();

      { // The following criteria must be met to issue a query
        const notBusy = !(this.history.writeSource);
        const senderIdle = (this.sender.state.sent === this.sender.state.received);
        const feederEmpty = (this.feeder.size() === 0);

        if (notBusy && senderIdle && feederEmpty) {
          this.query.issue();
        }
      }

      // Check if the machine has stopped movement after completion
      if (this.senderFinishTime > 0) {
        const machineIdle = zeroOffset;
        const now = new Date().getTime();
        const timespan = Math.abs(now - this.senderFinishTime);
        const toleranceTime = 500; // in milliseconds

        if (!machineIdle) {
          // Extend the sender finish time
          this.senderFinishTime = now;
        } else if (timespan > toleranceTime) {
          log.silly(`Finished sending G-code: timespan=${timespan}`);

          this.senderFinishTime = 0;

          // Stop workflow
          this.command(CONTROLLER_COMMAND_SENDER_STOP);
        }
      }
    }, 250);
  }

  populateContext(context) {
    // Work position
    const {
      x: posx,
      y: posy,
      z: posz,
      e: pose
    } = this.runner.getWorkfPosition();

    // Modal group
    const modal = this.runner.getModalGroup();

    // Tool
    const tool = this.runner.getTool();

    return Object.assign(context || {}, {
      // User-defined global variables
      global: this.sharedContext,

      // Bounding box
      xmin: ensureFiniteNumber(context.xmin),
      xmax: ensureFiniteNumber(context.xmax),
      ymin: ensureFiniteNumber(context.ymin),
      ymax: ensureFiniteNumber(context.ymax),
      zmin: ensureFiniteNumber(context.zmin),
      zmax: ensureFiniteNumber(context.zmax),

      // Work position
      posx: ensureFiniteNumber(posx),
      posy: ensureFiniteNumber(posy),
      posz: ensureFiniteNumber(posz),
      pose: ensureFiniteNumber(pose),

      // Modal group
      modal: {
        motion: modal.motion,
        wcs: modal.wcs,
        plane: modal.plane,
        units: modal.units,
        distance: modal.distance,
        feedrate: modal.feedrate,
        program: modal.program,
        spindle: modal.spindle,
        // M7 and M8 may be active at the same time, but a modal group violation might occur when issuing M7 and M8 together on the same line. Using the new line character (\n) to separate lines can avoid this issue.
        coolant: ensureArray(modal.coolant).join('\n'),
      },

      // Tool
      tool: ensureFiniteNumber(tool),

      // Global objects
      ...globalObjects,
    });
  }

  destroy() {
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = null;
    }

    if (this.runner) {
      this.runner.removeAllListeners();
      this.runner = null;
    }

    this.sockets = {};

    if (this.connection) {
      this.connection = null;
    }

    if (this.messageSlot) {
      this.messageSlot = null;
    }

    if (this.event) {
      this.event = null;
    }

    if (this.feeder) {
      this.feeder = null;
    }

    if (this.sender) {
      this.sender = null;
    }

    if (this.workflow) {
      this.workflow = null;
    }
  }

  open(callback = noop) {
    // Assertion check
    if (this.isOpen) {
      log.error(`Cannot open connection: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
      return;
    }

    this.connection.on('data', this.connectionEventListener.data);
    this.connection.on('close', this.connectionEventListener.close);
    this.connection.on('error', this.connectionEventListener.error);

    this.connection.open(err => {
      if (err) {
        log.error(`Cannot open connection: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
        log.error(err.message);
        this.emit('connection:error', this.connectionState, err.message);
        callback && callback(err);
        return;
      }

      this.emit('connection:open', this.connectionState);

      // Emit a change event to all connected sockets
      if (this.engine.io) {
        const connected = true;
        this.engine.io.emit('connection:change', this.connectionState, connected);
      }

      callback && callback(null);

      log.debug(`Connection established: type=${JSON.stringify(this.connection.type)}, options=${JSON.stringify(this.connection.options)}`);

      // M115: Get firmware version and capabilities
      // The response to this will take us to the ready state
      this.connection.write('M115\n', {
        source: WRITE_SOURCE_SERVER
      });

      this.workflow.stop();

      if (this.sender.state.gcode) {
        // Unload G-code
        this.command(CONTROLLER_COMMAND_SENDER_UNLOAD);
      }
    });
  }

  close(callback) {
    // Stop status query
    this.ready = false;

    this.emit('connection:close', this.connectionState);

    // Emit a change event to all connected sockets
    if (this.engine.io) {
      const connected = false;
      this.engine.io.emit('connection:change', this.connectionState, connected);
    }

    this.connection.removeAllListeners();
    this.connection.close(callback);
  }

  addSocket(socket) {
    if (!socket) {
      log.error('The socket parameter is not specified');
      return;
    }

    log.debug(`Add socket connection: id=${socket.id}`);
    this.sockets[socket.id] = socket;

    // Controller type
    socket.emit('controller:type', this.type);

    // Connection
    if (this.isOpen) {
      socket.emit('connection:open', this.connectionState);
    }

    // Controller settings
    if (!_.isEmpty(this.settings)) {
      socket.emit('controller:settings', this.type, this.settings);
      socket.emit('Marlin:settings', this.settings); // Backward compatibility
    }

    // Controller state
    if (!_.isEmpty(this.state)) {
      socket.emit('controller:state', this.type, this.state);
      socket.emit('Marlin:state', this.state); // Backward compatibility
    }

    // Feeder status
    if (this.feeder) {
      socket.emit('feeder:status', this.feeder.toJSON());
    }

    // Sender status
    if (this.sender) {
      socket.emit('sender:status', this.sender.toJSON());

      const {
        name,
        content,
        context
      } = this.sender.state;

      if (content) {
        const meta = {
          name,
          content,
        };
        socket.emit('sender:load', meta, context);
      }
    }

    // Workflow state
    if (this.workflow) {
      socket.emit('workflow:state', this.workflow.state);
    }
  }

  removeSocket(socket) {
    if (!socket) {
      log.error('The socket parameter is not specified');
      return;
    }

    log.debug(`Remove socket connection: id=${socket.id}`);
    this.sockets[socket.id] = undefined;
    delete this.sockets[socket.id];
  }

  emit(eventName, ...args) {
    Object.keys(this.sockets).forEach(id => {
      const socket = this.sockets[id];
      socket.emit(eventName, ...args);
    });
  }

  command(cmd, ...args) {
    const deprecatedCommandHandler = getDeprecatedCommandHandler(cmd);
    if (typeof deprecatedCommandHandler === 'function') {
      log.warn(`Warning: The ${x(cmd)} command is deprecated and will be removed in a future release.`);
      deprecatedCommandHandler(this.command, ...args);
      return;
    }

    const handler = this.commandHandler[cmd];
    if (handler) {
      handler();
      return;
    }

    log.error(`Unknown command: ${cmd}`);
  }

  write(data, context) {
    // Assertion check
    if (this.isClose) {
      log.error(`Unable to write data to the connection: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
      return;
    }

    this.emit('connection:write', this.connectionState, data, {
      ...context,
      source: WRITE_SOURCE_CLIENT
    });
    this.connection.write(data, {
      source: WRITE_SOURCE_CLIENT
    });
    log.silly(`> ${data}`);
  }

  writeln(data, context) {
    this.write(data + '\n', context);
  }
}

export default MarlinController;
