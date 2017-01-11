import events from 'events';

export const SP_TYPE_SEND_RESPONSE = 0;
export const SP_TYPE_CHAR_COUNTING = 1;

const noop = () => {};
const stripLine = (() => {
    const re1 = new RegExp(/\s*[%#;].*/g); // Strip everything after %, #, or ; to the end of the line, including preceding spaces
    const re2 = new RegExp(/\s*\(.*\)/g); // Remove anything inside the parentheses
    return line => line.replace(re1, '').replace(re2, '').trim();
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
        bufferSize: 120, // Defaults to 120
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
        this.state.bufferSize = 120; // Defaults to 120
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
        createdTime: 0,
        startedTime: 0,
        finishedTime: 0,
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
                    sp.line = sp.line || stripLine(this.state.lines[this.state.sent]);

                    if (sp.line.length + sp.dataLength >= sp.bufferSize) {
                        break;
                    }

                    const line = sp.line;
                    sp.line = '';

                    this.state.sent++;
                    this.emit('change');

                    if (line.length > 0) {
                        sp.dataLength += line.length;
                        sp.queue.push(line.length);
                        this.emit('data', line);
                    } else {
                        this.ack(); // Ack for empty lines
                    }

                    // Continue to the next line if empty
                }
            });
        }

        // send-response
        if (type === SP_TYPE_SEND_RESPONSE) {
            this.sp = new SPSendResponse(options, (sp) => {
                while (this.state.sent < this.state.total) {
                    const line = stripLine(this.state.lines[this.state.sent]);

                    this.state.sent++;

                    this.emit('change');

                    if (line.length > 0) {
                        this.emit('data', line);
                        break;
                    }

                    this.ack(); // Ack for empty lines

                    // Continue to the next line if empty
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
            createdTime: this.state.createdTime,
            startedTime: this.state.startedTime,
            finishedTime: this.state.finishedTime
        };
    }
    load(name, gcode = '') {
        if (typeof gcode !== 'string') {
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
        this.state.createdTime = new Date().getTime();
        this.state.startedTime = 0;
        this.state.finishedTime = 0;

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
        this.state.createdTime = 0;
        this.state.startedTime = 0;
        this.state.finishedTime = 0;

        this.emit('unload');
        this.emit('change');
    }
    next() {
        if (this.state.total === 0) {
            return;
        }
        if (this.state.total > 0 && this.state.sent === 0) {
            this.state.startedTime = new Date().getTime();
            this.emit('start', { time: this.state.startedTime });
            this.emit('change');
        }

        if (this.sp) {
            this.sp.process();
        }

        if (this.state.sent >= this.state.total) {
            this.state.finishedTime = new Date().getTime();
            this.emit('end', { time: this.state.finishedTime });
            this.emit('change');
        }
    }
    rewind() {
        if (this.sp) {
            this.sp.clear();
        }
        this.state.sent = 0;
        this.state.received = 0;
        this.state.startedTime = 0;
        this.state.finishedTime = 0;
        this.emit('change');
    }
    ack() {
        this.state.received++;
        this.emit('change');
    }
    // Returns true if any state have changes
    peek() {
        const changed = this.state.changed;
        this.state.changed = false;
        return changed;
    }
}

export default Sender;
