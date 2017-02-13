import _ from 'lodash';
import SerialPort from 'serialport';
import log from '../../lib/log';
import Feeder from '../../lib/feeder';
import Sender, { SP_TYPE_CHAR_COUNTING } from '../../lib/sender';
import Workflow, {
    WORKFLOW_STATE_RUNNING
} from '../../lib/workflow';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import store from '../../store';
import Grbl from './Grbl';
import {
    GRBL,
    GRBL_ACTIVE_STATE_RUN,
    GRBL_REALTIME_COMMANDS,
    GRBL_ALARMS,
    GRBL_ERRORS,
    GRBL_SETTINGS
} from './constants';

const noop = _.noop;

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

    // Sender
    sender = null;

    // Workflow
    workflow = null;

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
                log.error(`[Grbl] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            line = ('' + line).trim();
            if (line.length === 0) {
                return;
            }

            if (socket) {
                socket.emit('serialport:write', line);
                const index = _.findIndex(this.connections, (c) => {
                    return c.socket === socket;
                });
                if (index >= 0) {
                    this.connections[index].sentCommand = line;
                }
            } else {
                this.emitAll('serialport:write', line);
            }

            const data = line + '\n';
            this.serialport.write(data);
            dbg(`[Grbl] > ${line}`);
        });

        // Sender
        this.sender = new Sender(SP_TYPE_CHAR_COUNTING, {
            // Consider periodic commands ('$G\n', '?') to make sure the buffer doesn't overflow
            bufferSize: (128 - 4) // The default buffer size is 128 bytes
        });
        this.sender.on('data', (gcode = '') => {
            if (this.isClose()) {
                log.error(`[Grbl] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
                log.error(`[Grbl] Unexpected workflow state: ${this.workflow.state}`);
                return;
            }

            gcode = ('' + gcode).trim();
            if (gcode.length > 0) {
                this.serialport.write(gcode + '\n');
                dbg(`[Grbl] > ${gcode}`);
            }
        });

        // Workflow
        this.workflow = new Workflow();
        this.workflow.on('start', () => {
            this.sender.rewind();
        });
        this.workflow.on('stop', () => {
            this.sender.rewind();
        });
        this.workflow.on('resume', () => {
            this.sender.next();
        });

        // Grbl
        this.grbl = new Grbl();

        this.grbl.on('raw', noop);

        this.grbl.on('status', (res) => {
            this.queryResponse.status = false;

            // Detect the buffer size if Grbl is set to report the rx buffer (#115)
            if (res && res.buf && res.buf.rx) {
                const rx = Number(res.buf.rx) || 0;
                // Consider periodic commands ('$G\n', '?') to make sure the buffer doesn't overflow
                const bufferSize = (rx - 4);
                if (bufferSize > this.sender.sp.bufferSize) {
                    this.sender.sp.bufferSize = bufferSize;
                }
            }

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

            // Sender
            if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                this.sender.ack();
                this.sender.next();
                return;
            }

            this.emitAll('serialport:read', res.raw);

            // Feeder
            this.feeder.next();
        });

        this.grbl.on('error', (res) => {
            const code = Number(res.message) || undefined;
            const error = _.find(GRBL_ERRORS, { code: code });

            // Sender
            if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                const { lines, received } = this.sender.state;
                const line = lines[received] || '';

                this.emitAll('serialport:read', `> ${line.trim()} (line=${received + 1})`);
                if (error) {
                    // Grbl v1.1
                    this.emitAll('serialport:read', `error:${code} (${error.description})`);
                } else {
                    // Grbl v0.9
                    this.emitAll('serialport:read', res.raw);
                }

                this.sender.ack();
                this.sender.next();
                return;
            }

            if (error) {
                // Grbl v1.1
                this.emitAll('serialport:read', `error:${code} (${error.description})`);
            } else {
                // Grbl v0.9
                this.emitAll('serialport:read', res.raw);
            }

            // Feeder
            this.feeder.next();
        });

        this.grbl.on('alarm', (res) => {
            const code = Number(res.message) || undefined;
            const alarm = _.find(GRBL_ALARMS, { code: code });

            if (alarm) {
                // Grbl v1.1
                this.emitAll('serialport:read', `ALARM:${code} (${alarm.description})`);
            } else {
                // Grbl v0.9
                this.emitAll('serialport:read', res.raw);
            }
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
            const setting = _.find(GRBL_SETTINGS, { setting: res.setting });

            if (!res.description && setting) {
                // Grbl v1.1
                this.emitAll('serialport:read', `${res.setting}=${res.value} (${setting.description}, ${setting.units})`);
            } else {
                // Grbl v0.9
                this.emitAll('serialport:read', res.raw);
            }
        });

        this.grbl.on('startup', (res) => {
            this.emitAll('serialport:read', res.raw);

            // The start up message always prints upon startup, after a reset, or at program end.
            // Reset the following values when Grbl has completed re-initializing all systems.
            this.queryResponse.status = false;
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = false;
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
            this.ready = false;
            if (err) {
                log.warn(`[Grbl] Disconnected from serial port "${port}":`, err);
            }

            this.close();
        });

        this.serialport.on('error', (err) => {
            this.ready = false;
            if (err) {
                log.error(`[Grbl] Unexpected error while reading/writing serial port "${port}":`, err);
            }
        });

        // Timer
        const queryCurrentStatus = () => {
            this.queryResponse.status = true;
            this.serialport.write('?');
        };
        const queryParserState = _.throttle(() => {
            this.queryResponse.parserstate = true;
            this.queryResponse.parserstateEnd = false;
            this.serialport.write('$G\n');
        }, 500);
        this.queryTimer = setInterval(() => {
            if (this.isClose()) {
                // Serial port is closed
                return;
            }

            // Feeder
            if (this.feeder.peek()) {
                this.emitAll('feeder:status', this.feeder.toJSON());
            }

            // Sender
            if (this.sender.peek()) {
                this.emitAll('sender:status', this.sender.toJSON());
            }

            // Grbl state
            if (this.state !== this.grbl.state) {
                this.state = this.grbl.state;
                this.emitAll('Grbl:state', this.state);
            }

            // Do not send "?" and "$G" when Grbl is not ready
            if (!(this.ready)) {
                // Not ready yet
                return;
            }

            // ? - Current Status
            if (!(this.queryResponse.status)) {
                queryCurrentStatus();
            }

            // $G - Parser State
            if (!(this.queryResponse.parserstate) && !(this.queryResponse.parserstateEnd)) {
                queryParserState();
            }
        }, 250);
    }
    destroy() {
        if (this.workflow) {
            this.workflow = null;
        }

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
        const cmds = [
            { pauseAfter: 500 }
        ];

        const sendInitCommands = (i = 0) => {
            if (i >= cmds.length) {
                this.ready = true;
                return;
            }
            const { cmd = '', pauseAfter = 0 } = { ...cmds[i] };
            if (cmd) {
                this.serialport.write(cmd + '\n');
                dbg(`[Grbl] > ${cmd}`);
            }
            setTimeout(() => {
                sendInitCommands(i + 1);
            }, pauseAfter);
        };
        sendInitCommands();
    }
    get status() {
        return {
            port: this.options.port,
            baudrate: this.options.baudrate,
            connections: this.connections.map(c => c.socket.id),
            ready: this.ready,
            controller: {
                type: this.type,
                state: this.state
            },
            workflowState: this.workflow.state,
            feeder: this.feeder.toJSON(),
            sender: this.sender.toJSON()
        };
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

            this.workflow.stop();

            // Reset query response
            this.queryResponse.status = false;
            this.queryResponse.parserstate = false;
            this.queryResponse.parserstateEnd = false;

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
            this.ready = false;
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
        log.debug(`[Grbl] Add socket connection: id=${socket.id}`);

        this.connections.push(new Connection(socket));

        if (!_.isEmpty(this.state)) {
            // Send controller state to a newly connected client
            socket.emit('Grbl:state', this.state);
        }

        if (this.sender) {
            // Send sender status to a newly connected client
            socket.emit('sender:status', this.sender.toJSON());
        }
    }
    removeConnection(socket) {
        log.debug(`[Grbl] Remove socket connection: id=${socket.id}`);

        this.connections = this.connections.filter(c => (c.socket.id !== socket.id));
    }
    emitAll(eventName, ...args) {
        this.connections.forEach((c) => {
            c.socket.emit.apply(c.socket, [eventName].concat(args));
        });
    }
    command(socket, cmd, ...args) {
        const handler = {
            'load': () => {
                const [name, gcode, callback = noop] = args;

                const ok = this.sender.load(name, gcode);
                if (!ok) {
                    callback(new Error(`Invalid G-code: name=${name}`));
                    return;
                }

                log.debug(`[Grbl] Load G-code: name="${this.sender.state.name}", size=${this.sender.state.gcode.length}, total=${this.sender.state.total}`);

                this.workflow.stop();

                callback(null, { name: name, gcode: gcode });
            },
            'unload': () => {
                this.workflow.stop();

                // Sender
                this.sender.unload();
            },
            'start': () => {
                this.workflow.start();

                // Feeder
                this.feeder.clear();

                // Sender
                this.sender.next();
            },
            'stop': () => {
                this.workflow.stop();

                const activeState = _.get(this.state, 'status.activeState', '');
                let delay = 0;
                if (activeState === GRBL_ACTIVE_STATE_RUN) {
                    this.write(socket, '!'); // hold
                    delay = 50; // 50ms delay
                }

                setTimeout(() => {
                    this.write(socket, '\x18'); // ctrl-x
                }, delay);
            },
            'pause': () => {
                this.workflow.pause();

                this.write(socket, '!');
            },
            'resume': () => {
                this.write(socket, '~');

                this.workflow.resume();
            },
            'feedhold': () => {
                this.workflow.pause();

                this.write(socket, '!');
            },
            'cyclestart': () => {
                this.write(socket, '~');

                this.workflow.resume();
            },
            'check': () => {
                this.writeln(socket, '$C');
            },
            'homing': () => {
                this.writeln(socket, '$H');
            },
            'sleep': () => {
                this.writeln(socket, '$SLP');
            },
            'unlock': () => {
                this.writeln(socket, '$X');
            },
            'reset': () => {
                this.workflow.stop();

                this.write(socket, '\x18'); // ^x
            },
            'feedOverride': () => {
                const [value] = args;

                if (value === 0) {
                    this.write(socket, '\x90');
                } else if (value === 10) {
                    this.write(socket, '\x91');
                } else if (value === -10) {
                    this.write(socket, '\x92');
                } else if (value === 1) {
                    this.write(socket, '\x93');
                } else if (value === -1) {
                    this.write(socket, '\x94');
                }
            },
            'spindleOverride': () => {
                const [value] = args;

                if (value === 0) {
                    this.write(socket, '\x99');
                } else if (value === 10) {
                    this.write(socket, '\x9a');
                } else if (value === -10) {
                    this.write(socket, '\x9b');
                } else if (value === 1) {
                    this.write(socket, '\x9c');
                } else if (value === -1) {
                    this.write(socket, '\x9d');
                }
            },
            'rapidOverride': () => {
                const [value] = args;

                if (value === 0 || value === 100) {
                    this.write(socket, '\x95');
                } else if (value === 50) {
                    this.write(socket, '\x96');
                } else if (value === 25) {
                    this.write(socket, '\x97');
                }
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
                    log.error(`[Grbl] Cannot find the macro: id=${id}`);
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
            log.error(`[Grbl] Unknown command: ${cmd}`);
            return;
        }

        handler();
    }
    write(socket, data) {
        if (socket) {
            socket.emit('serialport:write', data);
            const index = _.findIndex(this.connections, (c) => {
                return c.socket === socket;
            });
            if (index >= 0) {
                this.connections[index].sentCommand = data;
            }
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
