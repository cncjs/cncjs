import {
  ensureArray,
  ensurePositiveNumber,
  ensureString,
} from 'ensure-type';
import * as gcodeParser from 'gcode-parser';
import _ from 'lodash';
import SerialConnection from '../../lib/SerialConnection';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import MessageSlot from '../../lib/MessageSlot';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/Sender';
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
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import taskRunner from '../../services/taskrunner';
import store from '../../store';
import {
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
          log.warn(`Disconnected from serial port "${this.options.port}":`, err);
        }

        this.close(err => {
          // Remove controller from store
          const port = this.options.port;
          store.unset(`controllers[${JSON.stringify(port)}]`);

          // Destroy controller
          this.destroy();
        });
      },
      error: (err) => {
        this.ready = false;
        if (err) {
          log.error(`Unexpected error while reading/writing serial port "${this.options.port}":`, err);
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

    constructor(engine, options) {
      if (!engine) {
        throw new Error('engine must be specified');
      }
      this.engine = engine;

      const { port, baudrate, rtscts, pin } = { ...options };
      this.options = {
        ...this.options,
        port: port,
        baudrate: baudrate,
        rtscts: rtscts,
        pin,
      };

      // Connection
      this.connection = new SerialConnection({
        path: port,
        baudRate: baudrate,
        rtscts: rtscts,
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
      });

      // Message Slot
      this.messageSlot = new MessageSlot();

      // Event Trigger
      this.event = new EventTrigger((event, trigger, commands) => {
        log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
        if (trigger === 'system') {
          taskRunner.run(commands);
        } else {
          this.command('gcode', commands);
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

            const toolChangePolicy = config.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
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
        if (this.isClose()) {
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

        this.emit('serialport:write', line + '\n', {
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

            this.event.trigger('gcode:pause');
            this.workflow.pause({
              data: 'M0',
              msg: this.messageSlot.take() ?? originalLine,
            });
          }

          // M1 Program Pause
          if (words.find(isM1)) {
            log.debug(`M1 Program Pause: line=${x(originalLine)}, sent=${sent}, received=${received}`);

            this.event.trigger('gcode:pause');
            this.workflow.pause({
              data: 'M1',
              msg: this.messageSlot.take() ?? originalLine,
            });
          }

          // M6 Tool Change
          if (words.find(isM6)) {
            log.debug(`M6 Tool Change: line=${x(originalLine)}, sent=${sent}, received=${received}`);

            const toolChangePolicy = config.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
            const isManualToolChange = [
              TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
              TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
              TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
            ].includes(toolChangePolicy);

            if (toolChangePolicy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS) {
              // Ignore M6 commands
              line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

              this.event.trigger('gcode:pause');
              this.workflow.pause({
                data: 'M6',
                msg: this.messageSlot.take() ?? originalLine,
              });
            } else if (toolChangePolicy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS) {
              // Send M6 commands
            } else if (isManualToolChange) {
              // Manual Tool Change
              line = replaceM6(line, (x) => `(${x})`); // replace with parentheses

              this.event.trigger('gcode:pause');
              this.workflow.pause({
                data: 'M6',
                msg: this.messageSlot.take() ?? originalLine,
              });

              this.command('tool:change');
            }
          }

          return line;
        }
      });
      this.sender.on('data', (line = '', context = {}) => {
        if (this.isClose()) {
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
        this.emit('serialport:read', res.raw);
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
        this.emit('serialport:read', res.raw);
      });

      this.runner.on('firmware', (res) => {
        this.emit('serialport:read', res.raw);
        if (!this.ready) {
          this.ready = true;
          // Initialize controller
          this.event.trigger('controller:ready');
        }
      });

      this.runner.on('pos', (res) => {
        log.silly(`controller.on('pos'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

        if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSource)) {
          this.emit('serialport:read', res.raw);
        }
      });

      this.runner.on('temperature', (res) => {
        log.silly(`controller.on('temperature'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

        if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSource)) {
          this.emit('serialport:read', res.raw);
        }
      });

      this.runner.on('ok', (res) => {
        log.silly(`controller.on('ok'): source=${this.history.writeSource}, line=${JSON.stringify(this.history.writeLine)}, res=${JSON.stringify(res)}`);

        if (res) {
          if (_.includes([WRITE_SOURCE_CLIENT, WRITE_SOURCE_FEEDER], this.history.writeSource)) {
            this.emit('serialport:read', res.raw);
          } else if (!this.history.writeSource) {
            this.emit('serialport:read', res.raw);
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
          const ignoreErrors = config.get('state.controller.exception.ignoreErrors');
          const pauseError = !ignoreErrors;
          const { lines, received } = this.sender.state;
          const line = ensureString(lines[received - 1]).trim();
          const ln = received + 1;

          this.emit('serialport:read', `> ${line} (ln=${ln})`);
          this.emit('serialport:read', res.raw);

          if (pauseError) {
            this.workflow.pause({
              err: true,
              msg: res.raw,
            });
          }

          this.sender.ack();
          this.sender.next();

          return;
        }

        this.emit('serialport:read', res.raw);

        // Feeder
        this.feeder.next();
      });

      this.runner.on('others', (res) => {
        this.emit('serialport:read', res.raw);
      });

      this.queryTimer = setInterval(() => {
        if (this.isClose()) {
          // Serial port is closed
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
            this.command('gcode:stop');
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
      } = this.runner.getWorkPosition();

      // Modal group
      const modal = this.runner.getModalGroup();

      // Tool
      const tool = this.runner.getTool();

      return Object.assign(context || {}, {
        // User-defined global variables
        global: this.sharedContext,

        // Bounding box
        xmin: Number(context.xmin) || 0,
        xmax: Number(context.xmax) || 0,
        ymin: Number(context.ymin) || 0,
        ymax: Number(context.ymax) || 0,
        zmin: Number(context.zmin) || 0,
        zmax: Number(context.zmax) || 0,

        // Work position
        posx: Number(posx) || 0,
        posy: Number(posy) || 0,
        posz: Number(posz) || 0,
        pose: Number(pose) || 0,

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
        tool: Number(tool) || 0,

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

    get status() {
      return {
        port: this.options.port,
        baudrate: this.options.baudrate,
        rtscts: this.options.rtscts,
        sockets: Object.keys(this.sockets),
        ready: this.ready,
        controller: {
          type: this.type,
          settings: this.settings,
          state: this.state
        },
        feeder: this.feeder.toJSON(),
        sender: this.sender.toJSON(),
        workflow: {
          state: this.workflow.state
        }
      };
    }

    open(callback = noop) {
      const { port, baudrate, pin } = this.options;

      // Assertion check
      if (this.isOpen()) {
        log.error(`Cannot open serial port "${port}"`);
        return;
      }

      this.connection.on('data', this.connectionEventListener.data);
      this.connection.on('close', this.connectionEventListener.close);
      this.connection.on('error', this.connectionEventListener.error);

      this.connection.open(async (err) => {
        if (err) {
          log.error(`Error opening serial port "${port}":`, err);
          this.emit('serialport:error', { err: err, port: port });
          callback(err); // notify error
          return;
        }

        let setOptions = null;
        try {
          // Set DTR and RTS control flags if they exist
          if (typeof pin?.dtr === 'boolean') {
            setOptions = {
              ...setOptions,
              dtr: pin?.dtr,
            };
          }
          if (typeof pin?.rts === 'boolean') {
            setOptions = {
              ...setOptions,
              rts: pin?.rts,
            };
          }

          if (setOptions) {
            await delay(100);
            await this.connection.port.set(setOptions);
            await delay(100);
          }
        } catch (err) {
          log.error('Failed to set control flags:', { err, port });
        }

        this.emit('serialport:open', {
          port: port,
          baudrate: baudrate,
          controllerType: this.type,
          inuse: true
        });

        // Emit a change event to all connected sockets
        if (this.engine.io) {
          this.engine.io.emit('serialport:change', {
            port: port,
            inuse: true
          });
        }

        callback(); // register controller

        log.debug(`Connected to serial port "${port}"`);

        // M115: Get firmware version and capabilities
        // The response to this will take us to the ready state
        this.connection.write('M115\n', {
          source: WRITE_SOURCE_SERVER
        });

        this.workflow.stop();

        if (this.sender.state.gcode) {
          // Unload G-code
          this.command('unload');
        }
      });
    }

    close(callback) {
      const { port } = this.options;

      // Assertion check
      if (!this.connection) {
        const err = `Serial port "${port}" is not available`;
        callback(new Error(err));
        return;
      }

      // Stop status query
      this.ready = false;

      this.emit('serialport:close', {
        port: port,
        inuse: false
      });

      // Emit a change event to all connected sockets
      if (this.engine.io) {
        this.engine.io.emit('serialport:change', {
          port: port,
          inuse: false
        });
      }

      if (this.isClose()) {
        callback(null);
        return;
      }

      this.connection.removeAllListeners();
      this.connection.close(callback);
    }

    isOpen() {
      return this.connection && this.connection.isOpen;
    }

    isClose() {
      return !(this.isOpen());
    }

    addConnection(socket) {
      if (!socket) {
        log.error('The socket parameter is not specified');
        return;
      }

      log.debug(`Add socket connection: id=${socket.id}`);
      this.sockets[socket.id] = socket;

      //
      // Send data to newly connected client
      //
      if (this.isOpen()) {
        socket.emit('serialport:open', {
          port: this.options.port,
          baudrate: this.options.baudrate,
          controllerType: this.type,
          inuse: true
        });
      }
      if (!_.isEmpty(this.settings)) {
        // controller settings
        socket.emit('controller:settings', MARLIN, this.settings);
        socket.emit('Marlin:settings', this.settings); // Backward compatibility
      }
      if (!_.isEmpty(this.state)) {
        // controller state
        socket.emit('controller:state', MARLIN, this.state);
        socket.emit('Marlin:state', this.state); // Backward compatibility
      }
      if (this.feeder) {
        // feeder status
        socket.emit('feeder:status', this.feeder.toJSON());
      }
      if (this.sender) {
        // sender status
        socket.emit('sender:status', this.sender.toJSON());

        const { name, gcode, context } = this.sender.state;
        if (gcode) {
          socket.emit('gcode:load', name, gcode, context);
        }
      }
      if (this.workflow) {
        // workflow state
        socket.emit('workflow:state', this.workflow.state);
      }
    }

    removeConnection(socket) {
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
        socket.emit.apply(socket, [eventName].concat(args));
      });
    }

    command(cmd, ...args) {
      const handler = {
        'gcode:load': () => {
          let [name, gcode, context = {}, callback = noop] = args;
          if (typeof context === 'function') {
            callback = context;
            context = {};
          }

          // G4 P0 or P with a very small value will empty the planner queue and then
          // respond with an ok when the dwell is complete. At that instant, there will
          // be no queued motions, as long as no more commands were sent after the G4.
          // This is the fastest way to do it without having to check the status reports.
          const dwell = '%wait ; Wait for the planner to empty';
          const ok = this.sender.load(name, gcode + '\n' + dwell, context);
          if (!ok) {
            callback(new Error(`Invalid G-code: name=${name}`));
            return;
          }

          this.emit('gcode:load', name, this.sender.state.gcode, context);
          this.event.trigger('gcode:load');

          log.debug(`Load G-code: name="${this.sender.state.name}", size=${this.sender.state.gcode.length}, total=${this.sender.state.total}`);

          this.workflow.stop();

          callback(null, this.sender.toJSON());
        },
        'gcode:unload': () => {
          this.workflow.stop();

          // Sender
          this.sender.unload();

          this.emit('gcode:unload');
          this.event.trigger('gcode:unload');
        },
        'start': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:start');
        },
        'gcode:start': () => {
          this.event.trigger('gcode:start');

          this.workflow.start();

          // Feeder
          this.feeder.reset();

          // Sender
          this.sender.next();
        },
        'stop': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:stop', ...args);
        },
        // @param {object} options The options object.
        // @param {boolean} [options.force] Whether to force stop a G-code program. Defaults to false.
        'gcode:stop': () => {
          this.event.trigger('gcode:stop');

          this.workflow.stop();
        },
        'pause': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:pause');
        },
        'gcode:pause': () => {
          this.event.trigger('gcode:pause');

          this.workflow.pause();
        },
        'resume': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:resume');
        },
        'gcode:resume': () => {
          this.event.trigger('gcode:resume');

          this.workflow.resume();
        },
        'feeder:feed': () => {
          const [commands, context = {}] = args;
          this.command('gcode', commands, context);
        },
        'feeder:start': () => {
          if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
            return;
          }
          this.feeder.unhold();
          this.feeder.next();
        },
        'feeder:stop': () => {
          this.feeder.reset();
        },
        'feedhold': () => {
          this.event.trigger('feedhold');
        },
        'cyclestart': () => {
          this.event.trigger('cyclestart');
        },
        'homing': () => {
          this.event.trigger('homing');

          this.writeln('G28.2 X Y Z');
        },
        'sleep': () => {
          this.event.trigger('sleep');

          // Unupported
        },
        'unlock': () => {
          // Unsupported
        },
        'reset': () => {
          this.workflow.stop();

          this.feeder.reset();

          // M112: Emergency Stop
          this.writeln('M112');
        },
        // Feed Overrides
        // @param {number} value A percentage value between 10 and 500. A value of zero will reset to 100%.
        'feedOverride': () => {
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
          this.command('gcode', 'M220S' + feedOverride);

          // enforce state change
          this.runner.state = {
            ...this.runner.state,
            ovF: feedOverride
          };
        },
        // Spindle Speed Overrides
        // @param {number} value A percentage value between 10 and 500. A value of zero will reset to 100%.
        'spindleOverride': () => {
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
          this.command('gcode', 'M221S' + spindleOverride);

          // enforce state change
          this.runner.state = {
            ...this.runner.state,
            ovS: spindleOverride
          };
        },
        'rapidOverride': () => {
          // Unsupported
        },
        'motor:enable': () => {
          // M17 Enable all stepper motors
          this.command('gcode', 'M17');
        },
        'motor:disable': () => {
          // M18/M84 Disable steppers immediately (until the next move)
          this.command('gcode', 'M18');
        },
        'laser:on': () => {
          const [power = 0, maxS = 255] = args;
          const commands = [
            'M3S' + ensurePositiveNumber(maxS * (power / 100))
          ];

          this.command('gcode', commands);
        },
        'lasertest:on': () => {
          const [power = 0, duration = 0, maxS = 255] = args;
          const commands = [
            'M3S' + ensurePositiveNumber(maxS * (power / 100))
          ];
          if (duration > 0) {
            // G4 [P<time in ms>] [S<time in sec>]
            // If both S and P are included, S takes precedence.
            commands.push('G4 P' + ensurePositiveNumber(duration));
            commands.push('M5');
          }
          this.command('gcode', commands);
        },
        'lasertest:off': () => {
          this.writeln('M5');
        },
        'gcode': () => {
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
        'macro:run': () => {
          let [id, context = {}, callback = noop] = args;
          if (typeof context === 'function') {
            callback = context;
            context = {};
          }

          const macros = config.get('macros');
          const macro = _.find(macros, { id: id });

          if (!macro) {
            log.error(`Cannot find the macro: id=${id}`);
            return;
          }

          this.event.trigger('macro:run');

          this.command('gcode', macro.content, context);
          callback(null);
        },
        'macro:load': () => {
          let [id, context = {}, callback = noop] = args;
          if (typeof context === 'function') {
            callback = context;
            context = {};
          }

          const macros = config.get('macros');
          const macro = _.find(macros, { id: id });

          if (!macro) {
            log.error(`Cannot find the macro: id=${id}`);
            return;
          }

          this.event.trigger('macro:load');

          this.command('gcode:load', macro.name, macro.content, context, callback);
        },
        'watchdir:load': () => {
          const [file, callback = noop] = args;
          const context = {}; // empty context

          monitor.readFile(file, (err, data) => {
            if (err) {
              callback(err);
              return;
            }

            this.command('gcode:load', file, data, context, callback);
          });
        },
        'tool:change': () => {
          const modal = this.runner.getModalGroup();
          const units = {
            'G20': IMPERIAL_UNITS,
            'G21': METRIC_UNITS,
          }[modal.units];
          const toolChangePolicy = config.get('tool.toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS);
          const toolChangeX = mapPositionToUnits(config.get('tool.toolChangeX', 0), units);
          const toolChangeY = mapPositionToUnits(config.get('tool.toolChangeY', 0), units);
          const toolChangeZ = mapPositionToUnits(config.get('tool.toolChangeZ', 0), units);
          const toolProbeX = mapPositionToUnits(config.get('tool.toolProbeX', 0), units);
          const toolProbeY = mapPositionToUnits(config.get('tool.toolProbeY', 0), units);
          const toolProbeZ = mapPositionToUnits(config.get('tool.toolProbeZ', 0), units);
          const toolProbeCustomCommands = ensureString(config.get('tool.toolProbeCustomCommands')).split('\n');
          const toolProbeCommand = config.get('tool.toolProbeCommand', 'G38.2');
          const toolProbeDistance = mapValueToUnits(config.get('tool.toolProbeDistance', 1), units);
          const toolProbeFeedrate = mapValueToUnits(config.get('tool.toolProbeFeedrate', 10), units);
          const touchPlateHeight = mapValueToUnits(config.get('tool.touchPlateHeight', 0), units);

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
      }[cmd];

      if (!handler) {
        log.error(`Unknown command: ${cmd}`);
        return;
      }

      handler();
    }

    write(data, context) {
      // Assertion check
      if (this.isClose()) {
        log.error(`Serial port "${this.options.port}" is not accessible`);
        return;
      }

      this.emit('serialport:write', data, {
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
