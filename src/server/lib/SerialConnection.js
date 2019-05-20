import { EventEmitter } from 'events';
import SerialPort from 'serialport';

const Readline = SerialPort.parsers.Readline;

// Validation
const DATABITS = Object.freeze([5, 6, 7, 8]);
const STOPBITS = Object.freeze([1, 2]);
const PARITY = Object.freeze(['none', 'even', 'mark', 'odd', 'space']);
const FLOWCONTROLS = Object.freeze(['rtscts', 'xon', 'xoff', 'xany']);

const defaultSettings = Object.freeze({
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    rtscts: false,
    xon: false,
    xoff: false,
    xany: false
});

const toIdent = (options) => {
    // Only the path option is required for generating the ident property
    const { path } = { ...options };
    return JSON.stringify({ type: 'serial', path: path });
};

class SerialConnection extends EventEmitter {
    type = 'serial';

    parser = null;

    // Readline parser
    port = null;

    // SerialPort
    writeFilter = (data) => data;

    eventListener = {
        data: (data) => {
            this.emit('data', data);
        },
        open: () => {
            this.emit('open');
        },
        close: (err) => {
            this.emit('close', err);
        },
        error: (err) => {
            this.emit('error', err);
        }
    };

    constructor(options) {
        super();

        const { writeFilter, ...rest } = { ...options };

        if (writeFilter) {
            if (typeof writeFilter !== 'function') {
                throw new TypeError(`"writeFilter" must be a function: ${writeFilter}`);
            }

            this.writeFilter = writeFilter;
        }

        const settings = Object.assign({}, defaultSettings, rest);

        if (settings.port) {
            throw new TypeError('"port" is an unknown option, did you mean "path"?');
        }

        if (!settings.path) {
            throw new TypeError(`"path" is not defined: ${settings.path}`);
        }

        if (settings.baudrate) {
            throw new TypeError('"baudrate" is an unknown option, did you mean "baudRate"?');
        }

        if (typeof settings.baudRate !== 'number') {
            throw new TypeError(`"baudRate" must be a number: ${settings.baudRate}`);
        }

        if (DATABITS.indexOf(settings.dataBits) < 0) {
            throw new TypeError(`"databits" is invalid: ${settings.dataBits}`);
        }

        if (STOPBITS.indexOf(settings.stopBits) < 0) {
            throw new TypeError(`"stopbits" is invalid: ${settings.stopbits}`);
        }

        if (PARITY.indexOf(settings.parity) < 0) {
            throw new TypeError(`"parity" is invalid: ${settings.parity}`);
        }

        FLOWCONTROLS.forEach((control) => {
            if (typeof settings[control] !== 'boolean') {
                throw new TypeError(`"${control}" is not boolean: ${settings[control]}`);
            }
        });

        Object.defineProperties(this, {
            settings: {
                enumerable: true,
                value: settings,
                writable: false
            }
        });
    }

    get ident() {
        return toIdent(this.settings);
    }

    get isOpen() {
        return this.port && this.port.isOpen;
    }

    get isClose() {
        return !this.isOpen;
    }

    // @param {function} callback The error-first callback.
    open(callback) {
        if (this.port) {
            const err = new Error(`Cannot open serial port "${this.settings.path}"`);
            callback(err);
            return;
        }

        const { path, ...rest } = this.settings;

        this.port = new SerialPort(path, {
            ...rest,
            autoOpen: false
        });
        this.port.on('open', this.eventListener.open);
        this.port.on('close', this.eventListener.close);
        this.port.on('error', this.eventListener.error);

        this.parser = this.port.pipe(new Readline({ delimiter: '\n' }));
        this.parser.on('data', this.eventListener.data);

        this.port.open(callback);
    }

    // @param {function} callback The error-first callback.
    close(callback) {
        if (!this.port) {
            const err = new Error(`Cannot close serial port "${this.settings.path}"`);
            callback && callback(err);
            return;
        }

        this.port.removeListener('open', this.eventListener.open);
        this.port.removeListener('close', this.eventListener.close);
        this.port.removeListener('error', this.eventListener.error);
        this.parser.removeListener('data', this.eventListener.data);

        this.port.close(callback);

        this.port = null;
        this.parser = null;
    }

    write(data, context) {
        if (!this.port) {
            return;
        }

        data = this.writeFilter(data, context);

        this.port.write(data);
    }
}

export { toIdent };
export default SerialConnection;
