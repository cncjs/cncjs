import _ from 'lodash';
import SerialPort from 'serialport';
import EventTrigger from '../../lib/EventTrigger';
import Feeder from '../../lib/Feeder';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/Sender';
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
import store from '../../store';
import TinyG from './TinyG';
import {
    TINYG,
    TINYG_PLANNER_BUFFER_LOW_WATER_MARK,
    TINYG_PLANNER_BUFFER_HIGH_WATER_MARK,
    TINYG_SERIAL_BUFFER_LIMIT,
    TINYG_STATUS_CODES
} from './constants';

const SEND_RESPONSE_STATE_NONE = 0;
const SEND_RESPONSE_STATE_SEND = 1;
const SEND_RESPONSE_STATE_ACK = 2;

// % commands
const WAIT = '%wait';

const log = logger('controller:TinyG');
const noop = () => {};

class TinyGController {
    type = TINYG;

    // CNCEngine
    engine = null;

    // Connections
    connections = {};

    // SerialPort
    options = {
        port: '',
        baudrate: 115200
    };
    serialport = null;
    serialportListener = {
        data: (data) => {
            log.silly(`< ${data}`);
            this.controller.parse('' + data);
        },
        disconnect: (err) => {
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
    timer = {
        query: null,
        energizeMotors: null
    };
    energizeMotorsTimer = null;
    blocked = false;
    sendResponseState = SEND_RESPONSE_STATE_NONE;
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

    // Workflow
    workflow = null;

    // Do not remove text inside the parentheses (#210) for g2core.
    // https://github.com/synthetos/g2/wiki/Mcodes
    // M-code | Parameter           | Command
    // +----- | +------------------ | +----------------------------------------
    // M100   | active comment ({}) | Run active comment in sync with motion
    // M100.1 | active comment ({}) | Run active comment as soon as it's parsed
    // M101   | active comment ({}) | Delay motion in this point in the program
    //        |                     | until the active comment evaluates true
    stripComment = (() => {
        // Strip comment that follows a semicolon
        const re = new RegExp(/\s*;.*/g);
        return (line) => String(line).replace(re, '');
    })();

    dataFilter = (line, context) => {
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

        // The context contains the bounding box, machine position, and work position
        Object.assign(context || {}, {
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
            posc: Number(posc) || 0
        });

        // Evaluate expression
        if (line[0] === '%') {
            // line="%_x=posx,_y=posy,_z=posz"
            evaluateExpression(line.slice(1), context);
            return '';
        }

        // line="G0 X[posx - 8] Y[ymax]"
        // > "G0 X2 Y50"
        return translateWithContext(line, context);
    };

    constructor(engine, options) {
        if (!engine) {
            throw new Error('engine must be specified');
        }
        this.engine = engine;

        const { port, baudrate } = { ...options };
        this.options = {
            ...this.options,
            port: port,
            baudrate: baudrate
        };

        // Event Trigger
        this.event = new EventTrigger((event, trigger, commands) => {
            log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
            if (trigger === 'system') {
                taskRunner.run(commands);
            } else {
                this.command(null, 'gcode', commands);
            }
        });

        // Feeder
        this.feeder = new Feeder({
            dataFilter: (line, context) => {
                line = this.stripComment(line);

                if (line === WAIT) {
                    return `G4 P0.5 (${WAIT})`; // dwell
                }

                return this.dataFilter(line, context);
            }
        });
        this.feeder.on('data', (line = '', context = {}) => {
            if (this.isClose()) {
                log.error(`Serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.controller.isAlarm()) {
                // Feeder
                this.feeder.clear();
                log.warn('Stopped sending G-code commands in Alarm mode');
                return;
            }

            line = String(line).trim();
            if (line.length === 0) {
                return;
            }

            this.emit('serialport:write', line + '\n', context);

            this.serialport.write(line + '\n');
            log.silly(`> ${line}`);
        });

        // Sender
        this.sender = new Sender(SP_TYPE_SEND_RESPONSE, {
            dataFilter: (line, context) => {
                line = this.stripComment(line);

                if (line === WAIT) {
                    const { sent, received } = this.sender.state;
                    log.debug(`Wait for the planner queue to empty: line=${sent + 1}, sent=${sent}, received=${received}`);

                    this.sender.hold();

                    return `G4 P0.5 (${WAIT})`; // dwell
                }

                return this.dataFilter(line, context);
            }
        });
        this.sender.on('data', (line = '', context = {}) => {
            if (this.isClose()) {
                log.error(`Serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
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

            this.serialport.write(line + '\n');
            log.silly(`> SEND: n=${n}, line="${line}"`);
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
        this.workflow.on('start', () => {
            this.emit('workflow:state', this.workflow.state);
            this.blocked = false;
            this.sendResponseState = SEND_RESPONSE_STATE_NONE;
            this.sender.rewind();
        });
        this.workflow.on('stop', () => {
            this.emit('workflow:state', this.workflow.state);
            this.blocked = false;
            this.sendResponseState = SEND_RESPONSE_STATE_NONE;
            this.sender.rewind();
        });
        this.workflow.on('pause', () => {
            this.emit('workflow:state', this.workflow.state);
        });
        this.workflow.on('resume', () => {
            this.emit('workflow:state', this.workflow.state);
        });

        // TinyG
        this.controller = new TinyG();

        this.controller.on('raw', (res) => {
            if (this.workflow.state === WORKFLOW_STATE_IDLE) {
                this.emit('serialport:read', res.raw);
            }
        });

        // https://github.com/synthetos/g2/wiki/g2core-Communications
        this.controller.on('r', (r) => {
            if (this.workflow.state === WORKFLOW_STATE_IDLE) {
                this.feeder.next();
                return;
            }

            this.sendResponseState = SEND_RESPONSE_STATE_ACK; // ACK received

            const n = _.get(r, 'r.n') || _.get(r, 'n');
            const { sent } = this.sender.state;

            if (n !== sent) {
                log.error(`Assertion failed: n (${n}) is not equal to sent (${sent})`);
            }

            log.silly(`< ACK: n=${n}, sent=${sent}, blocked=${this.blocked}`);

            // Continue to the next line if not blocked
            if (!this.blocked) {
                this.sender.ack();
                this.sender.next();

                this.sendResponseState = SEND_RESPONSE_STATE_SEND; // data sent
            }
        });

        this.controller.on('qr', ({ qr }) => {
            this.state.qr = qr;

            if (this.workflow.state === WORKFLOW_STATE_IDLE) {
                this.feeder.next();
                return;
            }

            if (qr <= TINYG_PLANNER_BUFFER_LOW_WATER_MARK) {
                this.blocked = true;
                return;
            }

            if (qr >= TINYG_PLANNER_BUFFER_HIGH_WATER_MARK) {
                this.blocked = false;
            }

            if (this.sendResponseState === SEND_RESPONSE_STATE_SEND) {
                // Check hold state
                if (this.sender.state.hold) {
                    const { sent, received } = this.sender.state;
                    const plannerBufferPoolSize = this.controller.plannerBufferPoolSize;

                    if ((received >= sent) && (qr >= plannerBufferPoolSize)) {
                        log.debug(`Continue sending G-code: sent=${sent}, received=${received}, qr=${qr}`);
                        log.silly(`> NEXT: qr=${qr}, high=${TINYG_PLANNER_BUFFER_HIGH_WATER_MARK}, low=${TINYG_PLANNER_BUFFER_LOW_WATER_MARK}`);
                        this.sender.unhold();
                        this.sender.next();
                    }
                }
            } else if (this.sendResponseState === SEND_RESPONSE_STATE_ACK) {
                // running
                if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                    log.silly(`> NEXT: qr=${qr}, high=${TINYG_PLANNER_BUFFER_HIGH_WATER_MARK}, low=${TINYG_PLANNER_BUFFER_LOW_WATER_MARK}`);

                    this.sender.ack();
                    this.sender.next();

                    this.sendResponseState = SEND_RESPONSE_STATE_SEND;
                }

                // paused
                if (this.workflow.state === WORKFLOW_STATE_PAUSED) {
                    log.silly(`> HOLD: qr=${qr}, high=${TINYG_PLANNER_BUFFER_HIGH_WATER_MARK}, low=${TINYG_PLANNER_BUFFER_LOW_WATER_MARK}`);
                    const { sent, received } = this.sender.state;
                    if (sent > received) {
                        this.sender.ack();
                    }
                }
            }
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

                if (this.workflow.state !== WORKFLOW_STATE_IDLE) {
                    const { lines, received } = this.sender.state;
                    const line = lines[received] || '';

                    this.emit('serialport:read', `> ${line}`);
                    this.emit('serialport:read', JSON.stringify({
                        err: {
                            code: code,
                            msg: err.msg,
                            line: received + 1,
                            data: line.trim()
                        }
                    }));
                } else {
                    this.emit('serialport:read', JSON.stringify({
                        err: {
                            code: code,
                            msg: err.msg
                        }
                    }));
                }
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
                this.controller.getWorkPosition(this.state),
                this.controller.getWorkPosition(this.controller.state)
            );

            // TinyG settings
            if (this.settings !== this.controller.settings) {
                this.settings = this.controller.settings;
                this.emit('controller:settings', TINYG, this.settings);
                this.emit('TinyG:settings', this.settings); // Backward compatibility
            }

            // TinyG state
            if (this.state !== this.controller.state) {
                this.state = this.controller.state;
                this.emit('controller:state', TINYG, this.state);
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
                    this.command(null, 'gcode:stop');
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
            if (this.isClose()) {
                // Serial port is closed
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

                log.silly(`> INIT: ${cmd} ${cmd.length}`);

                const context = {};
                this.emit('serialport:write', cmd, context);
                this.serialport.write(cmd + '\n');
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
            posc: Number(posc) || 0
        });
    }
    clearActionValues() {
        this.actionTime.energizeMotors = 0;
        this.actionTime.senderFinishTime = 0;
    }
    destroy() {
        this.connections = {};

        if (this.serialport) {
            this.serialport = null;
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

        if (this.timer.query) {
            clearInterval(this.timer.query);
            this.timer.query = null;
        }

        if (this.timer.energizeMotors) {
            clearInterval(this.timer.energizeMotors);
            this.timer.energizeMotors = null;
        }

        if (this.controller) {
            this.controller.removeAllListeners();
            this.controller = null;
        }
    }
    get status() {
        return {
            port: this.options.port,
            baudrate: this.options.baudrate,
            connections: Object.keys(this.connections),
            ready: this.ready,
            controller: {
                type: this.type,
                settings: this.settings,
                state: this.state,
                footer: this.controller.footer
            },
            workflowState: this.workflow.state,
            feeder: this.feeder.toJSON(),
            sender: this.sender.toJSON()
        };
    }
    open(callback = noop) {
        const { port, baudrate } = this.options;

        // Assertion check
        if (this.isOpen()) {
            log.error(`Cannot open serial port "${port}"`);
            return;
        }

        this.serialport = new SerialPort(this.options.port, {
            autoOpen: false,
            baudRate: this.options.baudrate,
            parser: SerialPort.parsers.readline('\n')
        });
        this.serialport.on('data', this.serialportListener.data);
        this.serialport.on('disconnect', this.serialportListener.disconnect);
        this.serialport.on('error', this.serialportListener.error);
        this.serialport.open((err) => {
            if (err) {
                log.error(`Error opening serial port "${port}":`, err);
                this.emit('serialport:error', { port: port });
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
                this.command(null, 'unload');
            }

            // Initialize controller
            this.initController();
        });
    }
    close(callback) {
        const { port } = this.options;

        // Assertion check
        if (!this.serialport) {
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

        this.serialport.removeListener('data', this.serialportListener.data);
        this.serialport.removeListener('disconnect', this.serialportListener.disconnect);
        this.serialport.removeListener('error', this.serialportListener.error);
        this.serialport.close((err) => {
            if (err) {
                log.error(`Error closing serial port "${port}":`, err);
                callback(err);
                return;
            }

            callback(null);
        });
    }
    isOpen() {
        return this.serialport && this.serialport.isOpen();
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
        this.connections[socket.id] = socket;

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
        if (this.workflow) {
            // workflow state
            socket.emit('workflow:state', this.workflow.state);
        }
        if (this.sender) {
            // sender status
            socket.emit('sender:status', this.sender.toJSON());

            const { name, gcode, context } = this.sender.state;
            if (gcode) {
                socket.emit('gcode:load', name, gcode, context);
            }
        }
    }
    removeConnection(socket) {
        if (!socket) {
            log.error('The socket parameter is not specified');
            return;
        }

        log.debug(`Remove socket connection: id=${socket.id}`);
        this.connections[socket.id] = undefined;
        delete this.connections[socket.id];
    }
    emit(eventName, ...args) {
        Object.keys(this.connections).forEach(id => {
            const socket = this.connections[id];
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
    command(socket, cmd, ...args) {
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
                const dwell = '%wait ; Wait for the planner queue to empty';
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
                this.command(socket, 'gcode:start');
            },
            'gcode:start': () => {
                this.event.trigger('gcode:start');

                this.workflow.start();

                // Feeder
                this.feeder.clear();

                // Sender
                this.sender.next();
            },
            'stop': () => {
                log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:stop');
            },
            // @param {object} options The options object.
            // @param {boolean} [options.force] Whether to force stop a G-code program. Defaults to false.
            'gcode:stop': () => {
                this.event.trigger('gcode:stop');

                this.workflow.stop();

                this.writeln('!%'); // feedhold and queue flush

                setTimeout(() => {
                    this.writeln('{clear:null}');
                    this.writeln('{"qr":""}'); // queue report
                }, 250); // delay 250ms
            },
            'pause': () => {
                log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:pause');
            },
            'gcode:pause': () => {
                this.event.trigger('gcode:pause');

                this.workflow.pause();

                this.writeln('!'); // feedhold

                this.writeln('{"qr":""}'); // queue report
            },
            'resume': () => {
                log.warn(`Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:resume');
            },
            'gcode:resume': () => {
                this.event.trigger('gcode:resume');

                this.writeln('~'); // cycle start

                this.workflow.resume();

                this.writeln('{"qr":""}'); // queue report
            },
            'feedhold': () => {
                this.event.trigger('feedhold');

                this.workflow.pause();

                this.writeln('!'); // feedhold

                this.writeln('{"qr":""}'); // queue report
            },
            'cyclestart': () => {
                this.event.trigger('cyclestart');

                this.writeln('~'); // cycle start

                this.workflow.resume();

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
                this.writeln('{clear:null}');
            },
            'reset': () => {
                this.workflow.stop();

                // Feeder
                this.feeder.clear();

                this.write('\x18'); // ^x
            },
            // Feed Overrides
            // @param {number} value A percentage value between 5 and 200. A value of zero will reset to 100%.
            'feedOverride': () => {
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

                this.command(socket, 'gcode', `{mfo:${mfo}}`);
            },
            // Spindle Speed Overrides
            // @param {number} value A percentage value between 5 and 200. A value of zero will reset to 100%.
            'spindleOverride': () => {
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

                this.command(socket, 'gcode', `{sso:${sso}}`);
            },
            // Rapid Overrides
            'rapidOverride': () => {
                const [value] = args;

                if (value === 0 || value === 100) {
                    this.command(socket, 'gcode', '{mto:1}');
                } else if (value === 50) {
                    this.command(socket, 'gcode', '{mto:0.5}');
                } else if (value === 25) {
                    this.command(socket, 'gcode', '{mto:0.25}');
                }
            },
            'energizeMotors:on': () => {
                const { mt = 0 } = this.state;

                if (this.timer.energizeMotors || !mt) {
                    return;
                }

                this.command(socket, 'gcode', '{me:0}');
                this.command(socket, 'gcode', '{pwr:n}');

                // Setup a timer to energize motors up to 30 minutes
                this.timer.energizeMotors = setInterval(() => {
                    const now = new Date().getTime();
                    if (this.actionTime.energizeMotors <= 0) {
                        this.actionTime.energizeMotors = now;
                    }

                    const timespan = Math.abs(now - this.actionTime.energizeMotors);
                    const toleranceTime = 30 * 60 * 1000; // 30 minutes
                    if (timespan > toleranceTime) {
                        this.command(socket, 'energizeMotors:off');
                        return;
                    }

                    this.command(socket, 'gcode', '{me:0}');
                    this.command(socket, 'gcode', '{pwr:n}');
                }, mt * 1000 - 500);
            },
            'energizeMotors:off': () => {
                if (this.timer.energizeMotors) {
                    clearInterval(this.timer.energizeMotors);
                    this.timer.energizeMotors = null;
                }
                this.actionTime.energizeMotors = 0;

                this.command(socket, 'gcode', '{md:0}');
                this.command(socket, 'gcode', '{pwr:n}');
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
                this.command(socket, 'gcode', commands);
            },
            'lasertest:off': () => {
                const commands = [
                    'M5S0'
                ];
                this.command(socket, 'gcode', commands);
            },
            'gcode': () => {
                const [commands, context] = args;
                const data = ensureArray(commands)
                    .join('\n')
                    .split('\n')
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

                this.command(socket, 'gcode', macro.content, context);
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

                this.command(socket, 'gcode:load', macro.name, macro.content, context, callback);
            },
            'watchdir:load': () => {
                const [file, callback = noop] = args;
                const context = {}; // empty context

                monitor.readFile(file, (err, data) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    this.command(socket, 'gcode:load', file, data, context, callback);
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

        this.emit('serialport:write', data, context);
        this.serialport.write(data);
        log.silly(`> ${data}`);
    }
    writeln(data, context) {
        this.write(data + '\n', context);
    }
}

export default TinyGController;
