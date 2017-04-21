import _ from 'lodash';
import ExpressionEvaluator from 'expr-eval';
import SerialPort from 'serialport';
import ensureArray from '../../lib/ensure-array';
import EventTrigger from '../../lib/event-trigger';
import Feeder from '../../lib/feeder';
import log from '../../lib/log';
import Sender, { SP_TYPE_CHAR_COUNTING } from '../../lib/sender';
import Workflow, {
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_RUNNING
} from '../../lib/workflow';
import config from '../../services/configstore';
import monitor from '../../services/monitor';
import taskRunner from '../../services/taskrunner';
import store from '../../store';
import Smoothie from './Smoothie';
import {
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_HOLD,
    SMOOTHIE_REALTIME_COMMANDS
} from './constants';

const noop = _.noop;

const dbg = (...args) => {
    log.raw.apply(log, ['silly'].concat(args));
};

const reExpressionContext = new RegExp(/\[[^\]]+\]/g);

class SmoothieController {
    type = SMOOTHIE;

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
            this.smoothie.parse('' + data);
            dbg(`[Smoothie] < ${data}`);
        },
        disconnect: (err) => {
            this.ready = false;
            if (err) {
                log.warn(`[Smoothie] Disconnected from serial port "${this.options.port}":`, err);
            }

            this.close();
        },
        error: (err) => {
            this.ready = false;
            if (err) {
                log.error(`[Smoothie] Unexpected error while reading/writing serial port "${this.options.port}":`, err);
            }
        }
    };

    // Smoothie
    smoothie = null;
    ready = false;
    state = {};
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
        queryStatusReport: 0
    };
    feedOverride = 100;
    spindleOverride = 100;

    // Event Trigger
    event = null;

    // Feeder
    feeder = null;

    // Sender
    sender = null;

    // Workflow
    workflow = null;

    translateWithContext = (gcode, context = {}) => {
        if (typeof gcode !== 'string') {
            log.error(`[Smoothie] No valid G-code string: gcode=${gcode}`);
            return '';
        }

        const { Parser } = ExpressionEvaluator;

        // Work position
        const { x: posx, y: posy, z: posz, a: posa, b: posb, c: posc } = this.smoothie.getWorkPosition();

        // Context
        context = {
            xmin: 0,
            xmax: 0,
            ymin: 0,
            ymax: 0,
            zmin: 0,
            zmax: 0,
            ...context,

            // Work position cannot be overridden by context
            posx,
            posy,
            posz,
            posa,
            posb,
            posc
        };

        try {
            gcode = gcode.replace(reExpressionContext, (match) => {
                const expr = match.slice(1, -1);
                return Parser.evaluate(expr, context);
            });
        } catch (e) {
            log.error('[Smoothie] translateWithContext:', e);
        }

        return gcode;
    };

    constructor(port, options) {
        const { baudrate } = { ...options };

        this.options = {
            ...this.options,
            port: port,
            baudrate: baudrate
        };

        // Event Trigger
        this.event = new EventTrigger((event, trigger, commands) => {
            log.debug(`[Smoothie] EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
            if (trigger === 'system') {
                taskRunner.run(commands);
            } else {
                this.command(null, 'gcode', commands);
            }
        });

        // Feeder
        this.feeder = new Feeder();
        this.feeder.on('data', (line = '', context = {}) => {
            if (this.isClose()) {
                log.error(`[Smoothie] Serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.smoothie.isAlarm()) {
                // Feeder
                this.feeder.clear();
                log.warn('[Smoothie] Stopped sending G-code commands in Alarm mode');
                return;
            }

            line = String(line).trim();
            if (line.length === 0) {
                return;
            }

            // Example
            // "G0 X[posx - 8] Y[ymax]" -> "G0 X2 Y50"
            line = this.translateWithContext(line, context);

            this.emitAll('serialport:write', line);

            this.serialport.write(line + '\n');
            dbg(`[Smoothie] > ${line}`);
        });

        // Sender
        this.sender = new Sender(SP_TYPE_CHAR_COUNTING, {
            // Deduct the length of periodic commands ('$G\n', '?') to prevent from buffer overrun
            bufferSize: (128 - 8) // The default buffer size is 128 bytes
        });
        this.sender.on('data', (line = '', context = {}) => {
            if (this.isClose()) {
                log.error(`[Smoothie] Serial port "${this.options.port}" is not accessible`);
                return;
            }

            if (this.workflow.state !== WORKFLOW_STATE_RUNNING) {
                log.error(`[Smoothie] Unexpected workflow state: ${this.workflow.state}`);
                return;
            }

            line = String(line).trim();
            if (line.length === 0) {
                log.warn(`[Smoothie] Expected non-empty line: N=${this.sender.state.sent}`);
                return;
            }

            // Example
            // "G0 X[posx - 8] Y[ymax]" -> "G0 X2 Y50"
            line = this.translateWithContext(line, context);

            this.serialport.write(line + '\n');
            dbg(`[Smoothie] > ${line}`);
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

        // Smoothie
        this.smoothie = new Smoothie();

        this.smoothie.on('raw', noop);

        this.smoothie.on('status', (res) => {
            this.actionMask.queryStatusReport = false;

            // Do not change buffer size during gcode sending (#133)
            if (this.workflow.state === WORKFLOW_STATE_IDLE && this.sender.sp.dataLength === 0) {
                // Check if Smoothie reported the rx buffer (#115)
                if (res && res.buf && res.buf.rx) {
                    const rx = Number(res.buf.rx) || 0;
                    // Deduct the length of periodic commands ('$G\n', '?') to prevent from buffer overrun
                    const bufferSize = (rx - 8);
                    if (bufferSize > this.sender.sp.bufferSize) {
                        this.sender.sp.bufferSize = bufferSize;
                    }
                }
            }

            if (this.actionMask.replyStatusReport) {
                this.actionMask.replyStatusReport = false;
                this.emitAll('serialport:read', res.raw);
            }
        });

        this.smoothie.on('ok', (res) => {
            if (this.actionMask.queryParserState.reply) {
                if (this.actionMask.replyParserState) {
                    this.actionMask.replyParserState = false;
                    this.emitAll('serialport:read', res.raw);
                }
                this.actionMask.queryParserState.reply = false;
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

        this.smoothie.on('error', (res) => {
            // Sender
            if (this.workflow.state === WORKFLOW_STATE_RUNNING) {
                const { lines, received } = this.sender.state;
                const line = lines[received] || '';

                this.emitAll('serialport:read', `> ${line.trim()} (line=${received + 1})`);
                this.emitAll('serialport:read', res.raw);

                this.sender.ack();
                this.sender.next();
                return;
            }

            this.emitAll('serialport:read', res.raw);

            // Feeder
            this.feeder.next();
        });

        this.smoothie.on('alarm', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.smoothie.on('parserstate', (res) => {
            this.actionMask.queryParserState.state = false;
            this.actionMask.queryParserState.reply = true;

            if (this.actionMask.replyParserState) {
                this.emitAll('serialport:read', res.raw);
            }
        });

        this.smoothie.on('parameters', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.smoothie.on('version', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        this.smoothie.on('others', (res) => {
            this.emitAll('serialport:read', res.raw);
        });

        const queryStatusReport = () => {
            const now = new Date().getTime();
            const lastQueryTime = this.actionTime.queryStatusReport;

            if (lastQueryTime > 0) {
                const timespan = Math.abs(now - lastQueryTime);
                const toleranceTime = 5000; // 5 seconds

                // Check if it has not been updated for a long time
                if (timespan >= toleranceTime) {
                    log.debug(`[Smoothie] Continue status report query: timespan=${timespan}ms`);
                    this.actionMask.queryStatusReport = false;
                }
            }

            if (this.actionMask.queryStatusReport) {
                return;
            }

            if (this.isOpen()) {
                this.actionMask.queryStatusReport = true;
                this.actionTime.queryStatusReport = now;
                this.serialport.write('?');
            }
        };

        const queryParserState = _.throttle(() => {
            const now = new Date().getTime();
            const lastQueryTime = this.actionTime.queryParserState;

            if (lastQueryTime > 0) {
                const timespan = Math.abs(now - lastQueryTime);
                const toleranceTime = 10000; // 10 seconds

                // Check if it has not been updated for a long time
                if (timespan >= toleranceTime) {
                    log.debug(`[Smoothie] Continue parser state query: timespan=${timespan}ms`);
                    this.actionMask.queryParserState.state = false;
                    this.actionMask.queryParserState.reply = false;
                }
            }

            if (this.actionMask.queryParserState.state || this.actionMask.queryParserState.reply) {
                return;
            }

            if (this.isOpen()) {
                this.actionMask.queryParserState.state = true;
                this.actionMask.queryParserState.reply = false;
                this.actionTime.queryParserState = now;
                this.serialport.write('$G\n');
            }
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

            // Smoothie state
            if (this.state !== this.smoothie.state) {
                this.state = this.smoothie.state;
                this.emitAll('Smoothie:state', this.state);
            }

            // Wait for the bootloader to complete before sending commands
            if (!(this.ready)) {
                // Not ready yet
                return;
            }

            // ? - Status Report
            queryStatusReport();

            // $G - Parser State
            queryParserState();
        }, 250);
    }
    clearActionValues() {
        this.actionMask.queryParserState.state = false;
        this.actionMask.queryParserState.reply = false;
        this.actionMask.queryStatusReport = false;
        this.actionMask.replyParserState = false;
        this.actionMask.replyStatusReport = false;
        this.actionTime.queryParserState = 0;
        this.actionTime.queryStatusReport = 0;
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

        if (this.queryTimer) {
            clearInterval(this.queryTimer);
            this.queryTimer = null;
        }

        if (this.smoothie) {
            this.smoothie.removeAllListeners();
            this.smoothie = null;
        }
    }
    initController() {
        const cmds = [
            // Wait for the bootloader to complete before sending commands
            { pauseAfter: 1000 },

            // Check if it is Smoothieware
            { cmd: 'version', pauseAfter: 50 }
        ];

        const sendInitCommands = (i = 0) => {
            if (i >= cmds.length) {
                // Set ready flag to true after sending initialization commands
                this.ready = true;
                return;
            }
            const { cmd = '', pauseAfter = 0 } = { ...cmds[i] };
            if (cmd) {
                this.serialport.write(cmd + '\n');
                dbg(`[Smoothie] > ${cmd}`);
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
            connections: Object.keys(this.connections),
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
    open(callback = noop) {
        const { port, baudrate } = this.options;

        // Assertion check
        if (this.isOpen()) {
            log.error(`[Smoothie] Cannot open serial port "${port}"`);
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
                log.error(`[Smoothie] Error opening serial port "${port}":`, err);
                this.emitAll('serialport:error', { port: port });
                callback(err); // notify error
                return;
            }

            this.emitAll('serialport:open', {
                port: port,
                baudrate: baudrate,
                controllerType: this.type,
                inuse: true
            });

            callback(); // register controller

            log.debug(`[Smoothie] Connected to serial port "${port}"`);

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
    close() {
        const { port } = this.options;

        // Assertion check
        if (!this.serialport) {
            log.error(`[Smoothie] Serial port "${port}" is not available`);
            return;
        }

        // Stop status query
        this.ready = false;

        this.emitAll('serialport:close', {
            port: port,
            inuse: false
        });
        store.unset('controllers["' + port + '"]');

        if (this.isOpen()) {
            this.serialport.removeListener('data', this.serialportListener.data);
            this.serialport.removeListener('disconnect', this.serialportListener.disconnect);
            this.serialport.removeListener('error', this.serialportListener.error);
            this.serialport.close((err) => {
                if (err) {
                    log.error(`[Smoothie] Error closing serial port "${port}":`, err);
                }
            });
        }

        this.destroy();
    }
    isOpen() {
        return this.serialport && this.serialport.isOpen();
    }
    isClose() {
        return !(this.isOpen());
    }
    addConnection(socket) {
        if (!socket) {
            log.error('[Smoothie] The socket parameter is not specified');
            return;
        }

        log.debug(`[Smoothie] Add socket connection: id=${socket.id}`);
        this.connections[socket.id] = socket;

        if (!_.isEmpty(this.state)) {
            // Send controller state to a newly connected client
            socket.emit('Smoothie:state', this.state);
        }

        if (this.sender) {
            // Send sender status to a newly connected client
            socket.emit('sender:status', this.sender.toJSON());
        }
    }
    removeConnection(socket) {
        if (!socket) {
            log.error('[Smoothie] The socket parameter is not specified');
            return;
        }

        log.debug(`[Smoothie] Remove socket connection: id=${socket.id}`);
        this.connections[socket.id] = undefined;
        delete this.connections[socket.id];
    }
    emitAll(eventName, ...args) {
        Object.keys(this.connections).forEach(id => {
            const socket = this.connections[id];
            socket.emit.apply(socket, [eventName].concat(args));
        });
    }
    command(socket, cmd, ...args) {
        const handler = {
            'gcode:load': () => {
                let [name, gcode, context = {}, callback = noop] = args;
                if (typeof context === 'function') {
                    callback = context;
                    context = {};
                }

                const ok = this.sender.load(name, gcode, context);
                if (!ok) {
                    callback(new Error(`Invalid G-code: name=${name}`));
                    return;
                }

                this.event.trigger('gcode:load');

                log.debug(`[Smoothie] Load G-code: name="${this.sender.state.name}", size=${this.sender.state.gcode.length}, total=${this.sender.state.total}`);

                this.workflow.stop();

                callback(null, { name, gcode, context });
            },
            'gcode:unload': () => {
                this.workflow.stop();

                // Sender
                this.sender.unload();

                this.event.trigger('gcode:unload');
            },
            'start': () => {
                log.warn(`[Smoothie] Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
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
                log.warn(`[Smoothie] Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:stop');
            },
            'gcode:stop': () => {
                this.event.trigger('gcode:stop');

                this.workflow.stop();

                const activeState = _.get(this.state, 'status.activeState', '');
                if (activeState === SMOOTHIE_ACTIVE_STATE_HOLD) {
                    this.write(socket, '~'); // resume
                }
            },
            'pause': () => {
                log.warn(`[Smoothie] Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:pause');
            },
            'gcode:pause': () => {
                this.event.trigger('gcode:pause');

                this.workflow.pause();

                this.write(socket, '!');
            },
            'resume': () => {
                log.warn(`[Smoothie] Warning: The "${cmd}" command is deprecated and will be removed in a future release.`);
                this.command(socket, 'gcode:resume');
            },
            'gcode:resume': () => {
                this.event.trigger('gcode:resume');

                this.write(socket, '~');

                this.workflow.resume();
            },
            'feedhold': () => {
                this.event.trigger('feedhold');

                this.workflow.pause();

                this.write(socket, '!');
            },
            'cyclestart': () => {
                this.event.trigger('cyclestart');

                this.write(socket, '~');

                this.workflow.resume();
            },
            'statusreport': () => {
                this.write(socket, '?');
            },
            'homing': () => {
                this.event.trigger('homing');

                this.writeln(socket, '$H');
            },
            'sleep': () => {
                this.event.trigger('sleep');

                // Not supported
            },
            'unlock': () => {
                this.writeln(socket, '$X');
            },
            'reset': () => {
                this.workflow.stop();

                // Feeder
                this.feeder.clear();

                this.write(socket, '\x18'); // ^x
            },
            'feedOverride': () => {
                const [value] = args;
                let feedOverride = this.smoothie.state.status.ovF;

                if (value === 0) {
                    feedOverride = 100;
                } else if ((feedOverride + value) > 200) {
                    feedOverride = 200;
                } else if ((feedOverride + value) < 10) {
                    feedOverride = 10;
                } else {
                    feedOverride += value;
                }
                this.command(socket, 'gcode', 'M220S' + feedOverride);

                // enforce state change
                this.smoothie.state = {
                    ...this.smoothie.state,
                    status: {
                        ...this.smoothie.state.status,
                        ovF: feedOverride
                    }
                };
            },
            'spindleOverride': () => {
                const [value] = args;
                let spindleOverride = this.smoothie.state.status.ovS;

                if (value === 0) {
                    spindleOverride = 100;
                } else if ((spindleOverride + value) > 200) {
                    spindleOverride = 200;
                } else if ((spindleOverride + value) < 0) {
                    spindleOverride = 0;
                } else {
                    spindleOverride += value;
                }
                this.command(socket, 'gcode', 'M221S' + spindleOverride);

                // enforce state change
                this.smoothie.state = {
                    ...this.smoothie.state,
                    status: {
                        ...this.smoothie.state.status,
                        ovS: spindleOverride
                    }
                };
            },
            'rapidOverride': () => {
                // Not supported
            },
            'lasertest:on': () => {
                const [power = 0, duration = 0] = args;

                this.writeln(socket, 'M3');
                // Firing laser at <power>% power and entering manual mode
                this.writeln(socket, 'fire ' + Math.abs(power));
                if (duration > 0) {
                    // http://smoothieware.org/g4
                    // Dwell S<seconds> or P<milliseconds>
                    // Note that if `grbl_mode` is set to `true`, then the `P` parameter
                    // is the duration to wait in seconds, not milliseconds, as a float value.
                    // This is to confirm to G-code standards.
                    this.writeln(socket, 'G4P' + (duration / 1000));
                    // Turning laser off and returning to auto mode
                    this.writeln(socket, 'fire off');
                    this.writeln(socket, 'M5');
                }
            },
            'lasertest:off': () => {
                // Turning laser off and returning to auto mode
                this.writeln(socket, 'fire off');
                this.writeln(socket, 'M5');
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
                    log.error(`[Smoothie] Cannot find the macro: id=${id}`);
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
                    log.error(`[Smoothie] Cannot find the macro: id=${id}`);
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
            log.error(`[Smoothie] Unknown command: ${cmd}`);
            return;
        }

        handler();
    }
    write(socket, data) {
        // Assertion check
        if (this.isClose()) {
            log.error(`[Smoothie] Serial port "${this.options.port}" is not accessible`);
            return;
        }

        const cmd = data.trim();
        this.actionMask.replyStatusReport = (cmd === '?') || this.actionMask.replyStatusReport;
        this.actionMask.replyParserState = (cmd === '$G') || this.actionMask.replyParserState;

        this.emitAll('serialport:write', data);
        this.serialport.write(data);
        dbg(`[Smoothie] > ${data}`);
    }
    writeln(socket, data) {
        if (_.includes(SMOOTHIE_REALTIME_COMMANDS, data)) {
            this.write(socket, data);
        } else {
            this.write(socket, data + '\n');
        }
    }
}

export default SmoothieController;
