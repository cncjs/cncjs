import { EventEmitter } from 'events';
import net from 'net';
import SerialPort from 'serialport';
import log from './logger';

const Readline = SerialPort.parsers.Readline;

const defaultSettings = Object.freeze({
    port: 23
});

const toIdent = (options) => {
    const { host, port } = { ...options };
    return JSON.stringify({ type: 'socket', host: host, port: port });
};

class SocketConnection extends EventEmitter {
    type = 'socket';
    socket = null; // Socket
    parser = null; // Readline parser
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
                log.warn(`The socket connection "${this.settings.host}:${this.settings.port}" was closed due to a transmission error`);
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

        if (!settings.host) {
            throw new TypeError(`"host" is not defined: ${settings.host}`);
        }

        if (!settings.port) {
            throw new TypeError(`"port" is not defined: ${settings.port}`);
        }

        if (typeof settings.port !== 'number') {
            throw new TypeError(`"port" must be a number: ${settings.port}`);
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
        return this.socket && !this.socket.destroyed;
    }
    get isClose() {
        return !this.isOpen;
    }
    open(callback) {
        if (this.socket) {
            const err = new Error(`Cannot open socket connection: ${this.settings.host}:${this.settings.port}`);
            callback && callback(err);
            return;
        }

        if (typeof callback === 'function') {
            let connected = false;

            const errorCallback = (err) => {
                if (!connected) {
                    callback(err);
                }
            };
            const connectCallback = () => {
                this.socket.removeListener('error', errorCallback);

                connected = true;
                callback(null);
            };

            this.socket.once('error', errorCallback);
            this.socket.once('connect', connectCallback);
        }

        this.socket = net.connect(this.settings.port, this.settings.host);
        this.socket.on('connect', this.eventListener.open);
        this.socket.on('close', this.eventListener.close);
        this.socket.on('error', this.eventListener.error);

        this.parser = this.socket.pipe(new Readline({ delimiter: '\n' }));
        this.parser.on('data', this.eventListener.data);
    }
    // @param {function} callback The error-first callback.
    close(callback) {
        if (!this.socket) {
            const err = new Error(`Cannot close socket connection: ${this.options.host}:${this.options.port}`);
            callback && callback(err);
            return;
        }

        this.socket.removeListener('connect', this.eventListener.open);
        this.socket.removeListener('close', this.eventListener.close);
        this.socket.removeListener('error', this.eventListener.error);
        this.parser.removeListener('data', this.eventListener.data);

        this.socket.end();
        callback && callback(null);

        this.socket = null;
        this.parser = null;
    }
    write(data, context) {
        if (!this.socket) {
            return;
        }

        data = this.writeFilter(data, context);

        this.socket.write(data);
    }
}

export { toIdent };
export default SocketConnection;
