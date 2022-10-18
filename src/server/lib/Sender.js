/* eslint max-classes-per-file: 0 */
import events from 'events';

export const SP_TYPE_SEND_RESPONSE = 0;
export const SP_TYPE_CHAR_COUNTING = 1;

const noop = () => {};

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
    // streaming protocol
    sp = null;

    state = {
        hold: false,
        holdReason: null,
        name: '',
        gcode: '',
        context: {},
        lines: [],
        total: 0,
        sent: 0,
        received: 0,
        startTime: 0,
        finishTime: 0,
        elapsedTime: 0,
        remainingTime: 0,
        message: null
    };

    stateChanged = false;

    dataFilter = null;

    // @param {number} [type] Streaming protocol type. 0 for send-response, 1 for character-counting.
    // @param {object} [options] The options object.
    // @param {number} [options.bufferSize] The buffer size used in character-counting streaming protocol. Defaults to 127.
    // @param {function} [options.dataFilter] A function to be used to handle the data. The function accepts two arguments: The data to be sent to the controller, and the context.
    constructor(type = SP_TYPE_SEND_RESPONSE, options = {}) {
        super();

        if (typeof options.dataFilter === 'function') {
            this.dataFilter = options.dataFilter;
        }

        // character-counting
        if (type === SP_TYPE_CHAR_COUNTING) {
            this.sp = new SPCharCounting(options, (sp) => {
                if (sp.queue.length > 0) {
                    const lineLength = sp.queue.shift();
                    sp.dataLength -= lineLength;
                }

                while (!this.state.hold && (this.state.sent < this.state.total)) {
                    // Remove leading and trailing whitespace from both ends of a string
                    sp.line = sp.line || this.state.lines[this.state.sent].trim();

                    if (this.dataFilter) {
                        sp.line = this.dataFilter(sp.line, this.state.context) || '';
                    }

                    if (sp.line.toUpperCase().startsWith('(MSG')) {
                        let startChar = (sp.line[4] === ',' ? 5 : 4);
                        const msg = sp.line.substring(startChar, sp.line.length - 1).trim();
                        this.state.message = msg;
                    }

                    // The newline character (\n) consumed the RX buffer space
                    if ((sp.line.length > 0) && ((sp.dataLength + sp.line.length + 1) >= sp.bufferSize)) {
                        break;
                    }

                    this.state.sent++;
                    this.emit('change');

                    if (sp.line.length === 0) {
                        this.ack(); // ack empty line
                        continue;
                    }

                    const line = sp.line + '\n';
                    sp.line = '';
                    sp.dataLength += line.length;
                    sp.queue.push(line.length);
                    this.emit('data', line, this.state.context);
                }
            });
        }

        // send-response
        if (type === SP_TYPE_SEND_RESPONSE) {
            this.sp = new SPSendResponse(options, (sp) => {
                while (!this.state.hold && (this.state.sent < this.state.total)) {
                    // Remove leading and trailing whitespace from both ends of a string
                    let line = this.state.lines[this.state.sent].trim();

                    if (this.dataFilter) {
                        line = this.dataFilter(line, this.state.context) || '';
                    }

                    if (line.toUpperCase().startsWith('(MSG')) {
                        let startChar = (line[4] === ',' ? 5 : 4);
                        const msg = line.substring(startChar, line.length - 1).trim();
                        this.state.message = msg;
                    }

                    this.state.sent++;
                    this.emit('change');

                    if (line.length === 0) {
                        this.ack(); // ack empty line
                        continue;
                    }

                    this.emit('data', line + '\n', this.state.context);
                    break;
                }
            });
        }

        this.on('change', () => {
            this.stateChanged = true;
        });
    }

    toJSON() {
        const sendMessage = this.state.message;
        this.state.message = null;

        return {
            sp: this.sp.type,
            hold: this.state.hold,
            holdReason: this.state.holdReason,
            name: this.state.name,
            context: this.state.context,
            size: this.state.gcode.length,
            total: this.state.total,
            sent: this.state.sent,
            received: this.state.received,
            startTime: this.state.startTime,
            finishTime: this.state.finishTime,
            elapsedTime: this.state.elapsedTime,
            remainingTime: this.state.remainingTime,
            message: sendMessage
        };
    }

    hold(reason) {
        if (this.state.hold) {
            return;
        }
        this.state.hold = true;
        this.state.holdReason = reason;
        this.emit('hold');
        this.emit('change');
    }

    unhold() {
        if (!this.state.hold) {
            return;
        }
        this.state.hold = false;
        this.state.holdReason = null;
        this.emit('unhold');
        this.emit('change');
    }

    // @return {boolean} Returns true on success, false otherwise.
    load(name, gcode = '', context = {}) {
        if (typeof gcode !== 'string' || !gcode) {
            return false;
        }

        const lines = gcode.split('\n')
            .filter(line => (line.trim().length > 0));

        if (this.sp) {
            this.sp.clear();
        }
        this.state.hold = false;
        this.state.holdReason = null;
        this.state.name = name;
        this.state.gcode = gcode;
        this.state.context = context;
        this.state.lines = lines;
        this.state.total = this.state.lines.length;
        this.state.sent = 0;
        this.state.received = 0;
        this.state.startTime = 0;
        this.state.finishTime = 0;
        this.state.elapsedTime = 0;
        this.state.remainingTime = 0;
        this.state.message = '';

        this.emit('load', name, gcode, context);
        this.emit('change');

        return true;
    }

    unload() {
        if (this.sp) {
            this.sp.clear();
        }
        this.state.hold = false;
        this.state.holdReason = null;
        this.state.name = '';
        this.state.gcode = '';
        this.state.context = {};
        this.state.lines = [];
        this.state.total = 0;
        this.state.sent = 0;
        this.state.received = 0;
        this.state.startTime = 0;
        this.state.finishTime = 0;
        this.state.elapsedTime = 0;
        this.state.remainingTime = 0;
        this.state.message = '';

        this.emit('unload');
        this.emit('change');
    }

    // Tells the sender an acknowledgement has received.
    // @return {boolean} Returns true on success, false otherwise.
    ack() {
        if (!this.state.gcode) {
            return false;
        }

        if (this.state.received >= this.state.sent) {
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
            this.state.message = '';
            this.emit('start', this.state.startTime);
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
            if (this.state.finishTime === 0) {
                // avoid issue 'end' multiple times
                this.state.finishTime = now;
                this.emit('end', this.state.finishTime);
                this.emit('change');
            }
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
        this.state.hold = false; // clear hold off state
        this.state.holdReason = null;
        this.state.sent = 0;
        this.state.received = 0;
        this.emit('change');

        return true;
    }

    // Checks if there are any state changes. It also clears the stateChanged flag.
    // @return {boolean} Returns true on state changes, false otherwise.
    peek() {
        const stateChanged = this.stateChanged;
        this.stateChanged = false;
        return stateChanged;
    }
}

export default Sender;
