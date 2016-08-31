import fs from 'fs';
import * as parser from 'gcode-parser';
import _ from 'lodash';
import SerialPort from 'serialport';
import settings from '../../config/settings';
import log from '../../lib/log';
import Feeder from '../../lib/feeder';
import GCodeSender from '../../lib/gcode-sender';
import store from '../../store';
import Grbl from './Grbl';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import {
    GRBL,
    GRBL_REALTIME_COMMANDS
} from './constants';

const dbg = (...args) => {
    log.raw.apply(log, ['silly'].concat(args));
};

const loadConfigFile = (file) => {
    let config;
    try {
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        log.error(`[Grbl] Failed to load "${file}": err=${err}`);
        config = {};
    }
    return config;
};

class Connection {
    socket = null;
    sentCommand = '';

    constructor(socket) {
        this.socket = socket;
    }
}

class GrblController {
    type = GRBL;

    // Connections
    connections = [];

    // SerialPort
    options = {
        port: '',
        baudrate: 115200
    };
    serialport = null;

    // Grbl
    grbl = null;
    ready = false;
    state = {};
    queryTimer = null;
    queryResponse = {
        status: false,
        parserstate: false,
        parserstateEnd: false
    };

    // Feeder
    feeder = null;
    feederQueueSize = 0;

    // Sender
    sender = null;

    // Workflow state
    workflowState = WORKFLOW_STATE_IDLE;

    constructor(port, options) {
        const { baudrate } = { ...options };

        this.options = {
            ...this.options,
            port: port,
            baudrate: baudrate
        };

        // Feeder
        this.feeder = new Feeder();
        this.feeder.on('data', ({ socket, line }) => {
            if (this.isClose()) {
                log.error(`[Grbl] The serial port "${this.options.port}" is not accessible`);
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

            const data = line + '\n';
            this.serialport.write(data);

            dbg(`[Grbl] > ${line}`);
        });

        // Sender
        this.sender = new GCodeSender();
        this.sender.on('progress', (res) => {
            if (this.isClose()) {
                log.error(`[Grbl] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            let { gcode = '' } = { ...res };
            gcode = ('' + gcode).trim();
            if (gcode.length > 0) {
                this.serialport.write(gcode + '\n');
            }
        });

        // Grbl
        this.grbl = new Grbl(this.serialport);

        this.grbl.on('raw', (res) => {});

        this.grbl.on('status', (res) => {
            this.queryResponse.status = false;

            this.connections.forEach((c) => {
                if (c.sentCommand.indexOf('?') === 0) {
                    c.sentCommand = '';
                    c.socket.emit('serialport:read', res.raw);
                }
            });
        });

        this.grbl.on('ok', (res) => {
            if (this.queryResponse.parserstateEnd) {
                this.connections.forEach((c) => {
                    if (c.sentCommand.indexOf('$G') === 0) {
                        c.sentCommand = '';
                        c.socket.emit('serialport:read', res.raw);
                    }
                });
                this.queryResponse.parserstateEnd = false;
                return;
            }

            // Feeder
            this.feeder.next();

            // Sender
            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                this.sender.next();
                return;
            }

            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('error', (res) => {
            // Feeder
            this.feeder.next();

            // Sender
            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                const length = this.sender.sent.length;
                if (length > 0) {
                    const lastDataSent = this.sender.sent[length - 1];
                    const msg = '> (' + length + ') ' + lastDataSent;
                    this.emitAll('serialport:read', msg);
                }

                this.sender.next();
            }

            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('alarm', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('parserstate', (res) => {
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = true; // wait for ok response

            this.connections.forEach((c) => {
                if (c.sentCommand.indexOf('$G') === 0) {
                    c.socket.emit('serialport:read', res.raw);
                }
            });
        });

        this.grbl.on('parameters', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('feedback', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('settings', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('startup', (res) => {
            this.ready = true;
            this.queryResponse.status = false;
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = false;

            this.emitAll('serialport:read', res.raw);
        });

        this.grbl.on('others', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        // SerialPort
        this.serialport = new SerialPort(this.options.port, {
            autoOpen: false,
            baudrate: this.options.baudrate,
            parser: SerialPort.parsers.readline('\n')
        });

        this.serialport.on('data', (data) => {
            this.grbl.parse('' + data);
            dbg(`[Grbl] < ${data}`);
        });

        this.serialport.on('disconnect', (err) => {
            if (err) {
                log.warn(`[Grbl] Disconnected from serial port "${port}":`, err);
            }

            this.close();
        });

        this.serialport.on('error', (err) => {
            if (err) {
                log.error(`[Grbl] Unexpected error while reading/writing serial port "${port}":`, err);
            }
        });

        // Timer
        this.queryTimer = setInterval(() => {
            if (this.isClose()) {
                // Serial port is closed
                return;
            }

            if (!(this.ready)) {
                // Not ready yet
                return;
            }

            if (this.feederQueueSize !== this.feeder.queue.length) {
                this.feederQueueSize = this.feeder.queue.length;
                this.emitAll('Feeder:state', {
                    queueSize: this.feederQueueSize;
                });
            }

            if (this.state !== this.grbl.state) {
                this.state = this.grbl.state;
                this.emitAll('Grbl:state', this.state);
            }

            // ? - Current Status
            if (!(this.queryResponse.status)) {
                this.queryResponse.status = true;
                this.serialport.write('?');
            }

            // $G - Parser State
            if (!(this.queryResponse.parserstate) && !(this.queryResponse.parserstateEnd)) {
                this.queryResponse.parserstate = true;
                this.queryResponse.parserstateEnd = false;
                this.serialport.write('$G\n');
            }

            // Detect for any G-code status changes
            if (this.sender.peek()) {
                this.emitAll('gcode:statuschange', {
                    'remain': this.sender.remain.length,
                    'sent': this.sender.sent.length,
                    'total': this.sender.total,
                    'createdTime': this.sender.createdTime,
                    'startedTime': this.sender.startedTime,
                    'finishedTime': this.sender.finishedTime
                });
            }
        }, 250);
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

        if (this.grbl) {
            this.grbl.removeAllListeners();
            this.grbl = null;
        }
    }
    initController() {
        // Reset Grbl
        this.command(null, 'reset');
    }
    get status() {
        return {
            port: this.options.port,
            baudrate: this.options.baudrate,
            connections: _.size(this.connections),
            ready: this.ready,
            controller: {
                type: this.type,
                state: this.state
            },
            workflowState: this.workflowState,
            feeder: {
                size: this.feeder.size(),
            },
            gcode: {
                name: this.sender.name,
                size: this.sender.gcode.length,
                remain: this.sender.remain.length,
                sent: this.sender.sent.length,
                total: this.sender.total,
                createdTime: this.sender.createdTime,
                startedTime: this.sender.startedTime,
                finishedTime: this.sender.finishedTime
            }
        };
    }
    reset() {
        this.ready = false;
        this.workflowState = WORKFLOW_STATE_IDLE;
        this.queryResponse.status = false;
        this.queryResponse.parserstate = false;
        this.queryResponse.parserstateEnd = false;
    }
    open() {
        const { port, baudrate } = this.options;

        // Assertion check
        if (this.isOpen()) {
            log.error(`[Grbl] Cannot open serial port "${port}"`);
            return;
        }

        this.serialport.open((err) => {
            if (err) {
                log.error(`[Grbl] Error opening serial port "${port}":`, err);
                this.emitAll('serialport:error', { port: port });
                return;
            }

            if (store.get('controllers["' + port + '"]')) {
                log.error(`[Grbl] Serial port "${port}" was not properly closed`);
            }

            store.set('controllers["' + port + '"]', this);

            this.emitAll('serialport:open', {
                port: port,
                baudrate: baudrate,
                controllerType: this.type,
                inuse: true
            });

            log.debug(`[Grbl] Connected to serial port "${port}"`);

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
            log.error(`[Grbl] The serial port "${port}" was already closed`);
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
                log.error(`[Grbl] Error closing serial port "${port}":`, err);
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
            // Send current state to the connected client
            socket.emit('Grbl:state', this.state);
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
    command(socket, cmd, ...args) {
        const handler = {
            'load': () => {
                const [name, gcode, callback] = args;

                this.sender.load(name, gcode, (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    log.debug(`[Grbl] Load G-code: name="${this.sender.name}", size=${this.sender.gcode.length}, total=${this.sender.total}`);

                    this.workflowState = WORKFLOW_STATE_IDLE;
                    callback();
                });
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
            },
            'pause': () => {
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.workflowState = WORKFLOW_STATE_PAUSED;
                }

                this.write(socket, '!');
            },
            'resume': () => {
                this.write(socket, '~');

                if (this.workflowState === WORKFLOW_STATE_PAUSED) {
                    this.workflowState = WORKFLOW_STATE_RUNNING;
                    this.sender.next();
                }
            },
            'feedhold': () => {
                if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                    this.workflowState = WORKFLOW_STATE_PAUSED;
                }

                this.write(socket, '!');
            },
            'cyclestart': () => {
                this.write(socket, '~');

                if (this.workflowState === WORKFLOW_STATE_PAUSED) {
                    this.workflowState = WORKFLOW_STATE_RUNNING;
                    this.sender.next();
                }
            },
            'reset': () => {
                this.write(socket, '\x18'); // ^x
            },
            'unlock': () => {
                this.writeln(socket, '$X');
            },
            'homing': () => {
                this.writeln(socket, '$H');
            },
            'check': () => {
                this.writeln(socket, '$C');
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
            'macro': () => {
                const config = loadConfigFile(settings.cncrc);
                const [id] = args;
                const macro = _.find(config.macros, { id: id });

                if (!macro) {
                    log.error(`[Grbl] Cannot find the macro: id=${id}`);
                    return;
                }

                parser.parseString(macro.content, (err, lines) => {
                    if (err) {
                        log.error(`[Grbl] Cannot parse macro content: id=${id}, err=${err}`);
                        return;
                    }

                    const data = lines.map(({ line }) => {
                        return {
                            socket: socket,
                            line: line
                        };
                    });

                    this.feeder.feed(data);

                    if (!this.feeder.isPending()) {
                        this.feeder.next();
                    }
                });
            },
            'emergency-stop': () => {
                this.feeder.clear();
                this.command(socket, 'stop');
            }
        }[cmd];

        if (!handler) {
            log.error(`[Grbl] Unknown command: ${cmd}`);
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
        dbg(`[Grbl] > ${data}`);
    }
    writeln(socket, data) {
        if (_.includes(GRBL_REALTIME_COMMANDS, data)) {
            this.write(socket, data);
        } else {
            this.write(socket, data + '\n');
        }
    }
}

export default GrblController;
