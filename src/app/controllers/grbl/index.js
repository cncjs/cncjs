import _ from 'lodash';
import SerialPort from 'serialport';
import log from '../../lib/log';
import GCodeSender from '../../lib/gcode-sender';
import Grbl from './grbl';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from './constants';

const PREFIX = '[Grbl]';

const noop = () => {};

class Connection {
    socket = null;
    sentCommand = '';

    constructor(socket) {
        this.socket = socket;
    }
}

class GrblController {
    // Connections
    connections = [];

    // SerialPort
    options = {
        port: '',
        baudrate: 115200
    };
    serialport = null;

    // Grbl
    ready = false;
    grbl = null;
    state = {};
    queryTimer = null;
    queryResponse = {
        status: false,
        parserstate: false,
        parserstateEnd: false
    };

    // G-code sender
    sender = null;

    // Workflow state
    workflowState = WORKFLOW_STATE_IDLE;

    constructor(port, baudrate) {
        this.options = _.merge({}, this.options, { port: port, baudrate: baudrate });

        // SerialPort
        this.serialport = new SerialPort(this.options.port, {
            autoOpen: false,
            baudrate: this.options.baudrate,
            parser: SerialPort.parsers.readline('\n')
        });

        // GCodeSender
        this.sender = new GCodeSender();
        this.sender.on('progress', (res) => {
            if (this.isClose()) {
                log.error(`${PREFIX} Serial port "${this.options.port}" not accessible`);
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
                c.socket.emit('grbl:status', res);

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

            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                this.sender.next();
                return;
            }

            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('error', (res) => {
            if (this.workflowState === WORKFLOW_STATE_RUNNING) {
                const length = this.sender.sent.length;
                if (length > 0) {
                    const lastDataSent = this.sender.sent[length - 1];
                    const msg = '> (' + length + ') ' + lastDataSent;
                    this.connections.forEach((c) => {
                        c.socket.emit('serialport:read', msg);
                    });
                }

                this.sender.next();
            }

            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('alarm', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('parserstate', (res) => {
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = true; // wait for ok response

            this.connections.forEach((c) => {
                c.socket.emit('grbl:parserstate', res);

                if (c.sentCommand.indexOf('$G') === 0) {
                    c.socket.emit('serialport:read', res.raw);
                }
            });
        });

        this.grbl.on('parameters', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('feedback', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('settings', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('startup', (res) => {
            this.ready = true;
            this.queryResponse.status = false;
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = false;

            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('others', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.queryTimer = setInterval(() => {
            if (this.isClose()) {
                // Serial port is closed
                return;
            }

            if (!(this.ready)) {
                // The Grbl is not ready yet
                return;
            }

            if (this.state !== this.grbl.state) {
                this.state = this.grbl.state;
                this.connections.forEach((c) => {
                    c.socket.emit('grbl:state', this.state);
                });
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
                this.connections.forEach((c) => {
                    c.socket.emit('gcode:statuschange', {
                        'remain': this.sender.remain.length,
                        'sent': this.sender.sent.length,
                        'total': this.sender.total,
                        'createdTime': this.sender.createdTime,
                        'startedTime': this.sender.startedTime,
                        'finishedTime': this.sender.finishedTime
                    });
                });
            }
        }, 250);
    }
    destroy() {
        if (this.queryTimer) {
            clearInterval(this.queryTimer);
            this.queryTimer = null;
        }

        if (this.grbl) {
            this.grbl.removeAllListeners();
            this.grbl = null;
        }
    }
    init(callback = noop) {
        // Reset Grbl while opening serial port
        this.command(null, 'reset');

        callback();
    }
    get status() {
        return {
            port: this.options.port,
            baudrate: this.options.baudrate,
            connections: _.size(this.connections),
            ready: this.ready,
            controller: {
                type: 'Grbl',
                state: this.state
            },
            workflowState: this.workflowState,
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
    open(callback = noop) {
        const { port } = this.options;

        // Assertion check
        if (this.isOpen()) {
            callback(new Error('Cannot open serial port ' + port));
            return;
        }

        this.serialport.open((err) => {
            if (err) {
                callback(err);
                return;
            }

            this.serialport.on('data', (data) => {
                this.grbl.parse('' + data);
                log.raw('silly', _.trimEnd('Grbl> ' + data));
            });

            this.serialport.on('disconnect', (err) => {
                log.warn(`${PREFIX} Disconnected from serial port "${port}": err=${JSON.stringify(err)}`);
                this.destroy();
            });

            this.serialport.on('error', (err) => {
                log.error(`${PREFIX} Unexpected error while reading/writing serial port "${port}": err=${JSON.stringify(err)}`);
                this.destroy();
            });

            log.debug(`${PREFIX} Connected to serial port "${port}"`);

            // Reset
            this.reset();

            // Unload G-code
            this.command(null, 'unload');

            // Initialize the controller
            this.init(callback);
        });
    }
    close(callback = noop) {
        const { port } = this.options;

        // Assertion check
        if (this.isClose()) {
            callback(new Error('Cannot close serial port ' + port));
            return;
        }

        // Reset Grbl while closing serial port
        this.command(null, 'reset');

        this.serialport.close((err) => {
            this.destroy();
            callback(err);
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
            socket.emit('grbl:state', this.state);
        }
    }
    removeConnection(socket) {
        const index = _.findIndex(this.connections, (c) => {
            return c.socket === socket;
        });
        this.connections.splice(index, 1);
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

                    log.debug(`${PREFIX} Load G-code: name="${this.sender.name}", size=${this.sender.gcode.length}, total=${this.sender.total}`);

                    this.workflowState = WORKFLOW_STATE_IDLE;
                    callback();
                });
            },
            'unload': () => {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.sender.unload();
            },
            'start': () => {
                this.workflowState = WORKFLOW_STATE_RUNNING;
                this.sender.next();
            },
            'stop': () => {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.sender.rewind();
            },
            'pause': () => {
                this.workflowState = WORKFLOW_STATE_PAUSED;
                this.write(socket, '!');
            },
            'resume': () => {
                this.write(socket, '~');
                this.workflowState = WORKFLOW_STATE_RUNNING;
                this.sender.next();
            },
            'feedhold': () => {
                this.write(socket, '!');
            },
            'cyclestart': () => {
                this.write(socket, '~');
            },
            'reset': () => {
                this.write(socket, '\x18');
            },
            'homing': () => {
                this.writeln(socket, '$H');
            },
            'unlock': () => {
                this.writeln(socket, '$X');
            }
        }[cmd];

        if (!handler) {
            log.error(`${PREFIX} Unknown command: ${cmd}`);
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
        log.raw('silly', _.trimEnd('Grbl> ' + data));
    }
    writeln(socket, data) {
        this.write(socket, data + '\n');
    }
}

export default GrblController;
