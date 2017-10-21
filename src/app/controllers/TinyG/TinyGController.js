import _ from 'lodash';
import * as parser from 'gcode-parser';
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
import ensureArray from '../../lib/ensure-array';
import ensurePositiveNumber from '../../lib/ensure-positive-number';
import evaluateExpression from '../../lib/evaluateExpression';
import logger from '../../lib/logger';
import translateWithContext from '../../lib/translateWithContext';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import taskRunner from '../../services/taskrunner';
import controllers from '../../store/controllers';
import TinyG from './TinyG';
import {
    TINYG,
    TINYG_PLANNER_BUFFER_LOW_WATER_MARK,
    TINYG_PLANNER_BUFFER_HIGH_WATER_MARK,
    TINYG_SERIAL_BUFFER_LIMIT,
    TINYG_STATUS_CODES
} from './constants';

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
            this.controller.parse('' + data);
        },
        close: (err) => {
            this.ready = false;
            if (err) {
                log.error(`The connection was closed unexpectedly: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
                log.error(err);
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
                log.error(`An unexpected error occurred: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
                log.error(err);
            }
        }
    };

    // TinyG
    tinyg = null;
    ready = false;
    state = {};
    settings = {};
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

    // Workflow
    workflow = null;

    get connectionOptions() {
        return {
            ident: this.connection.ident,
            type: this.connection.type,
            settings: this.connection.settings
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
            connection: {
                type: _.get(this.connection, 'type', ''),
                settings: _.get(this.connection, 'settings', {})
            },
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

    constructor(engine, connectionType = 'serial', options) {
        if (!engine) {
            throw new TypeError(`"engine" must be specified: ${engine}`);
        }

        if (!_.includes(['serial', 'socket'], connectionType)) {
            throw new TypeError(`"connectionType" is invalid: ${connectionType}`);
        }

        // Engine
        this.engine = engine;

        // Connection
        if (connectionType === 'serial') {
            this.connection = new SerialConnection(options);
        } else if (connectionType === 'socket') {
            this.connection = new SocketConnection(options);
        }

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
                context = this.populateContext(context);

                const data = parser.parseLine(line, { flatten: true });
                const words = ensureArray(data.words);

                if (line[0] === '%') {
                    // Remove characters after ";"
                    const re = new RegExp(/\s*;.*/g);
                    line = line.replace(re, '');

                    // %wait
                    if (line === WAIT) {
                        log.debug('Wait for the planner queue to empty');
                        return `G4 P0.5 (${WAIT})`; // dwell
                    }

                    // Expression
                    // %_x=posx,_y=posy,_z=posz
                    evaluateExpression(line.slice(1), context);
                    return '';
                }

                { // Program Mode: M0, M1, M2, M30
                    const programMode = _.intersection(words, ['M0', 'M1', 'M2', 'M30'])[0];
                    if (programMode === 'M0') {
                        log.debug('M0 Program Pause');
                        this.feeder.hold({ data: 'M0' }); // Hold reason
                    } else if (programMode === 'M1') {
                        log.debug('M1 Program Pause');
                        this.feeder.hold({ data: 'M1' }); // Hold reason
                    } else if (programMode === 'M2') {
                        log.debug('M2 Program End');
                        this.feeder.hold({ data: 'M2' }); // Hold reason
                    } else if (programMode === 'M30') {
                        log.debug('M30 Program End');
                        this.feeder.hold({ data: 'M30' }); // Hold reason
                    }
                }

                // M6 Tool Change
                if (words.includes('M6')) {
                    log.debug('M6 Tool Change');
                    this.feeder.hold({ data: 'M6' }); // Hold reason
                }

                // line="G0 X[posx - 8] Y[ymax]"
                // > "G0 X2 Y50"
                return translateWithContext(line, context);
            }
        });
        this.feeder.on('data', (line = '', context = {}) => {
            if (this.isClose) {
                log.error(`Unable to write data to the connection: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
                return;
            }

            if (this.controller.isAlarm()) {
                this.feeder.reset();
                log.warn('Stopped sending G-code commands in Alarm mode');
                return;
            }

            line = String(line).trim();
            if (line.length === 0) {
                return;
            }

            this.emit('connection:write', this.connectionOptions, line + '\n', context);

            this.connection.write(line + '\n');
            log.silly(`> ${line}`);
        });
        this.feeder.on('hold', noop);
        this.feeder.on('unhold', noop);

        // Sender
        this.sender = new Sender(SP_TYPE_SEND_RESPONSE, {
            dataFilter: (line, context) => {
                context = this.populateContext(context);

                const data = parser.parseLine(line, { flatten: true });
                const words = ensureArray(data.words);
                const { sent, received } = this.sender.state;

                if (line[0] === '%') {
                    // Remove characters after ";"
                    const re = new RegExp(/\s*;.*/g);
                    line = line.replace(re, '');

                    // %wait
                    if (line === WAIT) {
                        log.debug(`Wait for the planner queue to empty: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.sender.hold({ data: WAIT }); // Hold reason
                        return `G4 P0.5 (${WAIT})`; // dwell
                    }

                    // Expression
                    // %_x=posx,_y=posy,_z=posz
                    evaluateExpression(line.slice(1), context);
                    return '';
                }

                { // Program Mode: M0, M1, M2, M30
                    const programMode = _.intersection(words, ['M0', 'M1', 'M2', 'M30'])[0];
                    if (programMode === 'M0') {
                        log.debug(`M0 Program Pause: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.workflow.pause({ data: 'M0' });
                    } else if (programMode === 'M1') {
                        log.debug(`M1 Program Pause: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.workflow.pause({ data: 'M1' });
                    } else if (programMode === 'M2') {
                        log.debug(`M2 Program End: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.workflow.pause({ data: 'M2' });
                    } else if (programMode === 'M30') {
                        log.debug(`M30 Program End: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.workflow.pause({ data: 'M30' });
                    }
                }

                // M6 Tool Change
                if (words.includes('M6')) {
                    log.debug(`M6 Tool Change: line=${sent + 1}, sent=${sent}, received=${received}`);
                    this.workflow.pause({ data: 'M6' });
                }

                // line="G0 X[posx - 8] Y[ymax]"
                // > "G0 X2 Y50"
                return translateWithContext(line, context);
            }
        });
        this.sender.on('data', (line = '', context = {}) => {
            if (this.isClose) {
                log.error(`Unable to write data to the connection: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
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
        this.controller = new TinyG();

        this.controller.on('raw', (res) => {
            if (this.workflow.state === WORKFLOW_STATE_IDLE) {
                this.emit('connection:read', this.connectionOptions, res.raw);
            }
        });

        // https://github.com/synthetos/g2/wiki/g2core-Communications
        this.controller.on('r', (r) => {
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

        this.controller.on('qr', ({ qr }) => {
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
                    if (hold && (received >= sent) && (qr >= this.controller.plannerBufferPoolSize)) {
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
            this.feeder.next();
        });

        this.controller.on('sr', (sr) => {
        });

        this.controller.on('fb', (fb) => {
        });

        this.controller.on('hp', (hp) => {
        });

        this.controller.on('f', (f) => {
            // https://github.com/synthetos/g2/wiki/Status-Codes
            const statusCode = f[1] || 0;

            if (statusCode !== 0) {
                const code = Number(statusCode);
                const err = _.find(TINYG_STATUS_CODES, { code: code }) || {};

                if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                    const { lines, received } = this.sender.state;
                    const line = lines[received - 1] || '';

                    this.emit('connection:read', this.connectionOptions, `> ${line}`);
                    this.emit('connection:read', this.connectionOptions, JSON.stringify({
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

                    this.workflow.pause({ err: err.msg });

                    return;
                }

                this.emit('connection:read', this.connectionOptions, JSON.stringify({
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
                this.controller.getWorkPosition(this.state),
                this.controller.getWorkPosition(this.controller.state)
            );

            // TinyG settings
            if (this.settings !== this.controller.settings) {
                this.settings = this.controller.settings;
                this.emit('controller:settings', this.type, this.settings);
                this.emit('TinyG:settings', this.settings); // Backward compatibility
            }

            // TinyG state
            if (this.state !== this.controller.state) {
                this.state = this.controller.state;
                this.emit('controller:state', this.type, this.state);
                this.emit('TinyG:state', this.state); // Backward compatibility
            }

            // Check the ready flag
            if (!(this.ready)) {
                // Wait for the bootloader to complete before sending commands
                return;
            }

            // Check if the machine has stopped movement after completion
            if (this.actionTime.senderFinishTime > 0) {
                const machineIdle = zeroOffset && this.controller.isIdle();
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
    initController() {
        const cmds = [
            // Wait for the bootloader to complete before sending commands
            { pauseAfter: 1000 },

            // Enable JSON mode
            // 0=text mode, 1=JSON mode
            { cmd: '{ej:1}', pauseAfter: 50 },

            // JSON verbosity
            // 0=silent, 1=footer, 2=messages, 3=configs, 4=linenum, 5=verbose
            { cmd: '{jv:4}', pauseAfter: 50 },

            // Queue report verbosity
            // 0=off, 1=filtered, 2=verbose
            { cmd: '{qv:1}', pauseAfter: 50 },

            // Status report verbosity
            // 0=off, 1=filtered, 2=verbose
            { cmd: '{sv:1}', pauseAfter: 50 },

            // Status report interval
            // in milliseconds (50ms minimum interval)
            { cmd: '{si:100}', pauseAfter: 50 },

            // Setting Status Report Fields
            // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Reports#setting-status-report-fields
            {
                // Minify the cmd string to ensure it won't exceed the serial buffer limit
                cmd: JSON.stringify({
                    sr: {
                        line: true,
                        vel: true,
                        feed: true,
                        stat: true,
                        cycs: true,
                        mots: true,
                        hold: true,
                        momo: true,
                        coor: true,
                        plan: true,
                        unit: true,
                        dist: true,
                        frmo: true,
                        path: true,
                        spe: true, // Spindle enable (edge-082.10)
                        spd: true, // Spindle direction (edge-082.10)
                        sps: true, // Spindle speed (edge-082.10)
                        cof: true, // Flood coolant (edge-082.10)
                        com: true, // Mist coolant (edge-082.10)
                        posx: true,
                        posy: true,
                        posz: true,
                        posa: true,
                        mpox: true,
                        mpoy: true,
                        mpoz: true,
                        mpoa: true
                    }
                }).replace(/"/g, '').replace(/true/g, 't'),
                pauseAfter: 50
            },

            // System settings
            { cmd: '{sys:n}' },

            // Request motor timeout
            { cmd: '{mt:n}' },

            // Request motor states
            { cmd: '{pwr:n}' },

            // Request queue report
            { cmd: '{qr:n}' },

            // Request status report
            { cmd: '{sr:n}' }
        ];

        const sendInitCommands = (i = 0) => {
            if (this.isClose) {
                return;
            }

            if (i >= cmds.length) {
                // Set the ready flag to true after sending initialization commands
                this.ready = true;
                return;
            }

            const { cmd = '', pauseAfter = 0 } = { ...cmds[i] };
            if (cmd) {
                if (cmd.length >= TINYG_SERIAL_BUFFER_LIMIT) {
                    log.error(`Exceeded serial buffer limit (${TINYG_SERIAL_BUFFER_LIMIT}): cmd=${cmd}`);
                    return;
                }

                log.silly(`init: ${cmd} ${cmd.length}`);

                const context = {};
                this.emit('connection:write', this.connectionOptions, cmd, context);
                this.connection.write(cmd + '\n');
            }
            setTimeout(() => {
                sendInitCommands(i + 1);
            }, pauseAfter);
        };
        sendInitCommands();
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
        } = this.controller.getMachinePosition();

        // Work position
        const {
            x: posx,
            y: posy,
            z: posz,
            a: posa,
            b: posb,
            c: posc
        } = this.controller.getWorkPosition();

        // Modal state
        const modal = this.controller.getModalState();

        return Object.assign(context || {}, {
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
            // Modal state
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
                coolant: ensureArray(modal.coolant).join('\n')
            }
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

        if (this.controller) {
            this.controller.removeAllListeners();
            this.controller = null;
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
            log.error(`Cannot open connection: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
            return;
        }

        this.connection.on('data', this.connectionEventListener.data);
        this.connection.on('close', this.connectionEventListener.close);
        this.connection.on('error', this.connectionEventListener.error);

        this.connection.open(err => {
            if (err) {
                log.error(`Cannot open connection: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
                log.error(err);
                this.emit('connection:error', this.connectionOptions, err);
                callback && callback(err);
                return;
            }

            this.emit('connection:open', this.connectionOptions);

            // Emit a change event to all connected sockets
            if (this.engine.io) {
                this.engine.io.emit('connection:change', this.connectionOptions, true);
            }

            callback && callback();

            log.debug(`Connection established: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);

            this.workflow.stop();

            // Clear action values
            this.clearActionValues();

            if (this.sender.state.gcode) {
                // Unload G-code
                this.command('unload');
            }

            // Initialize controller
            this.initController();
        });
    }
    close(callback) {
        // Stop status query
        this.ready = false;

        this.emit('connection:close', this.connectionOptions);

        // Emit a change event to all connected sockets
        if (this.engine.io) {
            this.engine.io.emit('connection:change', this.connectionOptions, false);
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
            socket.emit('connection:open', this.connectionOptions);
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

            const { name, gcode, context } = this.sender.state;
            if (gcode) {
                socket.emit('sender:load', name, gcode, context);
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
        const handler = {
            'sender:load': () => {
                let [name, gcode, context = {}, callback = noop] = args;
                if (typeof context === 'function') {
                    callback = context;
                    context = {};
                }

                // G4 P0 or P with a very small value will empty the planner queue and then
                // respond with an ok when the dwell is complete. At that instant, there will
                // be no queued motions, as long as no more commands were sent after the G4.
                // This is the fastest way to do it without having to check the status reports.
                const dwell = '%wait ; Wait for the planner queue to empty';
                const ok = this.sender.load(name, gcode + '\n' + dwell, context);
                if (!ok) {
                    callback(new Error(`Invalid G-code: name=${name}`));
                    return;
                }

                this.emit('sender:load', name, gcode, context);
                this.event.trigger('sender:load');

                log.debug(`Load G-code: name="${this.sender.state.name}", size=${this.sender.state.gcode.length}, total=${this.sender.state.total}`);

                this.workflow.stop();

                callback(null, this.sender.toJSON());
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
            'sender:stop': () => {
                this.event.trigger('sender:stop');

                this.workflow.stop();

                this.writeln('!%'); // feedhold and queue flush

                setTimeout(() => {
                    this.writeln('{clear:null}');
                    this.writeln('{"qr":""}'); // queue report
                }, 250); // delay 250ms
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
                this.writeln('{clear:null}');
            },
            'reset': () => {
                this.workflow.stop();

                this.feeder.reset();

                this.write('\x18'); // ^x
            },
            // Feed Overrides
            // @param {number} value A percentage value between 5 and 200. A value of zero will reset to 100%.
            'override:feed': () => {
                const [value] = args;
                let mfo = this.controller.settings.mfo;

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
            'override:spindle': () => {
                const [value] = args;
                let sso = this.controller.settings.sso;

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
            'override:rapid': () => {
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
            'motor:enable': () => {
                let [mt = this.state.mt] = args;
                mt = Number(mt) || 0;

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
            'motor:timeout': () => {
                let [mt] = args;
                mt = Number(mt) || 0;

                if (mt >= 0) {
                    this.command('gcode', `{mt:${mt}}`);
                }
            },
            'lasertest': () => {
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

                this.command('sender:load', macro.name, macro.content, context, callback);
            },
            'watchdir:load': () => {
                const [file, callback = noop] = args;
                const context = {}; // empty context

                monitor.readFile(file, (err, data) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    this.command('sender:load', file, data, context, callback);
                });
            }
        }[cmd];

        if (!handler) {
            log.error(`Unknown command: ${cmd}`);
            return;
        }

        handler();
    }
    write(data, context) {
        // Assertion check
        if (this.isClose) {
            log.error(`Unable to write data to the connection: type=${this.connection.type}, settings=${JSON.stringify(this.connection.settings)}`);
            return;
        }

        this.emit('connection:write', this.connectionOptions, data, context);
        this.connection.write(data);
        log.silly(`> ${data}`);
    }
    writeln(data, context) {
        this.write(data + '\n', context);
    }
}

export default TinyGController;
