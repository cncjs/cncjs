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
import Sender, { SP_TYPE_CHAR_COUNTING } from '../../lib/Sender';
import SerialConnection from '../../lib/SerialConnection';
import SocketConnection from '../../lib/SocketConnection';
import Workflow, {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING
} from '../../lib/Workflow';
import delay from '../../lib/delay';
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
  WRITE_SOURCE_FEEDER
} from '../constants';
import {
  getDeprecatedCommandHandler,
} from '../utils';
import * as builtinCommand from '../utils/builtin-command';
import { isM0, isM1, isM6, replaceM6 } from '../utils/gcode';
import { mapPositionToUnits, mapValueToUnits } from '../utils/units';
import SmoothieRunner from './SmoothieRunner';
import {
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_HOLD,
  SMOOTHIE_REALTIME_COMMANDS
} from './constants';

const userStore = serviceContainer.resolve('userStore');
const directoryWatcher = serviceContainer.resolve('directoryWatcher');
const shellCommand = serviceContainer.resolve('shellCommand');

const log = logger('controller:Smoothie');
const noop = _.noop;

class SmoothieController {
  type = SMOOTHIE;

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

  // Smoothie
  controller = null;

  ready = false;

  state = {};

  settings = {};

  queryTimer = null;

  actionMask = {
    queryParserState: {
      state: false, // wait for a message containing the current G-code parser modal state
      reply: false // wait for an `ok` or `error` response
    },
    queryStatusReport: false,

    // Respond to user input
    replyParserState: false, // $G
    replyStatusReport: false // ?
  };

  actionTime = {
    queryParserState: 0,
    queryStatusReport: 0,
    senderFinishTime: 0
  };

  feedOverride = 100;

  spindleOverride = 100;

  // Message Slot
  messageSlot = null;

  // Event Trigger
  event = null;

  // Feeder
  feeder = null;

  // Sender
  sender = null;

  // Shared context
  sharedContext = {};

  // Workflow
  workflow = null;

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

      const machineState = _.get(this.state, 'machineState', '');
      if (machineState === SMOOTHIE_MACHINE_STATE_HOLD) {
        this.writeln('resume'); // resume
      }
    },
    [CONTROLLER_COMMAND_SENDER_PAUSE]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE);

      this.workflow.pause();

      this.writeln('suspend');
    },
    [CONTROLLER_COMMAND_SENDER_RESUME]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SENDER_RESUME);

      this.writeln('resume');

      this.workflow.resume();
    },
    [CONTROLLER_COMMAND_FEEDER_START]: () => {
      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        return;
      }
      this.writeln('resume');
      this.feeder.unhold();
      this.feeder.next();
    },
    [CONTROLLER_COMMAND_FEEDER_STOP]: () => {
      this.feeder.reset();
    },
    [CONTROLLER_COMMAND_FEED_HOLD]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_FEED_HOLD);

      this.writeln('suspend');
    },
    [CONTROLLER_COMMAND_CYCLE_START]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_CYCLE_START);

      this.writeln('resume');
    },
    [CONTROLLER_COMMAND_HOMING]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_HOMING);

      this.writeln('$H');
    },
    [CONTROLLER_COMMAND_SLEEP]: () => {
      this.event.trigger(CONTROLLER_EVENT_TRIGGER_SLEEP);

      // Not supported
    },
    [CONTROLLER_COMMAND_UNLOCK]: () => {
      this.writeln('$X');
    },
    [CONTROLLER_COMMAND_RESET]: () => {
      this.workflow.stop();

      this.feeder.reset();

      this.write('\x18'); // ^x
    },
    [CONTROLLER_COMMAND_JOG_CANCEL]: () => {
      // Not supported
    },
    // Feed Overrides
    // @param {number} value A percentage value between 10 and 200. A value of zero will reset to 100%.
    [CONTROLLER_COMMAND_FEED_OVERRIDE]: (...args) => {
      const [value] = args;
      let feedOverride = this.runner.state.status.ovF;

      if (value === 0) {
        feedOverride = 100;
      } else if ((feedOverride + value) > 200) {
        feedOverride = 200;
      } else if ((feedOverride + value) < 10) {
        feedOverride = 10;
      } else {
        feedOverride += value;
      }
      this.command(CONTROLLER_COMMAND_GCODE, 'M220S' + feedOverride);

      // enforce state change
      this.runner.state = {
        ...this.runner.state,
        status: {
          ...this.runner.state.status,
          ovF: feedOverride
        }
      };
    },
    // Spindle Speed Overrides
    // @param {number} value A percentage value between 10 and 200. A value of zero will reset to 100%.
    [CONTROLLER_COMMAND_SPINDLE_OVERRIDE]: (...args) => {
      const [value] = args;
      let spindleOverride = this.runner.state.status.ovS;

      if (value === 0) {
        spindleOverride = 100;
      } else if ((spindleOverride + value) > 200) {
        spindleOverride = 200;
      } else if ((spindleOverride + value) < 10) {
        spindleOverride = 10;
      } else {
        spindleOverride += value;
      }
      this.command(CONTROLLER_COMMAND_GCODE, 'M221S' + spindleOverride);

      // enforce state change
      this.runner.state = {
        ...this.runner.state,
        status: {
          ...this.runner.state.status,
          ovS: spindleOverride
        }
      };
    },
    // Rapid Overrides
    [CONTROLLER_COMMAND_RAPID_OVERRIDE]: () => {
      // Not supported
    },
    // @param {number} power
    // @param {number} duration
    [CONTROLLER_COMMAND_LASER_TEST]: (...args) => {
      const [power = 0, duration = 0] = args;

      if (!power) {
        // Turning laser off and returning to auto mode
        this.command(CONTROLLER_COMMAND_GCODE, 'fire off');
        this.command(CONTROLLER_COMMAND_GCODE, 'M5');
        return;
      }

      this.command(CONTROLLER_COMMAND_GCODE, 'M3');
      // Firing laser at <power>% power and entering manual mode
      this.command(CONTROLLER_COMMAND_GCODE, 'fire ' + ensurePositiveNumber(power));
      if (duration > 0) {
        // http://smoothieware.org/g4
        // Dwell S<seconds> or P<milliseconds>
        // Note that if `grbl_mode` is set to `true`, then the `P` parameter
        // is the duration to wait in seconds, not milliseconds, as a float value.
        // This is to confirm to G-code standards.
        this.command(CONTROLLER_COMMAND_GCODE, 'G4P' + ensurePositiveNumber(duration / 1000));
        // Turning laser off and returning to auto mode
        this.command(CONTROLLER_COMMAND_GCODE, 'fire off');
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

      if (!this.feeder.isPending()) {
        this.feeder.next();
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

        // internal functions
        'mapWCSToPValue': function (wcs) {
          return {
            'G54': 1,
            'G55': 2,
            'G56': 3,
            'G57': 4,
            'G58': 5,
            'G59': 6,
          }[wcs] || 0;
        },
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
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
        // Set coordinate system offset
        lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
        // Probe the tool
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
        // Pause for 1 second
        lines.push('%wait 1');
        // Set tool length offset
        lines.push('G43.1 Z[posz - touch_plate_height]');
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
    }
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

    // Connection
    if (connectionType === CONNECTION_TYPE_SERIAL) {
      this.connection = new SerialConnection({
        ...connectionOptions,
        writeFilter: (data) => data
      });
    } else if (connectionType === CONNECTION_TYPE_SOCKET) {
      this.connection = new SocketConnection({
        ...connectionOptions,
        writeFilter: (data) => data
      });
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
          log.debug(`%: line=${x(originalLine)}`);
          const expr = line.slice(1);
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

        // M0 Program Pause
        if (words.find(isM0)) {
          log.debug('M0 Program Pause');

          this.feeder.hold({
            data: 'M0',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M1 Program Pause
        if (words.find(isM1)) {
          log.debug('M1 Program Pause');

          this.feeder.hold({
            data: 'M1',
            msg: this.messageSlot.take() ?? originalLine,
          });
        }

        // M6 Tool Change
        if (words.find(isM6)) {
          log.debug('M6 Tool Change');

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

            this.command(CONTROLLER_COMMAND_TOOL_CHANGE);
          }
        }

        return line;
      }
    });
    this.feeder.on('data', (line = '', context = {}) => {
      if (this.isClose) {
        log.error(`Unable to write data to the connection: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
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

      this.connection.write(line + '\n');
      log.silly(`> ${line}`);
    });
    this.feeder.on('hold', noop);
    this.feeder.on('unhold', noop);

    // Sender
    this.sender = new Sender(SP_TYPE_CHAR_COUNTING, {
      // Deduct the buffer size to prevent from buffer overrun
      bufferSize: (128 - 8), // The default buffer size is 128 bytes
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
          log.debug(`%: line=${x(originalLine)}, sent=${sent}, received=${received}`);
          const expr = line.slice(1);
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
        log.error(`Unable to write data to the connection: type=${this.connection.type}, options=${JSON.stringify(this.connection.options)}`);
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

      this.connection.write(line + '\n');
      log.silly(`> ${line}`);
    });
    this.sender.on('hold', noop);
    this.sender.on('unhold', noop);
    this.sender.on('start', (startTime) => {
      this.actionTime.senderFinishTime = 0;
    });
    this.sender.on('end', (finishTime) => {
      this.actionTime.senderFinishTime = finishTime;
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

    // Smoothie
    this.runner = new SmoothieRunner();

    this.runner.on('raw', noop);

    this.runner.on('status', (res) => {
      this.actionMask.queryStatusReport = false;

      if (this.actionMask.replyStatusReport) {
        this.actionMask.replyStatusReport = false;
        this.emit('connection:read', this.connectionState, res.raw);
      }

      // Check if the receive buffer is available in the status report (#115)
      // @see https://github.com/cncjs/cncjs/issues/115
      // @see https://github.com/cncjs/cncjs/issues/133
      const rx = ensureFiniteNumber(_.get(res, 'buf.rx', 0));
      if (rx > 0) {
        // Do not modify the buffer size when running a G-code program
        if (this.workflow.state !== WORKFLOW_STATE_IDLE) {
          return;
        }

        // Check if the streaming protocol is character-counting streaming protocol
        if (this.sender.sp.type !== SP_TYPE_CHAR_COUNTING) {
          return;
        }

        // Check if the queue is empty
        if (this.sender.sp.dataLength !== 0) {
          return;
        }

        // Deduct the receive buffer length to prevent from buffer overrun
        const bufferSize = (rx - 8); // TODO
        if (bufferSize > this.sender.sp.bufferSize) {
          this.sender.sp.bufferSize = bufferSize;
        }
      }
    });

    this.runner.on('ok', (res) => {
      if (this.actionMask.queryParserState.reply) {
        if (this.actionMask.replyParserState) {
          this.actionMask.replyParserState = false;
          this.emit('connection:read', this.connectionState, res.raw);
        }
        this.actionMask.queryParserState.reply = false;
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

      this.emit('connection:read', this.connectionState, res.raw);

      // Feeder
      this.feeder.next();
    });

    this.runner.on('error', (res) => {
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

    // Action commands
    //
    // ```
    // //action:<command>
    // ```
    this.runner.on('action', (res) => {
      log.debug(`action command: action:${res.message}`);

      if (res.message === 'pause') {
        this.workflow.pause({ data: 'action:pause' });
        return;
      }

      if (res.message === 'resume') {
        this.workflow.resume({ data: 'action:resume' });
        return;
      }

      if (res.message === 'cancel') {
        this.workflow.stop();
        return;
      }

      log.error(`Unknown action command: action:${res.message}`);
    });

    this.runner.on('alarm', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    this.runner.on('parserstate', (res) => {
      this.actionMask.queryParserState.state = false;
      this.actionMask.queryParserState.reply = true;

      if (this.actionMask.replyParserState) {
        this.emit('connection:read', this.connectionState, res.raw);
      }
    });

    this.runner.on('parameters', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    this.runner.on('version', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    this.runner.on('others', (res) => {
      this.emit('connection:read', this.connectionState, res.raw);
    });

    const queryStatusReport = () => {
      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      const now = new Date().getTime();

      // The status report query (?) is a realtime command, it does not consume the receive buffer.
      const lastQueryTime = this.actionTime.queryStatusReport;
      if (lastQueryTime > 0) {
        const timespan = Math.abs(now - lastQueryTime);
        const toleranceTime = 5000; // 5 seconds

        // Check if it has not been updated for a long time
        if (timespan >= toleranceTime) {
          log.debug(`Continue status report query: timespan=${timespan}ms`);
          this.actionMask.queryStatusReport = false;
        }
      }

      if (this.actionMask.queryStatusReport) {
        return;
      }

      if (this.isOpen) {
        this.actionMask.queryStatusReport = true;
        this.actionTime.queryStatusReport = now;
        this.connection.write('?');
      }
    };

    // The throttle function is executed on the trailing edge of the timeout,
    // the function might be executed even if the query timer has been destroyed.
    const queryParserState = _.throttle(() => {
      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      const now = new Date().getTime();

      // Do not force query parser state ($G) when running a G-code program,
      // it will consume 3 bytes from the receive buffer in each time period.
      // @see https://github.com/cncjs/cncjs/issues/176
      // @see https://github.com/cncjs/cncjs/issues/186
      if ((this.workflow.state === WORKFLOW_STATE_IDLE) && this.runner.isIdle()) {
        const lastQueryTime = this.actionTime.queryParserState;
        if (lastQueryTime > 0) {
          const timespan = Math.abs(now - lastQueryTime);
          const toleranceTime = 10000; // 10 seconds

          // Check if it has not been updated for a long time
          if (timespan >= toleranceTime) {
            log.debug(`Continue parser state query: timespan=${timespan}ms`);
            this.actionMask.queryParserState.state = false;
            this.actionMask.queryParserState.reply = false;
          }
        }
      }

      if (this.actionMask.queryParserState.state || this.actionMask.queryParserState.reply) {
        return;
      }

      if (this.isOpen) {
        this.actionMask.queryParserState.state = true;
        this.actionMask.queryParserState.reply = false;
        this.actionTime.queryParserState = now;
        this.connection.write('$G\n');
      }
    }, 500);

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

      // Smoothie settings
      if (this.settings !== this.runner.settings) {
        this.settings = this.runner.settings;
        this.emit('controller:settings', this.type, this.settings);
        this.emit('Smoothie:settings', this.settings); // Backward compatibility
      }

      // Smoothie state
      if (this.state !== this.runner.state) {
        this.state = this.runner.state;
        this.emit('controller:state', this.type, this.state);
        this.emit('Smoothie:state', this.state); // Backward compatibility
      }

      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      // ? - Status Report
      queryStatusReport();

      // $G - Parser State
      queryParserState();

      // Check if the machine has stopped movement after completion
      if (this.actionTime.senderFinishTime > 0) {
        const machineIdle = zeroOffset && this.runner.isIdle();
        const now = new Date().getTime();
        const timespan = Math.abs(now - this.actionTime.senderFinishTime);
        const toleranceTime = 500; // in milliseconds

        if (!machineIdle) {
          // Extend the sender finish time
          this.actionTime.senderFinishTime = now;
        } else if (timespan > toleranceTime) {
          log.silly(`Finished sending G-code: timespan=${timespan}`);

          this.actionTime.senderFinishTime = 0;

          // Stop workflow
          this.command(CONTROLLER_COMMAND_SENDER_STOP);
        }
      }
    }, 250);
  }

  populateContext(context) {
    // Machine position
    const {
      x: mposx,
      y: mposy,
      z: mposz,
      a: mposa,
      b: mposb,
      c: mposc
    } = this.runner.getMachinePosition();

    // Work position
    const {
      x: posx,
      y: posy,
      z: posz,
      a: posa,
      b: posb,
      c: posc
    } = this.runner.getWorkPosition();

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

      // Machine position
      mposx: ensureFiniteNumber(mposx),
      mposy: ensureFiniteNumber(mposy),
      mposz: ensureFiniteNumber(mposz),
      mposa: ensureFiniteNumber(mposa),
      mposb: ensureFiniteNumber(mposb),
      mposc: ensureFiniteNumber(mposc),

      // Work position
      posx: ensureFiniteNumber(posx),
      posy: ensureFiniteNumber(posy),
      posz: ensureFiniteNumber(posz),
      posa: ensureFiniteNumber(posa),
      posb: ensureFiniteNumber(posb),
      posc: ensureFiniteNumber(posc),

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

  clearActionValues() {
    this.actionMask.queryParserState.state = false;
    this.actionMask.queryParserState.reply = false;
    this.actionMask.queryStatusReport = false;
    this.actionMask.replyParserState = false;
    this.actionMask.replyStatusReport = false;
    this.actionTime.queryParserState = 0;
    this.actionTime.queryStatusReport = 0;
    this.actionTime.senderFinishTime = 0;
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

  async initController() {
    // Check if it is Smoothieware
    this.command(CONTROLLER_COMMAND_GCODE, 'version');

    await delay(50);
    this.event.trigger(CONTROLLER_EVENT_TRIGGER_CONTROLLER_READY);
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

    this.connection.open(async (err) => {
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

      this.workflow.stop();

      // Clear action values
      this.clearActionValues();

      if (this.sender.state.gcode) {
        // Unload G-code
        this.command(CONTROLLER_COMMAND_SENDER_UNLOAD);
      }

      // Wait for the bootloader to complete before sending commands
      await delay(1000);

      // Set ready flag to true
      this.ready = true;

      // Initialize controller
      this.initController();
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
      socket.emit('Smoothie:settings', this.settings); // Backward compatibility
    }

    // Controller state
    if (!_.isEmpty(this.state)) {
      socket.emit('controller:state', this.type, this.state);
      socket.emit('Smoothie:state', this.state); // Backward compatibility
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

    const cmd = data.trim();
    this.actionMask.replyStatusReport = (cmd === '?') || this.actionMask.replyStatusReport;
    this.actionMask.replyParserState = (cmd === '$G') || this.actionMask.replyParserState;

    this.emit('connection:write', this.connectionState, data, {
      ...context,
      source: WRITE_SOURCE_CLIENT
    });
    this.connection.write(data);
    log.silly(`> ${data}`);
  }

  writeln(data, context) {
    const isASCIIRealtimeCommand = _.includes(SMOOTHIE_REALTIME_COMMANDS, data);
    const isExtendedASCIIRealtimeCommand = String(data).match(/[\x80-\xff]/);
    const isRealtimeCommand = isASCIIRealtimeCommand || isExtendedASCIIRealtimeCommand;

    if (isRealtimeCommand) {
      this.write(data, context);
    } else {
      this.write(data + '\n', context);
    }
  }
}

export default SmoothieController;
