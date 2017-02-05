/* eslint no-continue: 0 */
import events from 'events';

export const SP_TYPE_SEND_RESPONSE = 0;
export const SP_TYPE_CHAR_COUNTING = 1;

const noop = () => {};

const stripComments = (() => {
    const re1 = new RegExp(/\s*[%#;].*/g); // Strip everything after %, #, or ; to the end of the line, including preceding spaces
    const re2 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
    return line => line.replace(re1, '').replace(re2, '');
})();

class SPSendResponse {
    callback = null;

    constructor(options, callback = noop) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (typeof callback === 'function') {
            this.callback = callback;
        }
    }
    process() {
        this.callback && this.callback(this);
    }
    clear() {
        // Do nothing
    }
    get type() {
        return SP_TYPE_SEND_RESPONSE;
    }
}

class SPCharCounting {
    callback = null;
    state = {
        bufferSize: 128, // Defaults to 128
        dataLength: 0,
        queue: [],
        line: ''
    };

    constructor(options, callback = noop) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // bufferSize
        const bufferSize = Number(options.bufferSize);
        if (bufferSize && bufferSize > 0) {
            this.state.bufferSize = bufferSize;
        }

        if (typeof callback === 'function') {
            this.callback = callback;
        }
    }
    process() {
        this.callback && this.callback(this);
    }
    reset() {
        this.state.bufferSize = 128; // Defaults to 128
        this.state.dataLength = 0;
        this.state.queue = [];
        this.state.line = '';
    }
    clear() {
        this.state.dataLength = 0;
        this.state.queue = [];
        this.state.line = '';
    }
    get type() {
        return SP_TYPE_CHAR_COUNTING;
    }
    get bufferSize() {
        return this.state.bufferSize;
    }
    set bufferSize(bufferSize = 0) {
        bufferSize = Number(bufferSize);
        if (!bufferSize) {
            return;
        }

        // The buffer size cannot be reduced below the size of the data within the buffer.
        this.state.bufferSize = Math.max(bufferSize, this.state.dataLength);
    }
    get dataLength() {
        return this.state.dataLength;
    }
    set dataLength(dataLength) {
        this.state.dataLength = dataLength;
    }
    get queue() {
        return this.state.queue;
    }
    set queue(queue) {
        this.state.queue = queue;
    }
    get line() {
        return this.state.line;
    }
    set line(line) {
        this.state.line = line;
    }
}

class Sender extends events.EventEmitter {
    sp = null; // Streaming Protocol
    state = {
        name: '',
        gcode: '',
        lines: [],
        total: 0,
        sent: 0,
        received: 0,
        startTime: 0,
        finishTime: 0,
        elapsedTime: 0,
        remainingTime: 0,
        changed: false
    };

    // @param {number} [type] Streaming protocol type. 0 for send-response, 1 for character-counting.
    // @param {object} [options] The options object.
    // @param {number} [options.bufferSize] The buffer size used in character-counting streaming protocol. Defaults to 127.
    constructor(type = SP_TYPE_SEND_RESPONSE, options = {}) {
        super();

        // character-counting
        if (type === SP_TYPE_CHAR_COUNTING) {
            this.sp = new SPCharCounting(options, (sp) => {
                if (sp.queue.length > 0) {
                    const lineLength = sp.queue.shift();
                    sp.dataLength -= lineLength;
                }

                while (this.state.sent < this.state.total) {
                    // Remove leading and trailing whitespace from both ends of a string
                    sp.line = sp.line || stripComments(this.state.lines[this.state.sent]).trim();

                    // The newline character (\n) consumed the RX buffer space
                    if ((sp.line.length > 0) && ((sp.dataLength + sp.line.length + 1) >= sp.bufferSize)) {
                        break;
                    }

                    this.state.sent++;
                    this.emit('change');

                    if (sp.line.length === 0) {
                        this.ack(); // ack empty line

                        // continue to the next line if empty
                        continue;
                    }

                    const line = sp.line + '\n';
                    sp.line = '';
                    sp.dataLength += line.length;
                    sp.queue.push(line.length);
                    this.emit('data', line);
                }
            });
        }

        // send-response
        if (type === SP_TYPE_SEND_RESPONSE) {
            this.sp = new SPSendResponse(options, (sp) => {
                while (this.state.sent < this.state.total) {
                    // Remove leading and trailing whitespace from both ends of a string
                    const line = stripComments(this.state.lines[this.state.sent]).trim();

                    this.state.sent++;
                    this.emit('change');

                    if (line.length === 0) {
                        this.ack(); // ack empty line

                        // continue to the next line if empty
                        continue;
                    }

                    this.emit('data', line + '\n');
                    break;
                }
            });
        }

        this.on('change', () => {
            this.state.changed = true;
        });
    }
    toJSON() {
        return {
            sp: this.sp.type,
            name: this.state.name,
            size: this.state.gcode.length,
            total: this.state.total,
            sent: this.state.sent,
            received: this.state.received,
            startTime: this.state.startTime,
            finishTime: this.state.finishTime,
            elapsedTime: this.state.elapsedTime,
            remainingTime: this.state.remainingTime
        };
    }
    // @return {boolean} Returns true on success, false otherwise.
    load(name, gcode = '') {
        if (typeof gcode !== 'string' || !gcode) {
            return false;
        }

        if (this.sp) {
            this.sp.clear();
        }
        this.state.name = name;
        this.state.gcode = gcode;
        this.state.lines = gcode.split('\n')
            .filter(line => (line.trim().length > 0));
        this.state.total = this.state.lines.length;
        this.state.sent = 0;
        this.state.received = 0;
        this.state.startTime = 0;
        this.state.finishTime = 0;
        this.state.elapsedTime = 0;
        this.state.remainingTime = 0;

        this.emit('load', { name: name, gcode: gcode });
        this.emit('change');

        return true;
    }
    unload() {
        if (this.sp) {
            this.sp.clear();
        }
        this.state.name = '';
        this.state.gcode = '';
        this.state.lines = [];
        this.state.total = 0;
        this.state.sent = 0;
        this.state.received = 0;
        this.state.startTime = 0;
        this.state.finishTime = 0;
        this.state.elapsedTime = 0;
        this.state.remainingTime = 0;

        this.emit('unload');
        this.emit('change');
    }
    // Tells the sender an acknowledgement has received.
    // @return {boolean} Returns true on success, false otherwise.
    ack() {
        if (!this.state.gcode) {
            return false;
        }

        this.state.received++;
        this.emit('change');

        return true;
    }
    // Tells the sender to send more data.
    // @return {boolean} Returns true on success, false otherwise.
    next() {
        if (!this.state.gcode) {
            return false;
        }

        const now = new Date().getTime();

        if (this.state.total > 0 && this.state.sent === 0) {
            this.state.startTime = now;
            this.state.finishTime = 0;
            this.state.elapsedTime = 0;
            this.state.remainingTime = 0;
            this.emit('start', { time: this.state.startTime });
            this.emit('change');
        }

        if (this.sp) {
            this.sp.process();
        }

        // Elapsed Time
        this.state.elapsedTime = now - this.state.startTime;

        // Make a 1 second delay before estimating the remaining time
        if (this.state.elapsedTime >= 1000 && this.state.received > 0) {
            const timePerCode = this.state.elapsedTime / this.state.received;
            this.state.remainingTime = (timePerCode * this.state.total - this.state.elapsedTime);
        }

        if (this.state.received >= this.state.total) {
            this.state.finishTime = now;
            this.emit('end', { time: this.state.finishTime });
            this.emit('change');
        }

        return true;
    }
    // Rewinds the internal array pointer.
    // @return {boolean} Returns true on success, false otherwise.
    rewind() {
        if (!this.state.gcode) {
            return false;
        }

        if (this.sp) {
            this.sp.clear();
        }
        this.state.sent = 0;
        this.state.received = 0;
        this.emit('change');

        return true;
    }
    // Checks if there are any state changes. It will also clear the changed flag.
    // @return {boolean} Returns true on state changes, false otherwise.
    peek() {
        if (!this.state.gcode) {
            return false;
        }

        const changed = this.state.changed;
        this.state.changed = false;
        return changed;
    }
}

export default Sender;
