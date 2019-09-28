import { EventEmitter } from 'events';
import SerialPort from 'serialport';

const Readline = SerialPort.parsers.Readline;

// Validation
const DATABITS = Object.freeze([5, 6, 7, 8]);
const STOPBITS = Object.freeze([1, 2]);
const PARITY = Object.freeze(['none', 'even', 'mark', 'odd', 'space']);
const FLOWCONTROLS = Object.freeze(['rtscts', 'xon', 'xoff', 'xany']);

const defaultOptions = Object.freeze({
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

    port = null;

    parser = null;

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

    constructor(props) {
        super();

        const { writeFilter, ...rest } = { ...props };

        if (writeFilter) {
            if (typeof writeFilter !== 'function') {
                throw new TypeError(`"writeFilter" must be a function: ${writeFilter}`);
            }

            this.writeFilter = writeFilter;
        }

        const options = Object.assign({}, defaultOptions, rest);

        if (options.port) {
            throw new TypeError('"port" is an unknown option, did you mean "path"?');
        }

        if (!options.path) {
            throw new TypeError(`"path" is not defined: ${options.path}`);
        }

        if (options.baudrate) {
            throw new TypeError('"baudrate" is an unknown option, did you mean "baudRate"?');
        }

        if (typeof options.baudRate !== 'number') {
            throw new TypeError(`"baudRate" must be a number: ${options.baudRate}`);
        }

        if (DATABITS.indexOf(options.dataBits) < 0) {
            throw new TypeError(`"databits" is invalid: ${options.dataBits}`);
        }

        if (STOPBITS.indexOf(options.stopBits) < 0) {
            throw new TypeError(`"stopbits" is invalid: ${options.stopbits}`);
        }

        if (PARITY.indexOf(options.parity) < 0) {
            throw new TypeError(`"parity" is invalid: ${options.parity}`);
        }

        FLOWCONTROLS.forEach((control) => {
            if (typeof options[control] !== 'boolean') {
                throw new TypeError(`"${control}" is not boolean: ${options[control]}`);
            }
        });

        Object.defineProperties(this, {
            options: {
                enumerable: true,
                value: options,
                writable: false
            }
        });
    }

    get ident() {
        return toIdent(this.options);
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
            const err = new Error(`Cannot open serial port "${this.options.path}"`);
            callback(err);
            return;
        }

        const { path, ...rest } = this.options;

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
            const err = new Error(`Cannot close serial port "${this.options.path}"`);
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
