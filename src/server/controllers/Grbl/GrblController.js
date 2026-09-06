import {
  ensureArray,
  ensurePositiveNumber,
  ensureFiniteNumber,
  ensureString,
} from 'ensure-type';
import fsp from 'fs/promises';
import * as gcodeParser from 'gcode-parser';
import _ from 'lodash';
import * as autolevel from '../../lib/autolevel';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import MessageSlot from '../../lib/MessageSlot';
import Sender, { SP_TYPE_CHAR_COUNTING } from '../../lib/Sender';
import SerialConnection from '../../lib/SerialConnection';
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
  WRITE_SOURCE_FEEDER
} from '../constants';
import * as builtinCommand from '../utils/builtin-command';
import { isM0, isM1, isM6, replaceM6 } from '../utils/gcode';
import { in2mm, mapPositionToUnits, mapValueToUnits } from '../utils/units';
import GrblRunner from './GrblRunner';
import {
  GRBL,
  GRBL_ACTIVE_STATE_RUN,
  GRBL_ACTIVE_STATE_HOLD,
  GRBL_REALTIME_COMMANDS,
  GRBL_ALARMS,
  GRBL_ERRORS,
  GRBL_SETTINGS,
} from './constants';

const log = logger('controller:Grbl');
const noop = _.noop;

// The shape of a probing run's state, in one place: the field below, the
// 'autolevel:stop' handler and abortAutolevel() all start from this.
const createProbeState = () => ({
    // The probed positions in the form of [{x, y, z}, ...]
    probedPositions: [],

    // Number of grid nodes already resolved, whether they were measured or
    // skipped. Completion is judged against this rather than
    // probedPositions.length so that a skipped node still advances the run.
    attempted: 0,

    // Grid nodes where nothing was found, [{x, y}, ...] in mm, like
    // probedPositions. Only ever populated when skipUnprobed is enabled.
    skippedPoints: [],

    // How many nodes were recovered by a nearby retry: the node has a valid Z,
    // but it was measured a quarter step away.
    retriedCount: 0,

    // When true the run probes with G38.3 (which does not alarm on failure) and
    // a node with no contact is retried at nearby spots before being recorded
    // in skippedPoints, instead of aborting the whole run.
    skipUnprobed: false,

    // Sequential-probing cursor: which candidate of the current node is in
    // flight (0 = the node itself), and whether the first probe of the run has
    // been sent (that one descends at half feed).
    retryIndex: 0,
    firstProbeSent: false,

    // Whether a probe cycle is actually on the wire right now. `[PRB:...]` is
    // not exclusive to a probe result -- `$#` dumps the stored probe parameter
    // in the very same format -- so this flag is what tells a real result from
    // a replay of an old one. Armed when a probe is sent, disarmed by the
    // result that consumes it.
    probeInFlight: false,

    // Why the run ended before its last point, and how many nodes it had
    // resolved by then. Kept next to the partial map so a client that
    // reconnects after the abort is told the map is incomplete, instead of
    // reading a cursor parked at the end of the grid as a clean finish.
    abortReason: null,
    abortedAt: 0,

    // The minimum and maximum Z values among the probed positions
    minZ: null,
    maxZ: null,

    // The probe points in the form of [{x, y}, ...]
    probePoints: [],

    // The probe configuration
    config: null,
});

class GrblController {
    type = GRBL;

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

    // Grbl
    controller = null;

    ready = false;

    initialized = false;

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

    // Message Slot
    messageSlot = null;

    // Event Trigger
    event = null;

    // Auto Level - Probe state tracking
    probeState = createProbeState();

    // Auto Level - the last `[PRB:...]` the controller saw, as a signature.
    // `$#` replays the stored probe parameter verbatim through the same
    // handler, so a line identical to the one already consumed is a replay and
    // never a new measurement: two probes in a run are never at the same XY.
    lastPrbSignature = null;

    // Auto Level - a single "Test Probe" is on the wire. It answers with a
    // `[PRB:...]` of its own, at whatever XY the machine happened to be on, so
    // it has to be consumed rather than left for a grid run to pick up.
    testProbeInFlight = false;

    // Feeder
    feeder = null;

    // Sender
    sender = null;

    // Shared context
    sharedContext = {};

    // Workflow
    workflow = null;

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
        writeFilter: (data) => {
          const line = data.trim();

          if (!line) {
            return data;
          }

          { // Grbl settings: $0-$255
            const r = line.match(/^(\$\d{1,3})=([\d\.]+)$/);
            if (r) {
              const name = r[1];
              const value = Number(r[2]);
              if ((name === '$13') && (value >= 0) && (value <= 65535)) {
                const nextSettings = {
                  ...this.runner.settings,
                  settings: {
                    ...this.runner.settings.settings,
                    [name]: value ? '1' : '0'
                  }
                };
                this.runner.settings = nextSettings; // enforce change
              }
            }
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
              const delay = parseFloat(commandArgs) || 0.5; // in seconds
              const pauseValue = delay.toFixed(3) * 1;
              return `G4 P${pauseValue}`; // dwell
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
              const delay = parseFloat(commandArgs) || 0.5; // in seconds
              const pauseValue = delay.toFixed(3) * 1;
              return `G4 P${pauseValue}`; // dwell
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

      // Grbl
      this.runner = new GrblRunner();

      this.runner.on('raw', noop);

      this.runner.on('status', (res) => {
        /**
         * Handle the scenario where a startup message is not received during UART communication.
         * A status query (?) will be issued in the `queryActivity` function.
         */
        if (!this.ready) {
          this.ready = true;

          // Reset the state
          this.clearActionValues();
        }
        if (!this.initialized) {
          this.initialized = true;

          // Initialize controller
          this.initController();
        }

        this.actionMask.queryStatusReport = false;

        if (this.actionMask.replyStatusReport) {
          this.actionMask.replyStatusReport = false;
          this.emit('serialport:read', res.raw);
        }

        // Check if the receive buffer is available in the status report
        // @see https://github.com/cncjs/cncjs/issues/115
        // @see https://github.com/cncjs/cncjs/issues/133
        const rx = Number(_.get(res, 'buf.rx', 0)) || 0;
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
            this.emit('serialport:read', res.raw);
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

        this.emit('serialport:read', res.raw);

        // Feeder
        this.feeder.next();
      });

      this.runner.on('error', (res) => {
        const code = Number(res.message) || undefined;
        const error = _.find(GRBL_ERRORS, { code: code });

        // A line Grbl refuses answers with `error:N` and nothing else: no PRB,
        // no alarm. A probe line is refusable like any other -- `G38.2 Z0` with
        // the tool already at Z0 comes back as error:33 (invalid target) -- and
        // sequential probing would then sit forever waiting on a result that
        // was rejected before it ever ran. This is also the path a bad probe
        // configuration takes, so it has to end the run.
        //
        // But `error:N` is not addressed to anyone: the controller cannot see
        // which line it answers, and a probing run keeps Grbl out of Idle for
        // minutes at a time, which is exactly when the rest of the UI collects
        // rejections -- jogging stays enabled in Run state and the Grbl
        // widget's Refresh sends `$#` and `$$`, all answered with error:8.
        // autolevel.isProbeAbortingError() draws the line: the codes only a `$`
        // command or a `$J=` jog can raise are none of the run's business.
        //
        // abortAutolevel() is a no-op while no probing run is in flight, which
        // is what keeps an ordinary job's G-code error from touching it.
        if (autolevel.isProbeAbortingError(code)) {
          // A rejected line answers with no probe result, a test probe's line
          // included. Left armed, its flag would swallow the first result of
          // the next grid run and hang it at 0/N.
          this.testProbeInFlight = false;
          this.abortAutolevel(error ? `error:${code} (${error.message})` : 'the controller rejected a probe command');
        } else if (this.isAutolevelRunning()) {
          log.debug(`[autolevel] Ignoring error:${code} during a probing run: no G-code line can raise it`);
        }

        if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
          const ignoreErrors = config.get('state.controller.exception.ignoreErrors');
          const pauseError = !ignoreErrors;
          const { lines, received } = this.sender.state;
          const line = ensureString(lines[received - 1]).trim();
          const ln = received + 1;

          this.emit('serialport:read', `> ${line} (ln=${ln})`);
          if (error) {
            // Grbl v1.1
            this.emit('serialport:read', `error:${code} (${error.message})`);

            if (pauseError) {
              this.workflow.pause({
                err: true,
                msg: `error:${code} (${error.message})`,
              });
            }
          } else {
            // Grbl v0.9
            this.emit('serialport:read', res.raw);

            if (pauseError) {
              this.workflow.pause({
                err: true,
                msg: res.raw,
              });
            }
          }

          this.sender.ack();
          this.sender.next();

          return;
        }

        if (error) {
          // Grbl v1.1
          this.emit('serialport:read', `error:${code} (${error.message})`);
        } else {
          // Grbl v0.9
          this.emit('serialport:read', res.raw);
        }

        // Feeder
        this.feeder.next();
      });

      this.runner.on('alarm', (res) => {
        const code = Number(res.message) || undefined;
        const alarm = _.find(GRBL_ALARMS, { code: code });

        if (alarm) {
          // Grbl v1.1
          this.emit('serialport:read', `ALARM:${code} (${alarm.message})`);
        } else {
          // Grbl v0.9
          this.emit('serialport:read', res.raw);
        }

        // An alarm halts Grbl, so the probe in flight will never answer. This
        // also covers what a probing run cannot see coming: a hard limit hit on
        // the way to the next node, or an external reset.
        this.testProbeInFlight = false;
        this.abortAutolevel(alarm ? `ALARM:${code} (${alarm.message})` : 'alarm raised');
      });

      this.runner.on('parserstate', (res) => {
        this.actionMask.queryParserState.state = false;
        this.actionMask.queryParserState.reply = true;

        if (this.actionMask.replyParserState) {
          this.emit('serialport:read', res.raw);
        }
      });

      this.runner.on('parameters', (res) => {
        this.emit('serialport:read', res.raw);

        const { name, value } = res;

        if (name === 'PRB') {
          log.debug('[autolevel] PRB parameter received:', value);
          // Machine position
          const {
            x: mposx,
            y: mposy,
            z: mposz,
            a: mposa,
            b: mposb,
            c: mposc,
          } = this.runner.getMachinePosition();

          // Work position
          const {
            x: posx,
            y: posy,
            z: posz,
            a: posa,
            b: posb,
            c: posc,
          } = this.runner.getWorkPosition();

          const wco = {
            x: (Number(mposx) - Number(posx)).toFixed(3),
            y: (Number(mposy) - Number(posy)).toFixed(3),
            z: (Number(mposz) - Number(posz)).toFixed(3),
            a: (Number(mposa) - Number(posa)).toFixed(3),
            b: (Number(mposb) - Number(posb)).toFixed(3),
            c: (Number(mposc) - Number(posc)).toFixed(3),
          };

          // [PRB:0.000,0.000,0.000:0]
          // The `PRB:` probe parameter message includes an additional `:` and suffix value is a boolean.
          // It denotes whether the last probe cycle was successful or not.
          //
          // Probing is sequential, so this result decides what is sent next.
          // `attempted` counts resolved grid nodes: a retry beside a node that
          // found nothing does not advance it, which is what keeps the grid the
          // compensation sees the original rectangular one.
          //
          // The line alone does not prove a probe just ran: `$#` dumps the
          // stored probe parameter as the same `[PRB:...]`, through this very
          // handler, and the UI sends `$#` on its own (the Grbl widget's
          // Refresh button). Taken as a result, that ghost would write a Z onto
          // whatever node the cursor happens to be on, advance the cursor and
          // dispatch an extra probe, shifting every remaining node of the grid.
          //
          // probeInFlight alone does not catch it. The next probe is armed from
          // inside this very handler, so during a run the window is open almost
          // continuously and a dump landing between two nodes falls inside it.
          // What does settle it is that a dump is a replay: byte for byte the
          // parameter the last probe stored. Two probes of one run are never at
          // the same XY -- consecutive nodes are a step apart, a retry is a
          // quarter step off its node -- so an identical line is never a new
          // measurement. No geometric tolerance is involved, and a real result
          // can never be mistaken for a replay and hang the run.
          const prbSignature = `${value.x},${value.y},${value.z}:${value.result}`;
          const isReplay = (prbSignature === this.lastPrbSignature);
          this.lastPrbSignature = prbSignature;

          if (isReplay) {
            log.debug(`[autolevel] Ignoring a replayed probe parameter: [PRB:${prbSignature}]`);
            return;
          }

          // A "Test Probe" is a one-off outside any grid: its result belongs to
          // nobody. Consume it here, or a run started while it is still
          // descending would record the test's Z -- taken at whatever XY the
          // machine sat on -- as the measurement of grid node 0 and shift the
          // whole map by one node.
          if (this.testProbeInFlight) {
            this.testProbeInFlight = false;
            log.debug('[autolevel] Test probe result received');
            return;
          }

          const attempted = this.probeState.attempted;
          const totalPoints = this.probeState.probePoints.length;
          const probingActive = this.probeState.probeInFlight && (attempted < totalPoints);

          // Consume the in-flight probe: this line is its answer, and the next
          // one to arrive is a ghost until another probe is sent.
          if (probingActive) {
            this.probeState.probeInFlight = false;
          }

          // Grid nodes carry the units the probe G-code was emitted in, which is
          // the modal state -- $13 governs the PRB report only. Everything the
          // controller records or reports for a node is in mm.
          const nodeToMillimeters = ({ x, y }) => (this.runner.getModalGroup().units === 'G20'
            ? { x: in2mm(x), y: in2mm(y) }
            : { x, y });

          if (value.result === 1) {
            // $13=1 means Grbl reports positions in inches (including PRB)
            // PRB units follow $13 (firmware setting), NOT G20/G21 modal state
            const reportInches = this.runner.settings?.settings?.['$13'] === '1';

            // Convert probe result to work coordinates, then to mm
            // Probe data is always stored in mm for consistent compensation math
            const measuredPos = {
              x: ensureFiniteNumber(value.x) - Number(wco.x),
              y: ensureFiniteNumber(value.y) - Number(wco.y),
              z: ensureFiniteNumber(value.z) - Number(wco.z),
            };
            if (reportInches) {
              measuredPos.x = in2mm(measuredPos.x);
              measuredPos.y = in2mm(measuredPos.y);
              measuredPos.z = in2mm(measuredPos.z);
            }

            if (probingActive) {
              // Record the measurement at the intended grid node's XY and keep only the
              // measured Z. The reported XY is quantised by the motor steps (a commanded
              // Y60 reads back as 59.999), and mixing quantised readings with exact node
              // values splits one grid line into two 0.001 mm apart: the detected grid
              // spacing collapses and the lattice fills with holes, so compensation
              // subdivides every move into thousands of segments over a broken surface.
              // A retry measured a quarter step away is stored at the node for the same
              // reason -- and so that skipping never shifts the rest of the grid.
              const gridNode = this.probeState.probePoints[attempted];
              const wasRetry = this.probeState.retryIndex > 0;
              const probedPos = { ...nodeToMillimeters(gridNode), z: measuredPos.z };
              const step = autolevel.nextProbeStep({
                contact: true,
                attempted,
                retryIndex: this.probeState.retryIndex,
                totalPoints,
              });

              const newProbedPositions = [...this.probeState.probedPositions, probedPos];

              if (this.probeState.probedPositions.length === 0) {
                this.probeState.minZ = probedPos.z;
                this.probeState.maxZ = probedPos.z;
              } else {
                this.probeState.minZ = Math.min(this.probeState.minZ, probedPos.z);
                this.probeState.maxZ = Math.max(this.probeState.maxZ, probedPos.z);
              }

              this.probeState.probedPositions = newProbedPositions;
              this.probeState.attempted = step.attempted;
              this.probeState.retryIndex = step.retryIndex;
              if (wasRetry) {
                this.probeState.retriedCount += 1;
              }

              log.debug(`[autolevel] Probed ${step.attempted}/${totalPoints}` +
                (wasRetry ? ' (nearby retry, stored at the grid node)' : '') +
                `: posX=${probedPos.x.toFixed(3)}, posY=${probedPos.y.toFixed(3)}, posZ=${probedPos.z.toFixed(3)}`);

              this.emit('autolevel:update', {
                current: step.attempted,
                total: totalPoints,
                probedPos: { ...probedPos },
                // Where the probe really touched. Differs from probedPos only on
                // a nearby retry; the visualizer marks it at its true spot.
                measuredPos: { ...measuredPos },
                wasRetry,
                skippedCount: this.probeState.skippedPoints.length,
                retriedCount: this.probeState.retriedCount,
                minZ: this.probeState.minZ,
                maxZ: this.probeState.maxZ,
                maxDeviation: this.probeState.maxZ - this.probeState.minZ,
              });

              if (step.completed) {
                this.emit('autolevel:complete');
                log.info('[autolevel] Probing completed');
              } else {
                this.sendAutolevelProbe();
              }
            }
          } else if (probingActive && this.probeState.skipUnprobed) {
            // No contact at the current target. Probe the next nearby candidate;
            // only once they are all exhausted is the grid node recorded as
            // skipped, for the compensation to interpolate from its neighbors.
            const gridNode = this.probeState.probePoints[attempted];
            const step = autolevel.nextProbeStep({
              contact: false,
              attempted,
              retryIndex: this.probeState.retryIndex,
              // A node on the border of the probe area has fewer distinct
              // candidates than one in the middle: the offsets clamp back onto
              // the node itself and are dropped.
              candidateCount: autolevel.createProbeCandidates({
                point: gridNode,
                ...this.probeState.config,
              }).length,
              totalPoints,
            });

            this.probeState.attempted = step.attempted;
            this.probeState.retryIndex = step.retryIndex;

            if (step.action === 'retry') {
              log.info(`[autolevel] No contact at point ${attempted + 1}/${totalPoints}` +
                ` -- retrying nearby (candidate ${step.retryIndex})`);
            } else {
              const skippedNode = nodeToMillimeters(gridNode);
              this.probeState.skippedPoints = [...this.probeState.skippedPoints, skippedNode];

              log.info(`[autolevel] No contact at point ${step.attempted}/${totalPoints}` +
                ` (X${gridNode.x} Y${gridNode.y}) nor at any nearby spot -- skipped`);

              this.emit('autolevel:update', {
                current: step.attempted,
                total: totalPoints,
                probedPos: null,
                skippedPoint: skippedNode,
                skippedCount: this.probeState.skippedPoints.length,
                retriedCount: this.probeState.retriedCount,
                minZ: this.probeState.minZ,
                maxZ: this.probeState.maxZ,
                // Still null while every node so far was skipped.
                maxDeviation: (this.probeState.minZ !== null)
                  ? this.probeState.maxZ - this.probeState.minZ
                  : null,
              });
            }

            if (step.completed) {
              this.emit('autolevel:complete');
              log.info('[autolevel] Probing completed');
            } else {
              this.sendAutolevelProbe();
            }
          } else if (probingActive) {
            // No contact, and no way forward: without "skip points with no
            // contact" the run probes with G38.2, so Grbl has already alarmed
            // and there is no Z to record for this node. Stop and say so --
            // nothing else will send the next probe.
            this.abortAutolevel('no contact at a grid point', {
              point: this.probeState.probePoints[attempted],
            });
          }
        }
      });

      this.runner.on('feedback', (res) => {
        this.emit('serialport:read', res.raw);
      });

      this.runner.on('settings', (res) => {
        const setting = _.find(GRBL_SETTINGS, { setting: res.name });

        if (!res.message && setting) {
          // Grbl v1.1
          this.emit('serialport:read', `${res.name}=${res.value} (${setting.message}, ${setting.units})`);
        } else {
          // Grbl v0.9
          this.emit('serialport:read', res.raw);
        }
      });

      this.runner.on('startup', (res) => {
        this.emit('serialport:read', res.raw);

        // The board re-introduced itself, so it rebooted: a brownout, a USB
        // glitch, or a soft reset. Everything in flight evaporated with it,
        // the probe cycle included, and a reset from Idle prints this banner
        // with no ALARM behind it -- nothing else would ever end the run.
        this.testProbeInFlight = false;
        this.abortAutolevel('the controller reset');

        if (!this.ready) {
          // The startup message always prints upon startup, after a reset, or at program end.
          // Setting the initial state when Grbl has completed re-initializing all systems.
          this.clearActionValues();

          // Set ready flag to true when a startup message has arrived
          this.ready = true;
        }

        if (!this.initialized) {
          this.initialized = true;

          // Initialize controller
          this.initController();
        }
      });

      this.runner.on('others', (res) => {
        this.emit('serialport:read', res.raw);
      });

      // Restrict the function to execute once within the specified time interval, occurring only on the trailing edge of the timeout.
      const queryActivity = _.throttle(() => {
        if (this.isOpen()) {
          this.connection.write('?');
        }
      }, 2000, {
        // For grbl-Mega, it is essential to allow a specific delay before querying the status report to avoid blocking the connection.
        // Therefore, the `leading` option must be set to false.
        // @see https://github.com/cncjs/cncjs/issues/889
        leading: false,
        trailing: true,
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

        if (this.isOpen()) {
          this.actionMask.queryStatusReport = true;
          this.actionTime.queryStatusReport = now;
          this.connection.write('?');
        }
      };

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

        if (this.isOpen()) {
          this.actionMask.queryParserState.state = true;
          this.actionMask.queryParserState.reply = false;
          this.actionTime.queryParserState = now;
          this.connection.write('$G\n');
        }
      }, 500);

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

        // Grbl settings
        if (this.settings !== this.runner.settings) {
          this.settings = this.runner.settings;
          this.emit('controller:settings', GRBL, this.settings);
          this.emit('Grbl:settings', this.settings); // Backward compatibility
        }

        // Grbl state
        if (this.state !== this.runner.state) {
          this.state = this.runner.state;
          this.emit('controller:state', GRBL, this.state);
          this.emit('Grbl:state', this.state); // Backward compatibility
        }

        // Check the ready flag
        if (!(this.ready)) {
          queryActivity();
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
            this.command('gcode:stop');
          }
        }
      }, 250);
    }

    async initController() {
      // https://github.com/cncjs/cncjs/issues/206
      // $13=0 (report in mm)
      // $13=1 (report in inches)
      this.writeln('$$');

      await delay(50);
      this.event.trigger('controller:ready');
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

      // G-code parameters
      const parameters = this.runner.getParameters();

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

        // Machine position
        mposx: Number(mposx) || 0,
        mposy: Number(mposy) || 0,
        mposz: Number(mposz) || 0,
        mposa: Number(mposa) || 0,
        mposb: Number(mposb) || 0,
        mposc: Number(mposc) || 0,

        // Work position
        posx: Number(posx) || 0,
        posy: Number(posy) || 0,
        posz: Number(posz) || 0,
        posa: Number(posa) || 0,
        posb: Number(posb) || 0,
        posc: Number(posc) || 0,

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

        // G-code parameters
        params: parameters,

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

    // Auto Level - send the probe cycle for the current target.
    //
    // Probing runs node by node rather than as one pre-queued program: what to
    // send next (advance, retry beside, or give up and skip) depends on the
    // result of the probe that just finished, and plain Grbl G-code has no
    // conditionals to express that.
    //
    // retryIndex 0 probes the grid node itself; the rest probe candidates a
    // quarter step away, clamped to the probe area. A measurement taken at a
    // retry spot is recorded under the intended node's XY so the compensation
    // grid stays rectangular; the Z error of that approximation is bounded by
    // the local slope over a quarter step, against a node that would otherwise
    // carry no measurement at all.
    sendAutolevelProbe() {
      const { probePoints, attempted, retryIndex, config, skipUnprobed } = this.probeState;
      const point = probePoints[attempted];
      if (!point) {
        // No point at the cursor means the cursor is past the end of the grid,
        // so the run is already resolved and there is nothing to abort. It can
        // only be reached by dispatching without checking `completed` first
        // ('autolevel:start' refuses an empty grid, so that is not this), and a
        // silent return there would look exactly like a hung run -- say it.
        log.error(`[autolevel] No probe point at index ${attempted} of ${probePoints.length}: nothing sent`);
        return;
      }

      const { startX, endX, stepX, startY, endY, stepY, clearanceZ, startZ, endZ, feedrate } = config;
      const candidates = autolevel.createProbeCandidates({ point, startX, endX, stepX, startY, endY, stepY });
      const { x, y } = candidates[retryIndex];
      // G38.3 reports failure without alarming, which is what makes a node with
      // no contact recoverable; G38.2 keeps the stricter default behaviour.
      const probeWord = skipUnprobed ? 'G38.3' : 'G38.2';
      const feed = this.probeState.firstProbeSent ? feedrate : (feedrate / 2);
      this.probeState.firstProbeSent = true;

      // From here until its `[PRB:...]` comes back, a probe is on the wire:
      // that is the only window in which a PRB line is this run's result.
      this.probeState.probeInFlight = true;

      this.command('gcode', [
        `(Auto Level: probing point ${attempted}${retryIndex > 0 ? `, retry ${retryIndex}` : ''})`,
        'G90',
        `G0 Z${clearanceZ}`,
        `G0 X${x} Y${y}`,
        `G0 Z${startZ}`,
        `${probeWord} Z${endZ} F${feed}`,
        `G0 Z${clearanceZ}`,
      ]);
    }

    // Auto Level - whether a probing run owns the machine right now. The cursor
    // parked at the end of the grid is what marks a run finished or aborted.
    isAutolevelRunning() {
      return this.probeState.attempted < this.probeState.probePoints.length;
    }

    // Auto Level - end a run that cannot continue, and say why. Probing is
    // dispatched one node at a time, so a path that neither advances nor
    // reports leaves the widget waiting on a PRB that will never arrive; every
    // dead end has to come through here.
    abortAutolevel(reason, detail = {}) {
      // Nothing in flight: no run was started, or the last one finished and its
      // measurements are still sitting there waiting to be applied.
      if (this.probeState.attempted >= this.probeState.probePoints.length) {
        return;
      }

      log.error(`[autolevel] Aborting after ${this.probeState.attempted}/${this.probeState.probePoints.length} points: ${reason}`);
      this.emit('autolevel:error', {
        reason,
        current: this.probeState.attempted,
        total: this.probeState.probePoints.length,
        // A run that dies at node 60 of 81 still cost an hour of machine time
        // and 59 good measurements. Hand them over so the client can apply the
        // partial map (the missing nodes interpolate exactly like the ones a
        // no-contact skip leaves behind) instead of starting from nothing.
        probedPositions: [...this.probeState.probedPositions],
        skippedPoints: [...this.probeState.skippedPoints],
        ...detail,
      });

      // Deliberately NOT `createProbeState()`: that threw the same partial map
      // away on the server, so a browser reload asking 'autolevel:getProbeState'
      // got an empty run back. Marking the cursor as resolved is enough to end
      // the run -- the guard above, sendAutolevelProbe and the PRB handler all
      // judge liveness by it -- and it leaves the measurements readable until
      // the next 'autolevel:start' replaces them.
      this.probeState.abortedAt = this.probeState.attempted;
      this.probeState.attempted = this.probeState.probePoints.length;
      this.probeState.probeInFlight = false;
      this.probeState.abortReason = reason;
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

        this.workflow.stop();

        // Clear action values
        this.clearActionValues();

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

      // Clear initialized flag
      this.initialized = false;

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
        socket.emit('controller:settings', GRBL, this.settings);
        socket.emit('Grbl:settings', this.settings); // Backward compatibility
      }
      if (!_.isEmpty(this.state)) {
        // controller state
        socket.emit('controller:state', GRBL, this.state);
        socket.emit('Grbl:state', this.state); // Backward compatibility
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
        socket.emit(eventName, ...args);
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
          // A probing run drives the machine through the feeder, one node per
          // serial round-trip, and it leaves the machine in Idle between nodes
          // -- long enough for the workspace Play button to light up. Starting
          // a job there does two irreversible things: feeder.reset() throws
          // away the probe block still queued, and from then on every `ok` is
          // consumed by the sender, so feeder.next() is never called again and
          // the run can neither finish nor fail. It would hang on its progress
          // bar with the machine cutting. Refuse instead.
          if (this.isAutolevelRunning()) {
            const msg = 'Cannot start a G-code program while a probing run is in progress (stop the run, or reset the controller)';
            log.error(`[gcode:start] ${msg}`);
            this.emit('serialport:read', `> (${msg})`);
            return;
          }

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
        'gcode:stop': async () => {
          this.event.trigger('gcode:stop');

          this.workflow.stop();

          const [options] = args;
          const { force = false } = { ...options };
          if (force) {
            let activeState;

            activeState = _.get(this.state, 'status.activeState', '');
            if (activeState === GRBL_ACTIVE_STATE_RUN) {
              this.write('!'); // hold
            }

            await delay(500); // delay 500ms

            activeState = _.get(this.state, 'status.activeState', '');
            if (activeState === GRBL_ACTIVE_STATE_HOLD) {
              this.write('\x18'); // ^x
            }
          }
        },
        'pause': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:pause');
        },
        'gcode:pause': () => {
          this.event.trigger('gcode:pause');

          this.workflow.pause();
          this.write('!');
        },
        'resume': () => {
          log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
          this.command('gcode:resume');
        },
        'gcode:resume': () => {
          // Resuming a paused job puts the sender back in charge of every `ok`,
          // which starves the feeder the probing run advances through. Same
          // dead end as 'gcode:start'.
          if (this.isAutolevelRunning()) {
            const msg = 'Cannot resume a G-code program while a probing run is in progress (stop the run, or reset the controller)';
            log.error(`[gcode:resume] ${msg}`);
            this.emit('serialport:read', `> (${msg})`);
            return;
          }

          this.event.trigger('gcode:resume');

          this.write('~');
          this.workflow.resume();
        },
        'feeder:feed': () => {
          const [commands, context] = args;
          this.command('gcode', commands, context);
        },
        'feeder:start': () => {
          if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
            return;
          }
          this.write('~');
          this.feeder.unhold();
          this.feeder.next();
        },
        'feeder:stop': () => {
          this.feeder.reset();
        },
        'feedhold': () => {
          this.event.trigger('feedhold');

          this.write('!');
        },
        'cyclestart': () => {
          this.event.trigger('cyclestart');

          this.write('~');
        },
        'statusreport': () => {
          this.write('?');
        },
        'homing': () => {
          this.event.trigger('homing');

          this.writeln('$H');
        },
        'sleep': () => {
          this.event.trigger('sleep');

          this.writeln('$SLP');
        },
        'unlock': () => {
          this.writeln('$X');
        },
        'reset': () => {
          this.workflow.stop();

          this.feeder.reset();

          this.write('\x18'); // ^x
        },
        'jogCancel': () => {
          // https://github.com/gnea/grbl/blob/master/doc/markdown/jogging.md
          this.write('\x85');
        },
        // Feed Overrides
        // @param {number} value The amount of percentage increase or decrease.
        //   0: Set 100% of programmed rate.
        //  10: Increase 10%
        // -10: Decrease 10%
        //   1: Increase 1%
        //  -1: Decrease 1%
        'feedOverride': () => {
          const [value] = args;

          if (value === 0) {
            this.write('\x90');
          } else if (value === 10) {
            this.write('\x91');
          } else if (value === -10) {
            this.write('\x92');
          } else if (value === 1) {
            this.write('\x93');
          } else if (value === -1) {
            this.write('\x94');
          }
        },
        // Spindle Speed Overrides
        // @param {number} value The amount of percentage increase or decrease.
        //   0: Set 100% of programmed spindle speed
        //  10: Increase 10%
        // -10: Decrease 10%
        //   1: Increase 1%
        //  -1: Decrease 1%
        'spindleOverride': () => {
          const [value] = args;

          if (value === 0) {
            this.write('\x99');
          } else if (value === 10) {
            this.write('\x9a');
          } else if (value === -10) {
            this.write('\x9b');
          } else if (value === 1) {
            this.write('\x9c');
          } else if (value === -1) {
            this.write('\x9d');
          }
        },
        // Rapid Overrides
        // @param {number} value A percentage value of 25, 50, or 100. A value of zero will reset to 100%.
        // 100: Set to 100% full rapid rate.
        //  50: Set to 50% of rapid rate.
        //  25: Set to 25% of rapid rate.
        'rapidOverride': () => {
          const [value] = args;

          if (value === 0 || value === 100) {
            this.write('\x95');
          } else if (value === 50) {
            this.write('\x96');
          } else if (value === 25) {
            this.write('\x97');
          }
        },
        'lasertest:on': () => {
          const [power = 0, duration = 0, maxS = 1000] = args;
          const commands = [
            // https://github.com/gnea/grbl/wiki/Grbl-v1.1-Laser-Mode
            // The laser will only turn on when Grbl is in a G1, G2, or G3 motion mode.
            'G1F1',
            'M3S' + ensurePositiveNumber(maxS * (power / 100))
          ];
          if (duration > 0) {
            commands.push('G4P' + ensurePositiveNumber(duration / 1000));
            commands.push('M5S0');
          }
          this.command('gcode', commands);
        },
        'lasertest:off': () => {
          const commands = [
            'M5S0'
          ];
          this.command('gcode', commands);
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

          if (!this.feeder.isPending()) {
            this.feeder.next();
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
        'autolevel:start': () => {
          const [params = {}] = args;
          const {
            mode = 'full',
            startX,
            endX,
            stepX,
            startY,
            endY,
            stepY,
            clearanceZ,
            startZ,
            endZ,
            feedrate,
            skipUnprobed = false,
          } = params;

          // Every refusal below is a refusal of THIS request, not the end of a
          // run. It still reaches every socket, because emit() is a broadcast
          // and the command carries no socket to answer -- so it is tagged
          // `rejected`, and a client already watching a live run leaves its
          // progress alone instead of reporting that run as stopped.
          const refuse = (reason) => {
            log.error(`[autolevel:start] Refusing to probe: ${reason}`);
            this.emit('autolevel:error', {
              reason,
              rejected: true,
              current: this.probeState.attempted,
              total: this.probeState.probePoints.length,
              probedPositions: [...this.probeState.probedPositions],
              skippedPoints: [...this.probeState.skippedPoints],
            });
          };

          // A run already in flight owns the machine and the sequential cursor.
          // A second start (a second browser tab, a double click) would point
          // the same cursor at a new grid while probe results from the old one
          // are still arriving, interleaving two chains into one displaced map.
          // The run has to be stopped first -- 'autolevel:stop' does that.
          //
          // This comes before the test-mode branch on purpose: a Test Probe is
          // a bare G38.2 on the current XY, and injected into a live run its
          // `[PRB:...]` is either recorded as some node's height or, on no
          // contact, alarms and takes the whole run down with it.
          if (this.isAutolevelRunning()) {
            refuse('a probing run is already in progress');
            return;
          }

          // A test probe still descending is the same conflict from the other
          // side: it answers with a `[PRB:...]` of its own, measured wherever
          // the machine stood, and a grid run armed in the meantime would take
          // it for the height of node 0 and shift the whole map by one node.
          if (this.testProbeInFlight) {
            refuse('a test probe is still running');
            return;
          }

          // Grbl refuses G-code in Alarm state with error:9, and the feeder
          // does not even write it: feeder.on('data') drops the block while
          // runner.isAlarm(). Sequential probing would then wait on a probe
          // that was never sent -- silence, forever. Say no up front. The alarm
          // that started before probeState existed is exactly the one no abort
          // path could have caught.
          if (this.runner.isAlarm()) {
            refuse('the controller is in alarm state -- unlock it first');
            return;
          }

          if (mode === 'test') {
            // Test mode: single probe at current XY position, no grid.
            const testGCode = [
              'G90',
              `G0 Z${clearanceZ}`,
              `G0 Z${startZ}`,
              `G38.2 Z${endZ} F${feedrate}`,
              `G0 Z${clearanceZ}`,
            ];
            log.info(`[autolevel:start] Test probe: clearanceZ=${clearanceZ}, startZ=${startZ}, endZ=${endZ}, F=${feedrate}`);
            // Its `[PRB:...]` belongs to no grid node; the PRB handler consumes
            // it against this flag so a run started meanwhile cannot claim it.
            this.testProbeInFlight = true;
            this.lastPrbSignature = null;
            this.command('gcode', testGCode);
            return;
          }

          // Full mode: multi-point probe grid.
          //
          // Refuse an unusable area BEFORE arming probeState, and say so. An
          // inverted rectangle (startY=100, endY=0) yields no grid node at all:
          // there would be no first probe to send, no event of any kind, and
          // the widget would sit on a progress bar forever -- with probeState
          // armed at zero points, even abortAutolevel would refuse to fire
          // because a run of zero points always looks finished.
          const areaError = autolevel.validateProbeArea({ startX, endX, stepX, startY, endY, stepY });
          if (areaError) {
            refuse(areaError);
            return;
          }

          const probePoints = autolevel.createProbeXYPoints({
            startX,
            endX,
            stepX,
            startY,
            endY,
            stepY,
          });

          // Reset probe state
          this.probeState = {
            ...createProbeState(),
            probePoints,
            skipUnprobed: !!skipUnprobed,
            config: {
              startX,
              endX,
              stepX,
              startY,
              endY,
              stepY,
              clearanceZ,
              startZ,
              endZ,
              feedrate,
            },
          };

          // A run of one point, restarted, would probe the same XY twice and
          // could stamp the same `[PRB:...]` twice; forget the previous line so
          // the replay filter in the PRB handler only ever compares within a run.
          this.lastPrbSignature = null;

          log.info(`[autolevel:start] Start probing with ${probePoints.length} points, one at a time` +
            (skipUnprobed ? ', skipping points with no contact' : ''));

          // The run is accepted, and only now. A client does not put itself in
          // the probing state on its own: it would have no way to tell its own
          // refusal from the one a second tab provoked, since both arrive on
          // the same broadcast. This is the event that says a run exists, and
          // it carries the authoritative point count.
          this.emit('autolevel:started', {
            total: probePoints.length,
            skipUnprobed: !!skipUnprobed,
          });

          // Only the first probe is sent here. Each PRB result decides the next
          // command -- advance, retry beside the node, or skip it -- so the
          // program cannot be queued up front. See sendAutolevelProbe().
          this.sendAutolevelProbe();
        },
        'autolevel:stop': () => {
          // Reset the machine to cancel the probe cycle immediately
          this.command('reset');

          // Clear probe state
          this.probeState = createProbeState();
          this.testProbeInFlight = false;
          log.info('[autolevel:stop] Probe stopped and state cleared');
        },
        'autolevel:getProbeState': () => {
          const [, callback] = args;
          if (typeof callback === 'function') {
            callback(null, { state: this.probeState });
          }
        },
        'autolevel:loadFromFile': async () => {
          const [filepath, callback] = args;

          try {
            const data = await fsp.readFile(filepath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim().length > 0);

            const probedPositions = [];
            let minZ = Infinity;
            let maxZ = -Infinity;

            lines.forEach(line => {
              const regex = /(-?\d*\.?\d+)?(\s+|$)/g;
              const matches = [...line.matchAll(regex)];
              const values = matches.map(match => (match[1] ? Number(match[1]) : undefined));
              const [x, y, z] = values;

              probedPositions.push({ x, y, z });
              minZ = Math.min(z, minZ);
              maxZ = Math.max(z, maxZ);
            });

            this.probeState.probedPositions = probedPositions;
            this.probeState.minZ = minZ;
            this.probeState.maxZ = maxZ;

            if (typeof callback === 'function') {
              callback(null, { success: true, state: this.probeState });
            }

            log.info(`[autolevel:load] Loaded ${probedPositions.length} points from ${filepath}`);
          } catch (err) {
            log.error('[autolevel:load] Error loading probe data:', err);
            if (typeof callback === 'function') {
              callback(err.message, { success: false, state: null });
            }
          }
        },
        'autolevel:saveToFile': async () => {
          const [filepath, callback] = args;

          try {
            const { probedPositions } = this.probeState;
            const data = probedPositions.map(({ x, y, z }) => {
              const a = 0, b = 0, c = 0;
              const u = 0, v = 0, w = 0;
              return `${x} ${y} ${z} ${a} ${b} ${c} ${u} ${v} ${w}`;
            }).join('\n');

            await fsp.writeFile(filepath, data, 'utf8');

            if (typeof callback === 'function') {
              callback(null, { success: true, filepath });
            }

            log.info(`[autolevel:saveToFile] Saved ${probedPositions.length} points to ${filepath}`);
          } catch (err) {
            log.error('[autolevel:saveToFile] Error saving probe data:', err);
            if (typeof callback === 'function') {
              callback(err.message, { success: false, filepath });
            }
          }
        },
        'autolevel:applyProbeCompensation': () => {
          const [params, callback] = args;
          const {
            gcode: gcodeStr,
            probeData,
          } = params;

          // Use AutoLevel static method for compensation (step size auto-detected from probeData)
          const compensatedGcode = autolevel.applyProbeCompensation(gcodeStr, probeData);

          log.info('[autolevel:applyProbeCompensation] Probe compensation applied');

          if (typeof callback === 'function') {
            callback(null, { compensatedGcode });
          }
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

      const cmd = data.trim();
      this.actionMask.replyStatusReport = (cmd === '?') || this.actionMask.replyStatusReport;
      this.actionMask.replyParserState = (cmd === '$G') || this.actionMask.replyParserState;

      this.emit('serialport:write', data, {
        ...context,
        source: WRITE_SOURCE_CLIENT
      });
      this.connection.write(data);
      log.silly(`> ${data}`);
    }

    writeln(data, context) {
      // https://github.com/gnea/grbl/blob/master/doc/markdown/commands.md#grbl-v11-realtime-commands
      const isASCIIRealtimeCommand = _.includes(GRBL_REALTIME_COMMANDS, data);
      const isExtendedASCIIRealtimeCommand = String(data).match(/[\x80-\xff]/);
      const isRealtimeCommand = isASCIIRealtimeCommand || isExtendedASCIIRealtimeCommand;

      if (isRealtimeCommand) {
        this.write(data, context);
      } else {
        this.write(data + '\n', context);
      }
    }
}

export default GrblController;
