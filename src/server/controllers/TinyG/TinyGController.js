import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ensureArray, ensureFiniteNumber, ensurePositiveNumber, ensureString } from 'ensure-type';
import * as parser from 'gcode-parser';
import _ from 'lodash';
import {
  CONNECTION_TYPE_SERIAL,
  CONNECTION_TYPE_SOCKET,
} from '../../constants/connection';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/Sender';
import SerialConnection from '../../lib/SerialConnection';
import SocketConnection from '../../lib/SocketConnection';
import Workflow, {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING
} from '../../lib/Workflow';
import delay from '../../lib/delay';
import evaluateAssignmentExpression from '../../lib/evaluate-assignment-expression';
import logger from '../../lib/logger';
import translateExpression from '../../lib/translate-expression';
import serviceContainer from '../../service-container';
import controllers from '../../store/controllers';
import {
  GLOBAL_OBJECTS as globalObjects,
  WRITE_SOURCE_CLIENT,
  WRITE_SOURCE_FEEDER
} from '../constants';
import TinyGRunner from './TinyGRunner';
import {
  TINYG,
  TINYG_PLANNER_BUFFER_LOW_WATER_MARK,
  TINYG_PLANNER_BUFFER_HIGH_WATER_MARK,
  TINYG_SERIAL_BUFFER_LIMIT,
  TINYG_STATUS_CODES
} from './constants';

const userStore = serviceContainer.resolve('userStore');
const directoryWatcher = serviceContainer.resolve('directoryWatcher');
const shellCommand = serviceContainer.resolve('shellCommand');

const SENDER_STATUS_NONE = 'none';
const SENDER_STATUS_NEXT = 'next';
const SENDER_STATUS_ACK = 'ack';

// % commands
const WAIT = '%wait';

const log = logger('controller:TinyG');
const noop = () => {};

class TinyGController {
  type = TINYG;

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

  // TinyG
  tinyg = null;

  ready = false;

  state = {};

  settings = {};

  sr = {
    stat: true, // machine state
    line: true, // runtime line number
    vel: true, // current velocity
    feed: true, // feed rate
    unit: true, // units mode
    coor: true, // coordinate system
    momo: true, // motion mode
    plan: true, // plane select
    path: true, // path control mode
    dist: true, // distance mode
    admo: true, // arc distance mode
    frmo: true, // feed rate mode
    tool: true, // active tool
    posx: true,
    posy: true,
    posz: true,
    posa: true,
    posb: true,
    posc: true,
    mpox: true,
    mpoy: true,
    mpoz: true,
    mpoa: true,
    mpob: true,
    mpoc: true,
    spe: true, // [edge-082.10] Spindle enable (removed in edge-101.03)
    spd: true, // [edge-082.10] Spindle direction (removed in edge-101.03)
    spc: true, // [edge-101.03] Spindle control
    sps: true, // [edge-082.10] Spindle speed
    com: true, // [edge-082.10] Mist coolant
    cof: true // [edge-082.10] Flood coolant
  };

  timer = {
    query: null
  };

  blocked = false;

  senderStatus = SENDER_STATUS_NONE;

  actionTime = {
    senderFinishTime: 0
  };

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

  deprecatedCommandHandler = {
    'start': () => {
      this.command('sender:start');
    },
    'stop': (...args) => {
      this.command('sender:stop', ...args);
    },
    'pause': () => {
      this.command('sender:pause');
    },
    'resume': () => {
      this.command('sender:resume');
    },
    'gcode:load': (...args) => {
      let [name, gcode, context = {}, callback = noop] = args;
      const meta = {
        name: name,
        content: gcode,
      };
      this.command('sender:load', meta, context, callback);
    },
    'gcode:unload': () => {
      this.command('sender:unload');
    },
    'gcode:start': () => {
      this.command('sender:start');
    },
    'gcode:stop': (...args) => {
      this.command('sender:stop', ...args);
    },
    'gcode:pause': () => {
      this.command('sender:pause');
    },
    'gcode:resume': () => {
      this.command('sender:resume');
    },
    'feeder:feed': (...args) => {
      this.command('gcode', ...args);
    },
    'feedOverride': (...args) => {
      this.command('override:feed', ...args);
    },
    'spindleOverride': (...args) => {
      this.command('override:spindle', ...args);
    },
    'rapidOverride': (...args) => {
      this.command('override:rapid', ...args);
    },
    'lasertest:on': (...args) => {
      this.command('lasertest', ...args);
    },
    'lasertest:off': () => {
      const power = 0;
      this.command('lasertest', power);
    },
  };

  commandHandler = {
    'sender:load': (...args) => {
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

      this.emit('sender:load', meta, context);

      this.event.trigger('sender:load');

      this.workflow.stop();

      const senderState = this.sender.toJSON();
      callback(null, senderState);

      log.debug(`sender: sp=${senderState.sp}, name=${chalk.yellow(JSON.stringify(senderState.name))}, size=${senderState.size}, total=${senderState.total}, context=${JSON.stringify(senderState.context)}`);
    },
    'sender:unload': () => {
      this.workflow.stop();

      // Sender
      this.sender.unload();

      this.emit('sender:unload');
      this.event.trigger('sender:unload');
    },
    'sender:start': () => {
      this.event.trigger('sender:start');

      this.workflow.start();

      // Feeder
      this.feeder.reset();

      // Sender
      this.sender.next();
    },
    // @param {object} options The options object.
    // @param {boolean} [options.force] Whether to force stop a G-code program. Defaults to false.
    'sender:stop': (...args) => {
      this.event.trigger('sender:stop');

      this.workflow.stop();

      const [options] = args;
      const { force = false } = { ...options };
      if (force) {
        const firmwareBuild = ensureFiniteNumber(_.get(this.settings, 'fb'));

        if (firmwareBuild >= 101) {
          // https://github.com/synthetos/g2/releases/tag/101.02
          // * Added explicit Job Kill ^d - has the effect of an M30 (program end)
          this.writeln('\x04'); // kill job (^d)
        } else if (firmwareBuild >= 100) {
          this.writeln('\x04'); // kill job (^d)
          this.writeln('M30'); // end of program
        } else {
          // https://github.com/synthetos/g2/wiki/Feedhold,-Resume,-and-Other-Simple-Commands#jogging-using-feedhold-and-queue-flush
          // Send a ! to stop movement immediately.
          // Send a % to flush remaining moves from planner buffer.
          this.writeln('!'); // feedhold
          this.writeln('%'); // queue flush
          this.writeln('M30'); // end of program
        }
      }

      this.writeln('{"qr":""}'); // queue report
    },
    'sender:pause': () => {
      this.event.trigger('sender:pause');

      this.workflow.pause();
      this.writeln('!'); // feedhold
      this.writeln('{"qr":""}'); // queue report
    },
    'sender:resume': () => {
      this.event.trigger('sender:resume');

      this.writeln('~'); // cycle start
      this.workflow.resume();
      this.writeln('{"qr":""}'); // queue report
    },
    'feeder:start': () => {
      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        return;
      }
      this.writeln('~'); // cycle start
      this.writeln('{"qr":""}'); // queue report
      this.feeder.unhold();
      this.feeder.next();
    },
    'feeder:stop': () => {
      this.feeder.reset();
    },
    'feedhold': () => {
      this.event.trigger('feedhold');

      this.writeln('!'); // feedhold
      this.writeln('{"qr":""}'); // queue report
    },
    'cyclestart': () => {
      this.event.trigger('cyclestart');

      this.writeln('~'); // cycle start
      this.writeln('{"qr":""}'); // queue report
    },
    'homing': () => {
      this.event.trigger('homing');

      this.writeln('G28.2 X0 Y0 Z0');
    },
    'sleep': () => {
      this.event.trigger('sleep');

      // Not supported
    },
    'unlock': () => {
      this.writeln('{clear:null}'); // alarm clear
    },
    'reset': () => {
      this.workflow.stop();
      this.feeder.reset();
      this.write('\x18'); // reset board (^x)
    },
    // Feed Overrides
    // @param {number} value A percentage value between 5 and 200. A value of zero will reset to 100%.
    'override:feed': (...args) => {
      const [value] = args;
      let mfo = this.runner.settings.mfo;

      if (value === 0) {
        mfo = 1;
      } else if ((mfo * 100 + value) > 200) {
        mfo = 2;
      } else if ((mfo * 100 + value) < 5) {
        mfo = 0.05;
      } else {
        mfo = (mfo * 100 + value) / 100;
      }

      this.command('gcode', `{mfo:${mfo}}`);
    },
    // Spindle Speed Overrides
    // @param {number} value A percentage value between 5 and 200. A value of zero will reset to 100%.
    'override:spindle': (...args) => {
      const [value] = args;
      let sso = this.runner.settings.sso;

      if (value === 0) {
        sso = 1;
      } else if ((sso * 100 + value) > 200) {
        sso = 2;
      } else if ((sso * 100 + value) < 5) {
        sso = 0.05;
      } else {
        sso = (sso * 100 + value) / 100;
      }

      this.command('gcode', `{sso:${sso}}`);
    },
    // Rapid Overrides
    'override:rapid': (...args) => {
      const [value] = args;

      if (value === 0 || value === 100) {
        this.command('gcode', '{mto:1}');
      } else if (value === 50) {
        this.command('gcode', '{mto:0.5}');
      } else if (value === 25) {
        this.command('gcode', '{mto:0.25}');
      }
    },
    // Turn on any motor that is not disabled.
    // @param {number} [value] Enable the motors with a specified timeout value in seconds. Defaults to 3600 seconds.
    'motor:enable': (...args) => {
      let [mt = this.state.mt] = args;
      mt = ensureFiniteNumber(mt);

      if (mt <= 0) {
        this.command('motor:disable');
        return;
      }

      // Providing {me:0} will enable the motors for the timeout specified in the mt value.
      this.command('gcode', `{me:${mt}}`);
      this.command('gcode', '{pwr:n}');
    },
    // Disable all motors that are not permanently enabled.
    'motor:disable': () => {
      this.command('gcode', '{md:0}');
      this.command('gcode', '{pwr:n}');
    },
    // Sets the number of seconds before a motor will shut off automatically.
    // @param {number} value The default timeout in seconds.
    'motor:timeout': (...args) => {
      let [mt] = args;
      mt = ensureFiniteNumber(mt);

      if (mt >= 0) {
        this.command('gcode', `{mt:${mt}}`);
      }
    },
    // @param {number} power
    // @param {number} duration
    // @param {number} maxS
    'lasertest': (...args) => {
      const [power = 0, duration = 0, maxS = 1000] = args;

      if (!power) {
        this.command('gcode', 'M5S0');
        return;
      }

      this.command('gcode', 'M3S' + ensurePositiveNumber(maxS * (power / 100)));

      if (duration > 0) {
        this.command('gcode', 'G4P' + ensurePositiveNumber(duration / 1000));
        this.command('gcode', 'M5S0');
      }
    },
    'gcode': (...args) => {
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
    'macro:run': (...args) => {
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

      this.event.trigger('macro:run');

      this.command('gcode', macro.content, context);
      callback(null);
    },
    'macro:load': (...args) => {
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

      this.event.trigger('macro:load');

      const meta = {
        name: macro.name,
        content: macro.content,
      };
      this.command('sender:load', meta, context, callback);
    },
    'watchdir:load': (...args) => {
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
        this.command('sender:load', meta, context, callback);
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
      footer: this.controller.footer,
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

    // Event Trigger
    this.event = new EventTrigger((event, trigger, commands) => {
      log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
      if (trigger === 'system') {
        shellCommand.spawn(commands);
      } else {
        this.command('gcode', commands);
      }
    });

    // Feeder
    this.feeder = new Feeder({
      // https://github.com/synthetos/g2/wiki/JSON-Active-Comments
      dataFilter: (line, context) => {
        const originalLine = line;
        /**
         * line = 'G0X10 ; comment text'
         * parts = ['G0X10 ', ' comment text', '']
         */
        const parts = originalLine.split(/;(.*)/s); // `s` is the modifier for single-line mode
        line = ensureString(parts[0]).trim();
        context = this.populateContext(context);

        if (line[0] === '%') {
          // %wait
          if (line === WAIT) {
            log.debug('Wait for the planner to empty');
            this.feeder.hold({ data: WAIT, msg: originalLine }); // Hold reason
            return 'G4 P0.5'; // dwell
          }

          // Expression
          // %_x=posx,_y=posy,_z=posz
          evaluateAssignmentExpression(line.slice(1), context);
          return '';
        }

        // line="G0 X[posx - 8] Y[ymax]"
        // > "G0 X2 Y50"
        line = translateExpression(line, context);
        const data = parser.parseLine(line, { flatten: true });
        const words = ensureArray(data.words);

        { // Program Mode: M0, M1
          const programMode = _.intersection(words, ['M0', 'M1'])[0];
          if (programMode === 'M0') {
            log.debug('M0 Program Pause');
            this.feeder.hold({ data: 'M0', msg: originalLine }); // Hold reason
          } else if (programMode === 'M1') {
            log.debug('M1 Program Pause');
            this.feeder.hold({ data: 'M1', msg: originalLine }); // Hold reason
          }
        }

        // M6 Tool Change
        if (_.includes(words, 'M6')) {
          log.debug('M6 Tool Change');
          this.feeder.hold({ data: 'M6', msg: originalLine }); // Hold reason
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
    this.sender = new Sender(SP_TYPE_SEND_RESPONSE, {
      // https://github.com/synthetos/g2/wiki/JSON-Active-Comments
      dataFilter: (line, context) => {
        const originalLine = line;
        /**
         * line = 'G0X10 ; comment text'
         * parts = ['G0X10 ', ' comment text', '']
         */
        const parts = originalLine.split(/;(.*)/s); // `s` is the modifier for single-line mode
        line = ensureString(parts[0]).trim();
        context = this.populateContext(context);

        const { sent, received } = this.sender.state;

        if (line[0] === '%') {
          // %wait
          if (line === WAIT) {
            log.debug(`Wait for the planner to empty: line=${sent + 1}, sent=${sent}, received=${received}`);
            this.sender.hold({ data: WAIT, msg: originalLine }); // Hold reason
            return 'G4 P0.5'; // dwell
          }

          // Expression
          // %_x=posx,_y=posy,_z=posz
          evaluateAssignmentExpression(line.slice(1), context);
          return '';
        }

        // line="G0 X[posx - 8] Y[ymax]"
        // > "G0 X2 Y50"
        line = translateExpression(line, context);
        const data = parser.parseLine(line, { flatten: true });
        const words = ensureArray(data.words);

        { // Program Mode: M0, M1
          const programMode = _.intersection(words, ['M0', 'M1'])[0];
          if (programMode === 'M0') {
            log.debug(`M0 Program Pause: line=${sent + 1}, sent=${sent}, received=${received}`);
            this.event.trigger('sender:pause');
            this.workflow.pause({ data: 'M0', msg: originalLine });
          } else if (programMode === 'M1') {
            log.debug(`M1 Program Pause: line=${sent + 1}, sent=${sent}, received=${received}`);
            this.event.trigger('sender:pause');
            this.workflow.pause({ data: 'M1', msg: originalLine });
          }
        }

        // M6 Tool Change
        if (_.includes(words, 'M6')) {
          log.debug(`M6 Tool Change: line=${sent + 1}, sent=${sent}, received=${received}`);
          this.event.trigger('sender:pause');
          this.workflow.pause({ data: 'M6', msg: originalLine });
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

      // Remove blanks to reduce the amount of bandwidth
      line = String(line).replace(/\s+/g, '');
      if (line.length === 0) {
        log.warn(`Expected non-empty line: N=${this.sender.state.sent}`);
        return;
      }

      // Replace line numbers with the number of lines sent
      const n = this.sender.state.sent;
      line = ('' + line).replace(/^N[0-9]*/, '');
      line = ('N' + n + line);

      this.connection.write(line + '\n');
      log.silly(`data: n=${n}, line="${line}"`);
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
      this.blocked = false;
      this.senderStatus = SENDER_STATUS_NONE;
      this.sender.rewind();
    });
    this.workflow.on('stop', (...args) => {
      this.emit('workflow:state', this.workflow.state);
      this.blocked = false;
      this.senderStatus = SENDER_STATUS_NONE;
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

    // TinyG
    this.runner = new TinyGRunner();

    this.runner.on('raw', (res) => {
      if (this.workflow.state === WORKFLOW_STATE_IDLE) {
        this.emit('connection:read', this.connectionState, res.raw);
      }
    });

    // https://github.com/synthetos/g2/wiki/g2core-Communications
    this.runner.on('r', (r) => {
      //
      // Ignore unrecognized commands
      //
      if (r && r.spe === null) {
        this.sr.spe = false; // No spindle enable
      }
      if (r && r.spd === null) {
        this.sr.spd = false; // No spindle direction
      }
      if (r && r.spc === null) {
        this.sr.spc = false; // No spindle control
      }
      if (r && r.sps === null) {
        this.sr.sps = false; // No spindle speed
      }
      if (r && r.com === null) {
        this.sr.com = false; // No mist coolant
      }
      if (r && r.cof === null) {
        this.sr.cof = false; // No flood coolant
      }

      const { hold, sent, received } = this.sender.state;

      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        const n = _.get(r, 'r.n') || _.get(r, 'n');
        if (n !== sent) {
          log.warn(`Expression: n (${n}) === sent (${sent})`);
        }
        log.silly(`ack: n=${n}, blocked=${this.blocked}, hold=${hold}, sent=${sent}, received=${received}`);
        this.senderStatus = SENDER_STATUS_ACK;
        if (!this.blocked) {
          this.sender.ack();
          this.sender.next();
          this.senderStatus = SENDER_STATUS_NEXT;
        }
        return;
      }

      // The execution can be manually paused or issue a M0 command to pause
      // * M0, M1 Program Pause
      // * M2, M30 Program End
      // * M6 Tool Change
      if ((this.workflow.state === WORKFLOW_STATE_PAUSED) && (received < sent)) {
        if (!hold) {
          log.error('The sender does not hold off during the paused state');
        }
        if (received + 1 >= sent) {
          log.debug(`Stop sending G-code: hold=${hold}, sent=${sent}, received=${received + 1}`);
        }
        const n = _.get(r, 'r.n') || _.get(r, 'n');
        if (n !== sent) {
          log.warn(`Expression: n (${n}) === sent (${sent})`);
        }
        log.silly(`ack: n=${n}, blocked=${this.blocked}, hold=${hold}, sent=${sent}, received=${received}`);
        this.senderStatus = SENDER_STATUS_ACK;
        this.sender.ack();
        this.sender.next();
        this.senderStatus = SENDER_STATUS_NEXT;
        return;
      }

      console.assert(this.workflow.state !== WORKFLOW_STATE_RUNNING, `workflow.state !== '${WORKFLOW_STATE_RUNNING}'`);

      // Feeder
      this.feeder.next();
    });

    this.runner.on('qr', ({ qr }) => {
      log.silly(`planner queue: qr=${qr}, lw=${TINYG_PLANNER_BUFFER_LOW_WATER_MARK}, hw=${TINYG_PLANNER_BUFFER_HIGH_WATER_MARK}`);

      this.state.qr = qr;

      if (qr <= TINYG_PLANNER_BUFFER_LOW_WATER_MARK) {
        this.blocked = true;
        return;
      }

      if (qr >= TINYG_PLANNER_BUFFER_HIGH_WATER_MARK) {
        this.blocked = false;
      }

      if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
        const { hold, sent, received } = this.sender.state;
        log.silly(`sender: status=${this.senderStatus}, hold=${hold}, sent=${sent}, received=${received}`);
        if (this.senderStatus === SENDER_STATUS_NEXT) {
          if (hold && (received >= sent) && (qr >= this.runner.plannerBufferPoolSize)) {
            log.debug(`Continue sending G-code: hold=${hold}, sent=${sent}, received=${received}, qr=${qr}`);
            this.sender.unhold();
            this.sender.next();
            this.senderStatus = SENDER_STATUS_NEXT;
          }
        } else if (this.senderStatus === SENDER_STATUS_ACK) {
          this.sender.ack();
          this.sender.next();
          this.senderStatus = SENDER_STATUS_NEXT;
        }
        return;
      }

      // The execution is manually paused
      if ((this.workflow.state === WORKFLOW_STATE_PAUSED) && (this.senderStatus === SENDER_STATUS_ACK)) {
        const { hold, sent, received } = this.sender.state;
        log.silly(`sender: status=${this.senderStatus}, hold=${hold}, sent=${sent}, received=${received}`);
        if (received >= sent) {
          log.error(`Expression: received (${received}) < sent (${sent})`);
        }
        if (!hold) {
          log.error('The sender does not hold off during the paused state');
        }
        if (received + 1 >= sent) {
          log.debug(`Stop sending G-code: hold=${hold}, sent=${sent}, received=${received + 1}`);
        }
        this.sender.ack();
        this.sender.next();
        this.senderStatus = SENDER_STATUS_NEXT;
        return;
      }

      console.assert(this.workflow.state !== WORKFLOW_STATE_RUNNING, `workflow.state !== '${WORKFLOW_STATE_RUNNING}'`);

      // Feeder
      if (this.feeder.state.hold) {
        const { data } = { ...this.feeder.state.holdReason };
        if ((data === WAIT) && (qr >= this.runner.plannerBufferPoolSize)) {
          this.feeder.unhold();
        }
      }
      this.feeder.next();
    });

    this.runner.on('sr', (sr) => {
    });

    this.runner.on('fb', (fb) => {
    });

    this.runner.on('hp', (hp) => {
    });

    this.runner.on('f', (f) => {
      // https://github.com/synthetos/g2/wiki/Status-Codes
      const statusCode = f[1] || 0;

      if (statusCode !== 0) {
        const code = ensureFiniteNumber(statusCode);
        const err = _.find(TINYG_STATUS_CODES, { code: code }) || {};

        if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
          const ignoreErrors = userStore.get('state.controller.exception.ignoreErrors');
          const pauseError = !ignoreErrors;
          const { lines, received } = this.sender.state;
          const line = lines[received - 1] || '';

          this.emit('connection:read', this.connectionState, `> ${line}`);
          this.emit('connection:read', this.connectionState, JSON.stringify({
            err: {
              code: code,
              msg: err.msg,
              line: received,
              data: line.trim()
            }
          }));

          log.error('Error:', {
            code: code,
            msg: err.msg,
            line: received,
            data: line.trim()
          });

          if (pauseError) {
            this.workflow.pause({ err: true, msg: err.msg });
          }

          return;
        }

        this.emit('connection:read', this.connectionState, JSON.stringify({
          err: {
            code: code,
            msg: err.msg
          }
        }));
      }

      if (this.workflow.state === WORKFLOW_STATE_IDLE) {
        this.feeder.next();
      }
    });

    // Query Timer
    this.timer.query = setInterval(() => {
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

      // TinyG settings
      if (this.settings !== this.runner.settings) {
        this.settings = this.runner.settings;
        this.emit('controller:settings', this.type, this.settings);
        this.emit('TinyG:settings', this.settings); // Backward compatibility
      }

      // TinyG state
      if (this.state !== this.runner.state) {
        this.state = this.runner.state;
        this.emit('controller:state', this.type, this.state);
        this.emit('TinyG:state', this.state); // Backward compatibility
      }

      // Check the ready flag
      if (!(this.ready)) {
        return;
      }

      // Check if the machine has stopped movement after completion
      if (this.actionTime.senderFinishTime > 0) {
        const machineIdle = zeroOffset && this.runner.isIdle();
        const now = new Date().getTime();
        const timespan = Math.abs(now - this.actionTime.senderFinishTime);
        const toleranceTime = 500; // in milliseconds

        if (!machineIdle) {
          // Extend the sender finish time if the controller state is not idle
          this.actionTime.senderFinishTime = now;
        } else if (timespan > toleranceTime) {
          log.silly(`Finished sending G-code: timespan=${timespan}`);

          this.actionTime.senderFinishTime = 0;

          // Stop workflow
          this.command('sender:stop');
        }
      }
    }, 250);
  }

  // https://github.com/synthetos/TinyG/wiki/TinyG-Configuration-for-Firmware-Version-0.97
  async initController() {
    const send = (cmd = '') => {
      if (this.isClose) {
        // Serial port is closed
        return;
      }

      cmd = String(cmd);

      if (cmd.length >= TINYG_SERIAL_BUFFER_LIMIT) {
        log.error(`Exceeded serial buffer limit (${TINYG_SERIAL_BUFFER_LIMIT}): cmd=${cmd}`);
        return;
      }

      log.silly(`init: ${cmd} ${cmd.length}`);
      this.command('gcode', cmd);
    };
    const relaxedJSON = (json) => {
      if (typeof json === 'object') {
        json = JSON.stringify(json);
      }
      return json.replace(/"/g, '').replace(/true/g, 't');
    };

    // Enable JSON mode
    // 0=text mode, 1=JSON mode
    send('{ej:1}');

    // JSON verbosity
    // 0=silent, 1=footer, 2=messages, 3=configs, 4=linenum, 5=verbose
    send('{jv:4}');

    // Queue report verbosity
    // 0=off, 1=filtered, 2=verbose
    send('{qv:1}');

    // Status report verbosity
    // 0=off, 1=filtered, 2=verbose
    send('{sv:1}');

    // Status report interval
    // in milliseconds (50ms minimum interval)
    send('{si:100}');

    // Check whether the spindle and coolant commands are supported
    await delay(100);
    send('{spe:n}');
    await delay(100);
    send('{spd:n}');
    await delay(100);
    send('{spc:n}');
    await delay(100);
    send('{sps:n}');
    await delay(100);
    send('{com:n}');
    await delay(100);
    send('{cof:n}');

    // Wait for a certain amount of time before setting status report fields
    await delay(200);

    // Settings Status Report Fields
    // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Reports#setting-status-report-fields
    // Note: The JSON string is minified to make sure the length won't exceed the serial buffer limit
    send(relaxedJSON({
      // Returns an object composed of the picked properties
      sr: _.pickBy(this.sr, (value, key) => {
        return !!value;
      })
    }));

    // Request system settings
    send('{sys:n}');

    // Request motor timeout
    send('{mt:n}');

    // Request motor states
    send('{pwr:n}');

    // Request queue report
    send('{qr:n}');

    // Request status report
    send('{sr:n}');

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
        path: modal.path,
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
    this.actionTime.senderFinishTime = 0;
  }

  destroy() {
    if (this.timer.query) {
      clearInterval(this.timer.query);
      this.timer.query = null;
    }

    if (this.runner) {
      this.runner.removeAllListeners();
      this.runner = null;
    }

    this.sockets = {};

    if (this.connection) {
      this.connection = null;
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
        this.command('unload');
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
      socket.emit('TinyG:settings', this.settings); // Backward compatibility
    }

    // Controller state
    if (!_.isEmpty(this.state)) {
      socket.emit('controller:state', this.type, this.state);
      socket.emit('TinyG:state', this.state); // Backward compatibility
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

  // https://github.com/synthetos/g2/wiki/Job-Exception-Handling
  // Character    Operation       Description
  // !            Feedhold        Start a feedhold. Ignored if already in a feedhold
  // ~            End Feedhold    Resume from feedhold. Ignored if not in feedhold
  // %            Queue Flush     Flush remaining moves during feedhold. Ignored if not in feedhold
  // ^d           Kill Job        Trigger ALARM to kill current job. Send {clear:n}, M2 or M30 to end ALARM state
  // ^x           Reset Board     Perform hardware reset to restart the board
  command(cmd, ...args) {
    const deprecatedHandler = this.deprecatedCommandHandler[cmd];
    if (deprecatedHandler) {
      log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
      deprecatedHandler();
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
    this.connection.write(data);
    log.silly(`> ${data}`);
  }

  writeln(data, context) {
    this.write(data + '\n', context);
  }
}

export default TinyGController;
