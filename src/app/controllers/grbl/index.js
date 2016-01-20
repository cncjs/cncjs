import _ from 'lodash';
import serialport from 'serialport';
import log from '../../lib/log';
import { GCode } from './gcode';
import { Grbl } from './grbl';

const noop = () => {};

class Connection {
    socket = null;
    sentCommand = '';

    constructor(socket) {
        this.socket = socket;
    }
}

class GrblController {
    options = {
        port: '',
        baudrate: 9600
    };
    serialport = null;
    gcode = null;
    grbl = null;
    connections = [];
    queryTimer = null;
    state = {
        isReady: false,
        isRunning: false,
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

        this.gcode = new GCode();
        this.gcode.on('progress', (res) => {
            let { gcode } = res;

            if (this.isClose()) {
                log.error('Serial port not accessible:', { port: this.options.port });
                return;
            }

            let sent = this.gcode.sent.length;
            let total = this.gcode.total;

            log.trace('[' + sent + '/' + total + '] ' + gcode);

            gcode = ('' + gcode).trim();

            this.write(gcode + '\n');
        });
        this.gcode.on('statuschange', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('gcode:statuschange', _.pick(this.gcode, [
                    'remain',
                    'sent',
                    'total',
                    'createdTime',
                    'startedTime',
                    'finishedtime'
                ]));
            });
        });

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

            if (this.state.isRunning) {
                this.gcode.next();
                return;
            }

            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
        };
        this.grbl.on('ok', handleOkError);
        this.grbl.on('error', handleOkError);

        this.grbl.on('error', (res) => {
            log.warn('Grbl:', res.raw); // Grbl errors
        });

        this.grbl.on('others', (res) => {
            this.connections.forEach((c) => {
                c.socket.emit('serialport:read', res.raw);
            });
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
    clearState() {
        this.setState({
            isReady: false,
            isRunning: false,
            gcode: {
                sent: 0,
                total: 0
            },
            waitFor: {
                status: false,
                parserstate: false,
                parserstateOkError: false
            }
        });
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
                this.clearState();
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
    addConnection(socket) {
        this.connections.push(new Connection(socket));
    }
    removeConnection(socket) {
        let index = _.findIndex(this.connections, (c) => {
            return c.socket === socket;
        });
        this.connections.splice(index, 1);
    }
    command(socket, cmd, ...args) {
        const handler = {
            'load': () => {
                const [ name, gcode, callback ] = args;

                this.gcode.load(name, gcode, (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    log.debug('Load G-code: name=%s, total=%d', this.gcode.name, this.gcode.total);

                    this.setState({ isRunning: false });
                    callback();
                });
            },
            'unload': () => {
                log.debug('Unload G-code: name=%s', this.gcode.name);

                this.setState({
                    isRunning: false,
                    gcode: {
                        executed: 0,
                        total: 0
                    }
                });
                this.gcode.unload();
                this.command('reset'); // Reset Grbl
            },
            'start': () => {
                this.setState({ isRunning: true });
                this.gcode.next();
            },
            'stop': () => {
                this.setState({ isRunning: false });
                this.gcode.rewind();
                this.command('reset'); // Reset Grbl
            },
            'resume': () => {
                this.write(socket, '~');
            },
            'pause': () => {
                this.write(socket, '!');
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
            log.error('Unknown command:', cmd);
            return;
        }

        handler();
    }
    write(socket, data) {
        socket && socket.emit('serialport:write', data);
        let index = _.findIndex(this.connections, (c) => {
            return c.socket === socket;
        });
        if (index >= 0) {
            this.connections[index].sentCommand = data;
        }
        this.serialport.write(data);
    }
    writeln(socket, data) {
        this.write(socket, data + '\n');
    }
}

export default GrblController;
