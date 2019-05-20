import ensureArray from 'ensure-array';
import * as parser from 'gcode-parser';
import _ from 'lodash';
import SerialConnection from '../../lib/SerialConnection';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/Sender';
import Workflow, {
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_RUNNING
} from '../../lib/Workflow';
import delay from '../../lib/delay';
import ensurePositiveNumber from '../../lib/ensure-positive-number';
import { ensureNumber } from '../../lib/ensure-type';
import evaluateAssignmentExpression from '../../lib/evaluate-assignment-expression';
import logger from '../../lib/logger';
import translateExpression from '../../lib/translate-expression';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import taskRunner from '../../services/taskrunner';
import store from '../../store';
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
        query: null,
        energizeMotors: null
    };

    energizeMotorsTimer = null;

    blocked = false;

    senderStatus = SENDER_STATUS_NONE;

    actionTime = {
        energizeMotors: 0,
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

    constructor(engine, options) {
        if (!engine) {
            throw new Error('engine must be specified');
        }
        this.engine = engine;

        const { port, baudrate, rtscts } = { ...options };
        this.options = {
            ...this.options,
            port: port,
            baudrate: baudrate,
            rtscts: rtscts
        };

        // Connection
        this.connection = new SerialConnection({
            path: port,
            baudRate: baudrate,
            rtscts: rtscts,
            writeFilter: (data) => {
                return data;
            }
        });

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
                // Remove comments that start with a semicolon `;`
                // @see https://github.com/synthetos/g2/wiki/JSON-Active-Comments
                line = line.replace(/\s*;.*/g, '').trim();
                context = this.populateContext(context);

                if (line[0] === '%') {
                    // %wait
                    if (line === WAIT) {
                        log.debug('Wait for the planner to empty');
                        this.feeder.hold({ data: WAIT }); // Hold reason
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
                        this.feeder.hold({ data: 'M0' }); // Hold reason
                    } else if (programMode === 'M1') {
                        log.debug('M1 Program Pause');
                        this.feeder.hold({ data: 'M1' }); // Hold reason
                    }
                }

                // M6 Tool Change
                if (_.includes(words, 'M6')) {
                    log.debug('M6 Tool Change');
                    this.feeder.hold({ data: 'M6' }); // Hold reason
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
        this.sender = new Sender(SP_TYPE_SEND_RESPONSE, {
            dataFilter: (line, context) => {
                // Remove comments that start with a semicolon `;`
                // @see https://github.com/synthetos/g2/wiki/JSON-Active-Comments
                line = line.replace(/\s*;.*/g, '').trim();
                context = this.populateContext(context);

                const { sent, received } = this.sender.state;

                if (line[0] === '%') {
                    // %wait
                    if (line === WAIT) {
                        log.debug(`Wait for the planner to empty: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.sender.hold({ data: WAIT }); // Hold reason
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
                        this.workflow.pause({ data: 'M0' });
                    } else if (programMode === 'M1') {
                        log.debug(`M1 Program Pause: line=${sent + 1}, sent=${sent}, received=${received}`);
                        this.workflow.pause({ data: 'M1' });
                    }
                }

                // M6 Tool Change
                if (_.includes(words, 'M6')) {
                    log.debug(`M6 Tool Change: line=${sent + 1}, sent=${sent}, received=${received}`);
                    this.workflow.pause({ data: 'M6' });
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
                this.emit('serialport:read', res.raw);
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
                const code = Number(statusCode);
                const err = _.find(TINYG_STATUS_CODES, { code: code }) || {};

                if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                    const ignoreErrors = config.get('state.controller.exception.ignoreErrors');
                    const pauseError = !ignoreErrors;
                    const { lines, received } = this.sender.state;
                    const line = lines[received - 1] || '';

                    this.emit('serialport:read', `> ${line}`);
                    this.emit('serialport:read', JSON.stringify({
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
                        this.workflow.pause({ err: err.msg });
                    }

                    return;
                }

                this.emit('serialport:read', JSON.stringify({
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

            // TinyG settings
            if (this.settings !== this.runner.settings) {
                this.settings = this.runner.settings;
                this.emit('controller:settings', TINYG, this.settings);
                this.emit('TinyG:settings', this.settings); // Backward compatibility
            }

            // TinyG state
            if (this.state !== this.runner.state) {
                this.state = this.runner.state;
                this.emit('controller:state', TINYG, this.state);
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
                    this.command('gcode:stop');
                }
            }
        }, 250);
    }

    // https://github.com/synthetos/TinyG/wiki/TinyG-Configuration-for-Firmware-Version-0.97
    async initController() {
        const send = (cmd = '') => {
            if (this.isClose()) {
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
                path: modal.path,
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

    clearActionValues() {
        this.actionTime.energizeMotors = 0;
        this.actionTime.senderFinishTime = 0;
    }

    destroy() {
        if (this.timer.query) {
            clearInterval(this.timer.query);
            this.timer.query = null;
        }

        if (this.timer.energizeMotors) {
            clearInterval(this.timer.energizeMotors);
            this.timer.energizeMotors = null;
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
                state: this.state,
                footer: this.runner.footer
            },
            feeder: this.feeder.toJSON(),
            sender: this.sender.toJSON(),
            workflow: {
                state: this.workflow.state
            }
        };
    }

    open(callback = noop) {
        const { port, baudrate } = this.options;

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

            // Wait for the bootloader to complete before sending commands
            await delay(1000);

            // Set ready flag to true
            this.ready = true;

            // Initialize controller
            this.initController();
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
            socket.emit('controller:settings', TINYG, this.settings);
            socket.emit('TinyG:settings', this.settings); // Backward compatibility
        }
        if (!_.isEmpty(this.state)) {
            // controller state
            socket.emit('controller:state', TINYG, this.state);
            socket.emit('TinyG:state', this.state); // Backward compatibility
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

    // https://github.com/synthetos/g2/wiki/Job-Exception-Handling
    // Character    Operation       Description
    // !            Feedhold        Start a feedhold. Ignored if already in a feedhold
    // ~            End Feedhold    Resume from feedhold. Ignored if not in feedhold
    // %            Queue Flush     Flush remaining moves during feedhold. Ignored if not in feedhold
    // ^d           Kill Job        Trigger ALARM to kill current job. Send {clear:n}, M2 or M30 to end ALARM state
    // ^x           Reset Board     Perform hardware reset to restart the board
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

                this.emit('gcode:load', name, gcode, context);
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

                const [options] = args;
                const { force = false } = { ...options };
                if (force) {
                    const firmwareBuild = ensureNumber(_.get(this.settings, 'fb'));

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
            'pause': () => {
                log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command('gcode:pause');
            },
            'gcode:pause': () => {
                this.event.trigger('gcode:pause');

                this.workflow.pause();
                this.writeln('!'); // feedhold
                this.writeln('{"qr":""}'); // queue report
            },
            'resume': () => {
                log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command('gcode:resume');
            },
            'gcode:resume': () => {
                this.event.trigger('gcode:resume');

                this.writeln('~'); // cycle start
                this.workflow.resume();
                this.writeln('{"qr":""}'); // queue report
            },
            'feeder:feed': () => {
                const [commands, context = {}] = args;
                this.command('gcode', commands, context);
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
            'statusreport': () => {
                this.writeln('{"sr":null}');
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
            'feedOverride': () => {
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
            'spindleOverride': () => {
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
            'rapidOverride': () => {
                const [value] = args;

                if (value === 0 || value === 100) {
                    this.command('gcode', '{mto:1}');
                } else if (value === 50) {
                    this.command('gcode', '{mto:0.5}');
                } else if (value === 25) {
                    this.command('gcode', '{mto:0.25}');
                }
            },
            'energizeMotors:on': () => {
                const { mt = 0 } = this.state;

                if (this.timer.energizeMotors || !mt) {
                    return;
                }

                this.command('gcode', '{me:0}');
                this.command('gcode', '{pwr:n}');

                // Setup a timer to energize motors up to 30 minutes
                this.timer.energizeMotors = setInterval(() => {
                    const now = new Date().getTime();
                    if (this.actionTime.energizeMotors <= 0) {
                        this.actionTime.energizeMotors = now;
                    }

                    const timespan = Math.abs(now - this.actionTime.energizeMotors);
                    const toleranceTime = 30 * 60 * 1000; // 30 minutes
                    if (timespan > toleranceTime) {
                        this.command('energizeMotors:off');
                        return;
                    }

                    this.command('gcode', '{me:0}');
                    this.command('gcode', '{pwr:n}');
                }, mt * 1000 - 500);
            },
            'energizeMotors:off': () => {
                if (this.timer.energizeMotors) {
                    clearInterval(this.timer.energizeMotors);
                    this.timer.energizeMotors = null;
                }
                this.actionTime.energizeMotors = 0;

                this.command('gcode', '{md:0}');
                this.command('gcode', '{pwr:n}');
            },
            'lasertest:on': () => {
                const [power = 0, duration = 0, maxS = 1000] = args;
                const commands = [
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
        if (this.isClose()) {
            log.error(`Serial port "${this.options.port}" is not accessible`);
            return;
        }

        this.emit('serialport:write', data, {
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
