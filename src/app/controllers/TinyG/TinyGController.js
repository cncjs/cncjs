import _ from 'lodash';
import SerialPort from 'serialport';
import log from '../../lib/log';
import Feeder from '../../lib/feeder';
import Sender, { SP_TYPE_SEND_RESPONSE } from '../../lib/sender';
import Workflow, {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_IDLE
} from '../../lib/workflow';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import store from '../../store';
import TinyG from './TinyG';
import {
    TINYG,
    TINYG_SERIAL_BUFFER_LIMIT,
    TINYG_LINE_BUFFER_SIZE,
    TINYG_STATUS_CODES
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

class TinyGController {
    type = TINYG;

    // Connections
    connections = [];

    // SerialPort
    options = {
        port: '',
        baudrate: 115200
    };
    serialport = null;

    // TinyG
    tinyg = null;
    ready = false;
    state = {};
    queryTimer = null;

    // Feeder
    feeder = null;

    // Sender
    sender = null;

    // Workflow
    workflow = null;

    lineBufferSize = TINYG_LINE_BUFFER_SIZE;

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
                log.error(`[TinyG] The serial port "${this.options.port}" is not accessible`);
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

            this.serialport.write(line + '\n');

            dbg(`[TinyG] > ${line}`);
        });

        // Sender
        this.sender = new Sender(SP_TYPE_SEND_RESPONSE);
        this.sender.on('data', (gcode = '') => {
            if (this.isClose()) {
                log.error(`[TinyG] The serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
                log.error(`[TinyG] Unexpected workflow state: ${this.workflow.state}`);
                return;
            }

            // Remove blanks to reduce the amount of bandwidth
            gcode = ('' + gcode).replace(/\s+/g, '');

            this.serialport.write(gcode + '\n');
        });

        // Workflow
        this.workflow = new Workflow();
        this.workflow.on('start', () => {
            this.sender.rewind(); // rewind sender queue
        });
        this.workflow.on('stop', () => {
            this.sender.rewind(); // rewind sender queue

            // Reset line buffer size when workflow is stopped
            this.lineBufferSize = TINYG_LINE_BUFFER_SIZE;
        });
        this.workflow.on('resume', () => {
            this.sender.next();
        });

        // TinyG
        this.tinyg = new TinyG();

        this.tinyg.on('raw', (res) => {
            if (this.workflow.state === WORKFLOW_STATE_IDLE) {
                this.emitAll('serialport:read', res.raw);
            }
        });

        this.tinyg.on('r', (r) => {
            // Feeder
            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
                this.feeder.next();
                return;
            }

            // https://github.com/synthetos/g2/issues/209#issuecomment-271121598
            //
            // Simple Line Mode
            //   1) send a line
            //   2) wait for the {r} response
            //   3) go to 1 if there are more lines to send
            //   4) done
            //
            // Complete Line Mode
            //   0) Count how many lines you have to send (IOW, in the gcode file, etc) and
            //      put that in lines_in_file. Set lines_to_send=4
            //   1) while (lines_to_send && lines_in_file) { send_next_line();
            //      lines_to_send--; lines_in_file--; }
            //   2) read lines from serial, counting {r}s. For each {r}, set
            //      lines_to_send++. (Error checking and status report processing goes here.)
            //   3) if lines_in_file > 0 the goto (1)
            //   4) done
            //

            this.lineBufferSize++;
            dbg(`[TinyG] sender.ack(): lineBufferSize=${this.lineBufferSize}`);
            this.sender.ack();

            while (this.lineBufferSize > 0) {
                this.lineBufferSize--;
                dbg(`[TinyG] sender.next(): lineBufferSize=${this.lineBufferSize}`);
                this.sender.next();
            }
        });

        this.tinyg.on('sr', (sr) => {
        });

        this.tinyg.on('fb', (fb) => {
        });

        this.tinyg.on('hp', (hp) => {
        });

        this.tinyg.on('f', (f) => {
            // https://github.com/synthetos/g2/wiki/Status-Codes
            const statusCode = f[1] || 0;

            if (statusCode !== 0) {
                const code = Number(statusCode);
                const err = _.find(TINYG_STATUS_CODES, { code: code }) || {};

                if (this.workflow.state !== WORKFLOW_STATE_IDLE) {
                    const { lines, received } = this.sender.state;
                    const line = lines[received] || '';

                    this.emitAll('serialport:read', `> ${line}`);
                    this.emitAll('serialport:read', JSON.stringify({
                        err: {
                            code: code,
                            msg: err.msg,
                            line: received + 1,
                            data: line.trim()
                        }
                    }));
                } else {
                    this.emitAll('serialport:read', JSON.stringify({
                        err: {
                            code: code,
                            msg: err.msg
                        }
                    }));
                }
            }

            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
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
            this.tinyg.parse('' + data);
            dbg(`[TinyG] < ${data}`);
        });

        this.serialport.on('disconnect', (err) => {
            this.ready = false;
            if (err) {
                log.warn(`[TinyG] Disconnected from serial port "${port}":`, err);
            }

            this.close();
        });

        this.serialport.on('error', (err) => {
            this.ready = false;
            if (err) {
                log.error(`[TinyG] Unexpected error while reading/writing serial port "${port}":`, err);
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
                this.emitAll('feeder:status', this.feeder.toJSON());
            }

            // Sender
            if (this.sender.peek()) {
                this.emitAll('sender:status', this.sender.toJSON());
            }

            // TinyG state
            if (this.state !== this.tinyg.state) {
                this.state = this.tinyg.state;
                this.emitAll('TinyG:state', this.state);
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

            // Hardware Platform
            { cmd: '{"hp":null}' },

            // Firmware Build
            { cmd: '{"fb":null}' },

            // Motor Timeout
            { cmd: '{"mt":null}' },

            // Request queue report
            { cmd: '{"qr":null}' },

            // Request status report
            { cmd: '{"sr":null}' }
        ];

        const sendInitCommands = (i = 0) => {
            if (i >= cmds.length) {
                this.ready = true;
                return;
            }
            const { cmd = '', pauseAfter = 0 } = { ...cmds[i] };
            if (cmd) {
                if (cmd.length >= TINYG_SERIAL_BUFFER_LIMIT) {
                    log.error(`[TinyG] Exceeded serial buffer limit (${TINYG_SERIAL_BUFFER_LIMIT}): cmd=${cmd}`);
                    return;
                }

                dbg(`[TinyG] > Init: ${cmd} ${cmd.length}`);
                this.emitAll('serialport:write', cmd);
                this.serialport.write(cmd + '\n');
            }
            setTimeout(() => {
                sendInitCommands(i + 1);
            }, pauseAfter);
        };
        sendInitCommands();
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

        if (this.tinyg) {
            this.tinyg.removeAllListeners();
            this.tinyg = null;
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
                footer: this.tinyg.footer
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
            log.error(`[TinyG] Cannot open serial port "${port}"`);
            return;
        }

        this.serialport.open((err) => {
            if (err) {
                log.error(`[TinyG] Error opening serial port "${port}":`, err);
                this.emitAll('serialport:error', { port: port });
                return;
            }

            if (store.get('controllers["' + port + '"]')) {
                log.error(`[TinyG] Serial port "${port}" was not properly closed`);
            }

            store.set('controllers["' + port + '"]', this);

            this.emitAll('serialport:open', {
                port: port,
                baudrate: baudrate,
                controllerType: this.type,
                inuse: true
            });

            log.debug(`[TinyG] Connected to serial port "${port}"`);

            this.workflow.stop();

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
            log.error(`[TinyG] The serial port "${port}" was already closed`);
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
                log.error(`[TinyG] Error closing serial port "${port}":`, err);
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
            // Send controller state to a newly connected client
            socket.emit('TinyG:state', this.state);
        }

        if (this.sender) {
            // Send sender status to a newly connected client
            socket.emit('sender:status', this.sender.toJSON());
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

                log.debug(`[TinyG] Load G-code: name="${this.sender.state.name}", size=${this.sender.state.gcode.length}, total=${this.sender.state.total}`);

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

                this.writeln(socket, '!%'); // feedhold and queue flush

                setTimeout(() => {
                    this.writeln(socket, '{clear:null}');
                    this.writeln(socket, '{"qr":""}'); // queue report
                }, 250); // delay 250ms
            },
            'pause': () => {
                this.workflow.pause();

                this.writeln(socket, '!'); // feedhold
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'resume': () => {
                this.writeln(socket, '~'); // cycle start
                this.writeln(socket, '{"qr":""}'); // queue report

                this.workflow.resume();
            },
            'feedhold': () => {
                this.workflow.pause();

                this.writeln(socket, '!'); // feedhold
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'cyclestart': () => {
                this.writeln(socket, '~'); // cycle start
                this.writeln(socket, '{"qr":""}'); // queue report

                this.workflow.resume();
            },
            'check': () => {
                // Not supported
            },
            'homing': () => {
                this.writeln(socket, '{home:1}');
            },
            'queueflush': () => {
                this.writeln(socket, '!%'); // queue flush
                this.writeln(socket, '{"qr":""}'); // queue report
            },
            'killjob': () => {
                this.writeln(socket, '\x04'); // ^d
            },
            'sleep': () => {
                // Not supported
            },
            'unlock': () => {
                this.writeln(socket, '{clear:null}');
            },
            'reset': () => {
                this.workflow.stop();

                this.writeln(socket, '\x18'); // ^x
            },
            'feedOverride': () => {
                // Not supported
            },
            'spindleOverride': () => {
                // Not supported
            },
            'rapidOverride': () => {
                // Not supported
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
                    log.error(`[TinyG] Cannot find the macro: id=${id}`);
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
            log.error(`[TinyG] Unknown command: ${cmd}`);
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
        dbg(`[TinyG] > ${data}`);
    }
    writeln(socket, data) {
        this.write(socket, data + '\n');
    }
}

export default TinyGController;
