import events from 'events';
import serialport from 'serialport';
import log from './lib/log';

const STATE_IDLE = 'Idle';
const STATE_RUN = 'Run';
const STATE_HOLD = 'Hold';
const STATE_DOOR = 'Door';
const STATE_HOME = 'Home';
const STATE_ALARM = 'Alarm';
const STATE_CHECK = 'Check';
const STATE_UNKNOWN = 'Unknown'; // for disconnected

class GrblLineParser {
}

class Grbl extends events.EventEmitter {
    currentStatus = {};

    parser = new GrblLineParser();
    serialport = null;
    queryTimer = null;
    waitingQueue = [];
    readyToStart = false;

    constructor() {
        super();
    }
    destroy() {
        if (this.serialport && this.serialport.isOpen()) {
            log.error('The serial port \'%s\' was not properly closed.', this.serialport.path);
            return;
        }

        this.currentStatus = {
            state: STATE_UNKNOWN
        };
        this.serialport = null;
        this.stopQueryTimer();
        this.waitingQueue = [];
        this.readyToStart = false;
    }
    open(options) {
        let { port, baudrate } = options;

        if (!(this.serialport)) {
            this.serialport = new serialport.SerialPort(port, {
                baudrate: baudrate,
                parser: serialport.parsers.readline('\n')
            }, false);
        }

        if (this.serialport.isOpen()) {
            log.warn('The serial port \'%s\' has already opened', port);
            return;
        }

        this.serialport.on('data', (data) => {
            this.processData(data);
        });

        this.serialport.on('close', () => {
            this.destroy();
        });

        this.serialport.on('error', () => {
            this.destroy();
        });

        this.serialport.open((err) => {
            if (err) {
                log.error('Error opening serial port \'%s\'', port);
                return;
            }

            log.debug('Connected to serial port \'%s\'', port);

            // Reset Grbl when the serial port connection is established
            this.resetGrbl();
        });
    }
    close() {
        this.serialport.close((err) => {
            if (err) {
                log.error('Error closing serial port \'%s\'', port);
            }
        });
    }
    processData(data) {
        console.log('###', data);
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

export default Grbl;
