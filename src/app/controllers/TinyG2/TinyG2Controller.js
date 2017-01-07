import _ from 'lodash';
import SerialPort from 'serialport';
import log from '../../lib/log';
import Feeder from '../../lib/feeder';
import Sender, { STREAMING_PROTOCOL_SEND_RESPONSE } from '../../lib/gcode-sender';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import store from '../../store';
import TinyG2 from './TinyG2';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import {
    TINYG2,
    TINYG2_PLANNER_BUFFER_POOL_SIZE,
    TINYG2_PLANNER_BUFFER_LOW_WATER_MARK,
    TINYG2_PLANNER_QUEUE_STATUS_READY,
    TINYG2_PLANNER_QUEUE_STATUS_RUNNING,
    TINYG2_PLANNER_QUEUE_STATUS_BLOCKED
} from './constants';

const noop = () => {};

const dbg = (...args) => {
    log.raw.apply(log, ['silly'].concat(args));
};

class Connection {
    socket = null;
    sentCommand = '';

    constructor(socket) {
        this.socket = socket;
    }
}

class TinyG2Controller {
    type = TINYG2;

    // Connections
    connections = [];

    // SerialPort
    options = {
        port: '',
        baudrate: 115200
    };
    serialport = null;

    // TinyG2
    tinyG2 = null;
    ready = false;
    state = {};
    queryTimer = null;

    // Feeder
    feeder = null;

    // Sender
    sender = null;

    // Workflow state
    workflowState = WORKFLOW_STATE_IDLE;
    plannerQueueStatus = TINYG2_PLANNER_QUEUE_STATUS_READY;

    constructor(port, options) {
        const { baudrate } = { ...options };

        this.options = {
            ...this.options,
            port: port,
            baudrate: baudrate
        };

        // Feeder
        this.feeder = new Feeder();
        this.feeder.on('data', ({ socket = null, line }) => {
            if (this.isClose()) {
                log.error(`[TinyG2] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            line = ('' + line).trim();
            if (line.length === 0) {
                return;
            }

            socket && socket.emit('serialport:write', line);
            const index = _.findIndex(this.connections, (c) => {
                return c.socket === socket;
            });
            if (index >= 0) {
                this.connections[index].sentCommand = line;
            }

            const data = JSON.stringify({ gc: line }) + '\n';
            this.serialport.write(data);

            dbg(`[TinyG2] > ${line}`);
        });

        // Sender
        this.sender = new Sender(STREAMING_PROTOCOL_SEND_RESPONSE);
        this.sender.on('gcode', (gcode = '') => {
            if (this.isClose()) {
                log.error(`[TinyG2] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.workflowState !== WORKFLOW_STATE_RUNNING) {
                log.error(`[TinyG2] Unexpected workflow state: ${this.workflowState}`);
                return;
            }

            gcode = ('' + gcode).trim();
            if (gcode.length > 0) {
                const cmd = JSON.stringify({ gc: gcode });
                this.serialport.write(cmd + '\n');
                dbg(`[TinyG2] > ${cmd}`);
            }
        });

        // TinyG2
        this.tinyG2 = new TinyG2();

        this.tinyG2.on('raw', (res) => {
            if (this.workflowState === WORKFLOW_STATE_IDLE) {
                this.emitAll('serialport:read', res.raw);
            }
        });

        this.tinyG2.on('qr', ({ qr, qi, qo }) => {
            const prevPlannerQueueStatus = this.plannerQueueStatus;

            this.state.qr = qr;
            this.state.qi = qi;
            this.state.qo = qo;

            if (qr <= TINYG2_PLANNER_BUFFER_LOW_WATER_MARK) {
                this.plannerQueueStatus = TINYG2_PLANNER_QUEUE_STATUS_BLOCKED;
                return;
            }

            if (qr >= TINYG2_PLANNER_BUFFER_POOL_SIZE) {
                this.plannerQueueStatus = TINYG2_PLANNER_QUEUE_STATUS_READY;
            } else {
                this.plannerQueueStatus = TINYG2_PLANNER_QUEUE_STATUS_RUNNING;
            }

            if (prevPlannerQueueStatus === TINYG2_PLANNER_QUEUE_STATUS_BLOCKED) {
                // Sender
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.sender.ack();
                    this.sender.next();
                    return;
                }

                // Feeder
                this.feeder.next();
            }
        });

        this.tinyG2.on('sr', (sr) => {
        });

        this.tinyG2.on('fb', (fb) => {
        });

        this.tinyG2.on('hp', (hp) => {
        });

        this.tinyG2.on('f', (f) => {
            // https://github.com/synthetos/g2/wiki/Status-Codes
            const statusCode = f[1] || 0;
            const prevPlannerQueueStatus = this.plannerQueueStatus;

            if ((this.workflowState !== WORKFLOW_STATE_IDLE) && (statusCode !== 0)) {
                const line = this.sender.sent[this.sender.received];
                this.emitAll('serialport:read', `> ${line}`);
                this.emitAll('serialport:read', `error=${statusCode}, line=${this.sender.received + 1}`);
            }

            if (prevPlannerQueueStatus !== TINYG2_PLANNER_QUEUE_STATUS_BLOCKED) {
                // Sender
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.sender.ack();
                    this.sender.next();
                    return;
                }

                // Feeder
                this.feeder.next();
            }
        });

        // SerialPort
        this.serialport = new SerialPort(this.options.port, {
            autoOpen: false,
            baudrate: this.options.baudrate,
            parser: SerialPort.parsers.readline('\n')
        });

        this.serialport.on('data', (data) => {
            this.tinyG2.parse('' + data);
            dbg(`[TinyG2] < ${data}`);
        });

        this.serialport.on('disconnect', (err) => {
            if (err) {
                log.warn(`[TinyG2] Disconnected from serial port "${port}":`, err);
            }

            this.close();
        });

        this.serialport.on('error', (err) => {
            if (err) {
                log.error(`[TinyG2] Unexpected error while reading/writing serial port "${port}":`, err);
            }
        });

        // Timer
        this.queryTimer = setInterval(() => {
            if (this.isClose()) {
                // Serial port is closed
                return;
            }

            // Feeder
            if (this.feeder.peek()) {
                this.emitAll('feeder:status', {
                    'size': this.feeder.queue.length
                });
            }

            // Sender
            if (this.sender.peek()) {
                this.emitAll('sender:status', this.sender.state);
            }

            // TinyG2 state
            if (this.state !== this.tinyG2.state) {
                this.state = this.tinyG2.state;
                this.emitAll('TinyG2:state', this.state);
            }
        }, 250);
    }
    // https://github.com/synthetos/TinyG/wiki/TinyG-Configuration-for-Firmware-Version-0.97
    initController() {
        const cmds = [
            { pauseAfter: 1000 },

            // Enable JSON mode
            // 0=text mode, 1=JSON mode
            { cmd: '{"ej":1}', pauseAfter: 50 },

            // JSON verbosity
            // 0=silent, 1=footer, 2=messages, 3=configs, 4=linenum, 5=verbose
            { cmd: '{"jv":4}', pauseAfter: 50 },

            // JSON syntax
            // 0=relaxed, 1=strict
            { cmd: '{"js":1}', pauseAfter: 50 },

            // Enable CR on TX
            // 0=send LF line termination on TX, 1=send both LF and CR termination
            { cmd: '{"ec":0}', pauseAfter: 50 },

            // Queue report verbosity
            // 0=off, 1=filtered, 2=verbose
            { cmd: '{"qv":2}', pauseAfter: 50 },

            // Status report verbosity
            // 0=off, 1=filtered, 2=verbose
            { cmd: '{"sv":1}', pauseAfter: 50 },

            // Status report interval
            // in milliseconds (50ms minimum interval)
            { cmd: '{"si":250}', pauseAfter: 50 },

            // Setting Status Report Fields
            // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Reports#setting-status-report-fields
            {
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
                        mpox: true,
                        mpoy: true,
                        mpoz: true
                    }
                }),
                pauseAfter: 50
            },

            // Hardware Platform
            { cmd: '{"hp":null}' },

            // Firmware Build
            { cmd: '{"fb":null}' },

            // Motor Timeout
            { cmd: '{"mt":null}' },

            // Request queue report
            { cmd: '{"qr":null}' },

            // Request status report
            { cmd: '{"sr":null}' },

            // Help
            { cmd: '?', pauseAfter: 250 }
        ];

        const sendInitCommands = (i = 0) => {
            if (i >= cmds.length) {
                this.ready = true;
                return;
            }
            const { cmd = '', pauseAfter = 0 } = { ...cmds[i] };
            if (cmd) {
                this.emitAll('serialport:write', cmd);
                this.serialport.write(cmd + '\n');
                dbg(`[TinyG2] > ${cmd}`);
            }
            setTimeout(() => {
                sendInitCommands(i + 1);
            }, pauseAfter);
        };
        sendInitCommands();
    }
    destroy() {
        if (this.feeder) {
            this.feeder = null;
        }

        if (this.sender) {
            this.sender = null;
        }

        if (this.queryTimer) {
            clearInterval(this.queryTimer);
            this.queryTimer = null;
        }

        if (this.tinyG2) {
            this.tinyG2.removeAllListeners();
            this.tinyG2 = null;
        }
    }
    get status() {
        return {
            port: this.options.port,
            baudrate: this.options.baudrate,
            connections: _.size(this.connections),
            ready: this.ready,
            controller: {
                type: this.type,
                state: this.state,
                footer: this.tinyG2.footer
            },
            workflowState: this.workflowState,
            feeder: this.feeder.state,
            sender: this.sender.state
        };
    }
    reset() {
        this.ready = false;
        this.workflowState = WORKFLOW_STATE_IDLE;
    }
    open() {
        const { port, baudrate } = this.options;

        // Assertion check
        if (this.isOpen()) {
            log.error(`[TinyG2] Cannot open serial port "${port}"`);
            return;
        }

        this.serialport.open((err) => {
            if (err) {
                log.error(`[TinyG2] Error opening serial port "${port}":`, err);
                this.emitAll('serialport:error', { port: port });
                return;
            }

            if (store.get('controllers["' + port + '"]')) {
                log.error(`[TinyG2] Serial port "${port}" was not properly closed`);
            }

            store.set('controllers["' + port + '"]', this);

            this.emitAll('serialport:open', {
                port: port,
                baudrate: baudrate,
                controllerType: this.type,
                inuse: true
            });

            log.debug(`[TinyG2] Connected to serial port "${port}"`);

            // Reset
            this.reset();

            // Unload G-code
            this.command(null, 'unload');

            // Initialize controller
            this.initController();
        });
    }
    close() {
        const { port } = this.options;

        // Assertion check
        if (this.isClose()) {
            log.error(`[TinyG2] The serial port "${port}" was already closed`);
            return;
        }

        this.emitAll('serialport:close', {
            port: port,
            inuse: false
        });
        store.unset('controllers["' + port + '"]');

        this.destroy();

        this.serialport.close((err) => {
            if (err) {
                log.error(`[TinyG2] Error closing serial port "${port}":`, err);
            }
        });
    }
    isOpen() {
        return this.serialport.isOpen();
    }
    isClose() {
        return !(this.isOpen());
    }
    addConnection(socket) {
        this.connections.push(new Connection(socket));

        if (!_.isEmpty(this.state)) {
            // Send TinyG2 state to a newly connected client
            socket.emit('TinyG2:state', this.state);
        }

        if (this.sender) {
            // Send sender status to a newly connected client
            socket.emit('sender:status', this.sender.state);
        }
    }
    removeConnection(socket) {
        const index = _.findIndex(this.connections, (c) => {
            return c.socket === socket;
        });
        this.connections.splice(index, 1);
    }
    emitAll(eventName, ...args) {
        this.connections.forEach((c) => {
            c.socket.emit.apply(c.socket, [eventName].concat(args));
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
            'load': () => {
                const [name, gcode, callback = noop] = args;

                const ok = this.sender.load(name, gcode);
                if (!ok) {
                    callback(new Error(`Invalid G-code: name=${name}`));
                    return;
                }

                log.debug(`[TinyG2] Load G-code: name="${this.sender.name}", size=${this.sender.gcode.length}, total=${this.sender.total}`);

                this.workflowState = WORKFLOW_STATE_IDLE;
                callback(null, { name: name, gcode: gcode });
            },
            'unload': () => {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.sender.unload();
            },
            'start': () => {
                // Feeder
                this.feeder.clear(); // make sure feeder queue is empty

                // Sender
                this.workflowState = WORKFLOW_STATE_RUNNING;
                this.sender.next();
            },
            'stop': () => {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.sender.rewind();

                this.writeln(socket, '!%'); // feedhold and queue flush

                setTimeout(() => {
                    this.writeln(socket, '{clear:null}');
                    this.writeln(socket, '{"qr":""}'); // queue report
                }, 250); // delay 250ms
            },
            'pause': () => {
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.workflowState = WORKFLOW_STATE_PAUSED;
                }

                this.writeln(socket, '!'); // feedhold
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'resume': () => {
                this.writeln(socket, '~'); // cycle start
                this.writeln(socket, '{"qr":""}'); // queue report

                if (this.workflowState === WORKFLOW_STATE_PAUSED) {
                    this.workflowState = WORKFLOW_STATE_RUNNING;
                    this.sender.next();
                }
            },
            'feedhold': () => {
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.workflowState = WORKFLOW_STATE_PAUSED;
                }

                this.writeln(socket, '!'); // feedhold
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'cyclestart': () => {
                this.writeln(socket, '~'); // cycle start
                this.writeln(socket, '{"qr":""}'); // queue report

                // Sender
                if (this.workflowState === WORKFLOW_STATE_PAUSED) {
                    this.workflowState = WORKFLOW_STATE_RUNNING;
                    this.sender.next();
                    return;
                }

                // Feeder
                this.feeder.next();
            },
            'queueflush': () => {
                this.writeln(socket, '!%'); // queue flush
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'killjob': () => {
                this.writeln(socket, '\x04'); // ^d
            },
            'reset': () => {
                if (this.workflowState !== WORKFLOW_STATE_IDLE) {
                    this.workflowState = WORKFLOW_STATE_IDLE;
                    this.sender.rewind(); // rewind sender queue
                }

                this.writeln(socket, '\x18'); // ^x
            },
            'unlock': () => {
                this.writeln(socket, '{clear:null}');
            },
            'homing': () => {
                this.writeln(socket, '{home:1}');
            },
            'gcode': () => {
                const line = args.join(' ');

                this.feeder.feed({
                    socket: socket,
                    line: line
                });

                if (!this.feeder.isPending()) {
                    this.feeder.next();
                }
            },
            'loadmacro': () => {
                const [id, callback = noop] = args;
                const macros = config.get('macros');
                const macro = _.find(macros, { id: id });

                if (!macro) {
                    log.error(`[TinyG2] Cannot find the macro: id=${id}`);
                    return;
                }

                this.command(null, 'load', macro.name, macro.content, callback);
            },
            'loadfile': () => {
                const [file, callback = noop] = args;

                monitor.readFile(file, (err, data) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    this.command(null, 'load', file, data, callback);
                });
            }
        }[cmd];

        if (!handler) {
            log.error(`[TinyG2] Unknown command: ${cmd}`);
            return;
        }

        handler();
    }
    write(socket, data) {
        socket && socket.emit('serialport:write', data);
        const index = _.findIndex(this.connections, (c) => {
            return c.socket === socket;
        });
        if (index >= 0) {
            this.connections[index].sentCommand = data;
        }
        this.serialport.write(data);
        dbg(`[TinyG2] > ${data}`);
    }
    writeln(socket, data) {
        this.write(socket, data + '\n');
    }
}

export default TinyG2Controller;
