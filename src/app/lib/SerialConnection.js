import { EventEmitter } from 'events';
import SerialPort from 'serialport';
import log from './logger';

const Readline = SerialPort.parsers.Readline;

const defaultSettings = Object.freeze({
    baudRate: 115200
});

const toIdent = (options) => {
    // Only the path option is required for generating the ident property
    const { path } = { ...options };
    return JSON.stringify({ type: 'serial', path: path });
};

class SerialConnection extends EventEmitter {
    type = 'serial';
    parser = null; // Readline parser
    port = null; // SerialPort
    writeFilter = (data) => data;

    eventListener = {
        data: (data) => {
            this.emit('data', data);
        },
        open: () => {
            this.emit('open');
        },
        close: (err) => {
            if (err) {
                log.warn(`The serial port "${this.settings.path}" was disconnected from the host`);
            }

            this.emit('close', err);
        },
        error: (err) => {
            this.emit('error', err);
        }
    };

    constructor(options) {
        super();

        const { writeFilter } = { ...options };

        if (writeFilter) {
            if (typeof writeFilter !== 'function') {
                throw new TypeError(`"writeFilter" must be a function: ${writeFilter}`);
            }

            this.writeFilter = writeFilter;
        }

        const settings = Object.assign({}, defaultSettings, options);

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
    write(data) {
        if (!this.port) {
            return;
        }

        data = this.writeFilter(data);

        this.port.write(data);
    }
}

export { toIdent };
export default SerialConnection;
