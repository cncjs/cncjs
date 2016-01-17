import _ from 'lodash';
import events from 'events';
import serialport from 'serialport';
import log from '../lib/log';
import settings from '../config/settings';
import CommandQueue from './CommandQueue';

const STATE_IDLE = 'Idle';
const STATE_RUN = 'Run';
const STATE_HOLD = 'Hold';
const STATE_DOOR = 'Door';
const STATE_HOME = 'Home';
const STATE_ALARM = 'Alarm';
const STATE_CHECK = 'Check';
const STATE_UNKNOWN = 'Unknown'; // for disconnected

const noop = () => {};

class GrblLineParser {
}

class Grbl extends events.EventEmitter {
    status = {};
    parserstate = {};

    parser = new GrblLineParser();
    serialport = null;
    queryTimer = null;
    waitingQueue = [];

    constructor(serialport) {
        super();

        this.serialport = serialport;
    }
    destroy() {
        let port = this.serialport.path;

        if (this.serialport && this.serialport.isOpen()) {
            log.error('The serial port \'%s\' does not properly close', port);
            return;
        }

        this.status = {
            state: STATE_UNKNOWN
        };
        this.serialport = null;
        this.stopQueryTimer();
        this.waitingQueue = [];
    }
    open(callback = noop) {
        let port = this.serialport.path;
        let isOpen = this.serialport.isOpen();

        // Assertion check
        if (isOpen) {
            callback(new Error('Cannot open serial port ' + port));
            return;
        }

        this.serialport.open((err) => {
            if (err) {
                callback(err);
                return;
            }

            this.serialport.on('data', (data) => {
                this.processData(data || '');
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

            // Reset Grbl after opening serial port
            this.resetGrbl();

            callback();
        });
    }
    close(callback = noop) {
        let port = this.serialport.path;
        let isOpen = this.serialport.isOpen();
        let isClose = !isOpen;

        // Assertion check
        if (isClose) {
            callback(new Error('Cannot close serial port ' + port));
            return;
        }

        // Reset Grbl before closing serial port
        this.resetGrbl();

        this.serialport.close((err) => {
            this.destroy();
            callback(err);
        });
    }
    processData(data) {
        data = data.replace(/\s+$/, '');
        if (settings.debug) {
            console.log('<<', data);
        }
        if (!data) {
            return;
        }

        this.emit('raw', data);
    }
    resetGrbl() {
        this.sendRealtimeCommand('\x18');
    }
    getCurrentStatus() {
        this.sendRealtimeCommand('?');
    }
    sendCommand(cmd) {
        this.serialport.write(cmd + '\n');
    }
    sendRealtimeCommand(cmd) {
        this.serialport.write(cmd);
    }
    startQueryTimer() {
        this.queryTimer = setTimeout(() => {
            this.getCurrentStatus();
            if (this.serialport && this.serialport.isOpen()) {
                this.startQueryTimer();
            }
        }, 1/10 * 1000);
    }
    stopQueryTimer() {
        clearTimeout(this.queryTimer);
        this.queryTimer = null;
    }
}

class GrblController {
    options = {
        port: '',
        baudrate: 9600
    };
    serialport = null;
    queue = new CommandQueue();
    gcode = '';
    sockets = [];

    constructor(port, baudrate) {
        this.options = _.merge({}, this.options, { port: port, baudrate: baudrate });
        this.serialport = new serialport.SerialPort(this.options.port, {
            baudrate: this.options.baudrate,
            parser: serialport.parsers.readline('\n')
        }, false);

        this.grbl = new Grbl(this.serialport);

        this.grbl.on('raw', (data) => {
        });

        this.grbl.on('status', (status) => {
        });

        this.grbl.on('statuschange', (status) => {
        });

        this.grbl.on('parserstate', (parsestate) => {
        });

        this.grbl.on('parserstatechange', (parsestate) => {
        });
    }
    open(callback) {
        this.grbl.open(callback);
    }
    close(callback) {
        this.grbl.close(callback);
    }
    isOpen() {
        return this.serialport.isOpen();
    }
    isClose() {
        return !(this.isOpen());
    }
    connect(socket) {
        this.sockets.push(socket);
    }
    disconnect(socket) {
        this.sockets.splice(this.sockets.indexOf(socket), 1);
    }
    sendMessage(socket, message = {}) {
        socket.emit('message', message);
    }
    sendBroadcastMessage(message = {}) {
        _.each(this.sockets, (socket) => {
            this.sendMessage(socket, message);
        });
    }
}

export default GrblController;
