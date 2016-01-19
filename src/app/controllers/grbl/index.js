import _ from 'lodash';
import events from 'events';
import serialport from 'serialport';
import { parseText } from 'gcode-parser';
import log from '../../lib/log';
import settings from '../../config/settings';
import CommandQueue from './CommandQueue';
import { GRBL_MODAL_GROUPS } from './constants';

const noop = () => {};

const STATE_IDLE = 'Idle';
const STATE_RUN = 'Run';
const STATE_HOLD = 'Hold';
const STATE_DOOR = 'Door';
const STATE_HOME = 'Home';
const STATE_ALARM = 'Alarm';
const STATE_CHECK = 'Check';
const STATE_UNKNOWN = 'Unknown'; // for disconnected

//
// Grbl 0.9j ['$' for help]
//
const matchGrblInitializationMessage = (msg) => {
    return msg.match(/^Grbl/i);
};

//
// > ?
// <Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>
//
const matchGrblCurrentStatus = (msg) => {
    return msg.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
};

//
// Example
// > $G
// [G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]
//
const matchGrblParserState = (msg) => {
    return msg.match(/\[(?:\w+[0-9]+\.?[0-9]*\s*)+\]/);
};

class Grbl extends events.EventEmitter {
    status = {};
    parserstate = {};

    constructor() {
        super();
    }
    parse(data) {
        data = data.replace(/\s+$/, '');
        if (settings.debug) {
            //console.log('<<', data);
        }
        if (!data) {
            return;
        }

        this.emit('raw', data);

        // Example: Grbl 0.9j ['$' for help]
        if (matchGrblInitializationMessage(data)) {
            this.emit('startup', { raw: data });
            return;
        }

        if (matchGrblCurrentStatus(data)) {
            let r = data.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
            let status = {
                activeState: r[1], // Active States: Idle, Run, Hold, Door, Home, Alarm, Check
                machinePos: { // Machine position
                    x: r[2], 
                    y: r[3],
                    z: r[4]
                },
                workingPos: { // Working position
                    x: r[5],
                    y: r[6],
                    z: r[7]
                }
            };

            this.emit('status', { raw: data, status: status });

            if (!(_.isEqual(this.status, status))) {
                this.emit('statuschange', { raw: data, status: status });
            }

            this.status = status;

            return;
        }

        if (matchGrblParserState(data)) {
            let r = data.match(/\[([^\]]*)\]/);
            let words = _(r[1].split(' '))
                .compact()
                .map((word) => {
                    return _.trim(word);
                })
                .value();

            let parserstate = {};
            _.each(words, (word) => {
                // Gx, Mx
                if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                    let r = _.find(GRBL_MODAL_GROUPS, (group) => {
                        return _.includes(group.modes, word);
                    });

                    if (r) {
                        _.set(parserstate, 'modal.' + r.group, word);
                    }
                }

                // T: tool number
                if (word.indexOf('T') === 0) {
                    _.set(parserstate, 'tool', word.substring(1));
                }

                // F: feed rate
                if (word.indexOf('F') === 0) {
                    _.set(parserstate, 'feedrate', word.substring(1));
                }

                // S: spindle speed
                if (word.indexOf('S') === 0) {
                    _.set(parserstate, 'spindle', word.substring(1));
                }
            });

            this.emit('parserstate', { raw: data, parserstate: parserstate });

            if (!(_.isEqual(this.parserstate, parserstate))) {
                this.emit('parserstatechange', { raw: data, parserstate: parserstate });
            }

            this.parserstate = parserstate;

            return;
        }

        if (data.indexOf('ok') === 0) {
            this.emit('ok', { raw: data });
            return;
        }
            
        if (data.indexOf('error') === 0) {
            this.emit('error', { raw: data });
            return;
        }

        if (data.length > 0) {
            this.emit('others', { raw: data });
            return;
        }

    }
}

class GrblController {
    options = {
        port: '',
        baudrate: 9600
    };
    serialport = null;
    grbl = null;
    queue = null;
    gcode = '';
    connections = [];
    queryTimer = null;
    state = {
        isReady: false,
        queue: {
            executed: 0,
            total: 0
        },
        waitFor: {
            status: false,
            parserstate: false,
            parserstateOkError: false
        }
    };

    constructor(port, baudrate) {
        this.options = _.merge({}, this.options, { port: port, baudrate: baudrate });
        this.serialport = new serialport.SerialPort(this.options.port, {
            baudrate: this.options.baudrate,
            parser: serialport.parsers.readline('\n')
        }, false);

        this.grbl = new Grbl(this.serialport);

        this.grbl.on('raw', (raw) => {});

        this.grbl.on('startup', (res) => {
            this.setState({
                isReady: true,
                waitFor: {
                    status: false,
                    parserstate: false,
                    parserstateOkError: false
                }
            });
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.grbl.on('status', (res) => {
            this.setState({
                waitFor: {
                    status: false
                }
            });

            this.connections.forEach((c) => {
                c.socket.emit('grbl:status', res.status);

                if (c.sentCommand.indexOf('?') === 0) {
                    c.sentCommand = '';
                    c.socket.emit('serialport:read', res.raw);
                }
            });
        });
        this.grbl.on('statuschange', (res) => {});

        this.grbl.on('parserstate', (res) => {
            this.setState({
                waitFor: {
                    parserstate: false,
                    parserstateOkError: true // wait for ok/error response
                }
            });

            this.connections.forEach((c) => {
                c.socket.emit('grbl:parserstate', res.parserstate);

                if (c.sentCommand.indexOf('$G') === 0) {
                    c.sentCommand = '';
                    c.socket.emit('serialport:read', res.raw);
                }
            });
        });
        this.grbl.on('parserstatechange', (res) => {});

        let handleOkError = (res) => {
            let { waitFor } = this.state;

            if (waitFor['parserstateOkError']) {
                this.connections.forEach((c) => {
                    if (c.sentCommand.indexOf('$G') === 0) {
                        c.sentCommand = '';
                        c.socket.emit('serialport:read', res.raw);
                    }
                });
                this.setState({
                    waitFor: {
                        parserstateOkError: false
                    }
                });
                return;
            }

            if (this.queue.isRunning()) {
                this.queue.next();
                return;
            }

            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        };
        this.grbl.on('ok', handleOkError);
        this.grbl.on('error', handleOkError);

        this.grbl.on('others', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        });

        this.queue = new CommandQueue();
        this.queue.on('data', (code) => {
            if (this.isClose()) {
                log.error('Serial port not accessible:', { port: this.options.port });
                return;
            }

            let executed = this.queue.getExecutedCount();
            let total = this.queue.size();

            log.trace('[' + executed + '/' + total + '] ' + code);

            code = ('' + code).trim();
            this.write(code + '\n');
        });

        this.queryTimer = setInterval(() => {
            let { isReady, waitFor } = this.state;
            let notReady = !isReady;

            if (this.isClose()) {
                return;
            }

            if (notReady) {
                // The Grbl is not ready
                return;
            }

            if (!(waitFor['status'])) {
                this.setState({
                    waitFor: {
                        status: true
                    }
                });
                this.write('?');
            }

            if (!(waitFor['parserstate']) && !(waitFor['parserstateOkError'])) {
                this.setState({
                    waitFor: {
                        parserstate: true,
                        parserstateOkError: false
                    }
                });
                this.write('$G' + '\n');
            }

            { // G-code execution status
                let lastExecuted = this.state.queue.executed;
                let lastTotal = this.state.queue.total;
                let executed = this.queue.getExecutedCount();
                let total = this.queue.size();

                if ((lastExecuted !== executed) || (lastTotal !== total)) {
                    this.setState({
                        queue: {
                            executed: executed,
                            total: total
                        }
                    });

                    this.connections.forEach((c) => {
                        c.socket.emit('gcode:queuestatuschange', {
                            executed: executed,
                            total: total
                        });
                    });
                }
            }
        }, 250);
    }
    destroy() {
        if (this.queryTimer) {
            clearInterval(this.queryTimer);
            this.queryTimer = null;
        }
    }
    setState(state) {
        this.state = _.merge({}, this.state, state);
        return this.state;
    }
    open(callback = noop) {
        let { port } = this.options;

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
                this.grbl.parse(data || '');
            });

            this.serialport.on('disconnect', (err) => {
                log.warn('Disconnected from serial port \'%s\':', port, err);
                this.destroy();
            });

            this.serialport.on('error', (err) => {
                log.error('Unexpected error while reading/writing serial port \'%s\':', port, err);
                this.destroy();
            });

            log.debug('Connected to serial port \'%s\'', port);

            { // Initialization
                this.setState({
                    isReady: false,
                    queue: {
                        lastExecuted: 0,
                        lastTotal: 0
                    },
                    waitFor: {
                        status: false,
                        parserstate: false,
                        parserstateOkError: false
                    }
                });

                this.gcode_unload();
            }

            // Reset Grbl while opening serial port
            this.command('reset');

            callback();
        });
    }
    close(callback = noop) {
        let { port } = this.options;

        // Assertion check
        if (this.isClose()) {
            callback(new Error('Cannot close serial port ' + port));
            return;
        }

        // Reset Grbl while closing serial port
        this.command('reset');

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
    gcode_load(gcode, callback) {
        parseText(gcode, (err, data) => {
            if (err) {
                callback && callback(err);
                return;
            }

            let lines = _.map(data, 'line');

            this.gcode = gcode;

            // Stop and clear queue
            this.queue.stop();
            this.queue.clear();

            this.queue.push(lines);

            log.debug('Added %d lines to the queue', lines.length);
        });
    }
    gcode_unload() {
        // Unload G-code
        this.gcode = '';

        // Clear queue
        this.queue.stop();
        this.queue.clear();

        this.setState({
            queue: {
                lastExecuted: 0,
                lastTotal: 0
            }
        });
    }
    gcode_start() {
        this.queue.play();
    }
    gcode_resume() {
        this.command('resume');
        this.queue.play();
    }
    gcode_pause() {
        this.command('pause');
        this.queue.pause();
    }
    gcode_stop() {
        this.command('reset');
        this.queue.stop();
    }
    addConnection(socket) {
        this.connections.push({
            socket: socket,
            sentCommand: ''
        });
    }
    removeConnection(socket) {
        let index = _.findIndex(this.connections, { socket: socket });
        this.connections.splice(index, 1);
    }
    command(cmd, params = {}) {
        let { socket } = params;

        const handler = {
            'resume': () => {
                this.write('~', params);
            },
            'pause': () => {
                this.write('!', params);
            },
            'reset': () => {
                this.write('\x18', params);
            },
            'homing': () => {
                this.write('$H\n', params);
            },
            'unlock': () => {
                this.write('$X\n', params);
            }
        }[cmd];

        if (!handler) {
            log.error('Unknown command:', cmd);
            return;
        }

        handler();
    }
    write(data, params = {}) {
        let { socket } = params;

        socket && socket.emit('serialport:write', data);
        let index = _.findIndex(this.connections, { socket: socket });
        if (index >= 0) {
            this.connections[index].sentCommand = data;
        }
        this.serialport.write(data);
    }
}

export default GrblController;
