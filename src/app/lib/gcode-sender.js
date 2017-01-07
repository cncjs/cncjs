import _ from 'lodash';
import events from 'events';

export const STREAMING_PROTOCOL_SEND_RESPONSE = 0;
export const STREAMING_PROTOCOL_CHAR_COUNTING = 1;

const stripLine = (() => {
    const re1 = new RegExp(/\s*[%#;].*/g); // Strip everything after %, #, or ; to the end of the line, including preceding spaces
    const re2 = new RegExp(/\s*\(.*\)/g); // Remove anything inside the parentheses
    return line => line.replace(re1, '').replace(re2, '').trim();
})();

class GCodeSender extends events.EventEmitter {
    protocol = STREAMING_PROTOCOL_SEND_RESPONSE;
    // The following properties are only used in character-counting streaming protocol
    transmitBufferSize = 127; // Defaults to 127
    transmitDataLength = 0;
    transmitDataQueue = [];
    transmitLine = '';

    name = '';
    gcode = '';
    lines = [];
    total = 0;
    sent = 0;
    received = 0;
    createdTime = 0;
    startedTime = 0;
    finishedTime = 0;
    changed = false;

    // @param {number} [protocol] The streaming protocol. 0 for send-response (default), 1 for character-counting.
    // @param {object} [options] The options object.
    // @param {number} [options.bufferSize] The buffer size used in character-counting streaming protocol. Defaults to 127.
    constructor(protocol = STREAMING_PROTOCOL_SEND_RESPONSE, options = {}) {
        super();

        if (_.includes([
            STREAMING_PROTOCOL_SEND_RESPONSE,
            STREAMING_PROTOCOL_CHAR_COUNTING
        ], protocol)) {
            this.protocol = protocol;
        }

        if (this.protocol === STREAMING_PROTOCOL_CHAR_COUNTING) {
            const { bufferSize } = { ...options };

            if (_.isNumber(bufferSize) && bufferSize > 0) {
                this.transmitBufferSize = bufferSize;
            }
        }

        this.on('change', () => {
            this.changed = true;
        });
    }
    get state() {
        return {
            protocol: this.protocol,
            name: this.name,
            size: this.gcode.length,
            total: this.total,
            sent: this.sent,
            received: this.received,
            createdTime: this.createdTime,
            startedTime: this.startedTime,
            finishedTime: this.finishedTime
        };
    }
    load(name, gcode = '') {
        if (typeof gcode !== 'string') {
            return false;
        }

        this.transmitDataLength = 0;
        this.transmitDataQueue = [];
        this.transmitLine = '';

        this.name = name;
        this.gcode = gcode;
        this.lines = gcode.split('\n')
            .filter(line => (line.trim().length > 0));
        this.total = this.lines.length;
        this.sent = 0;
        this.createdTime = new Date().getTime();
        this.startedTime = 0;
        this.finishedTime = 0;

        this.emit('load', { name: name, gcode: gcode });
        this.emit('change');

        return true;
    }
    unload() {
        this.transmitDataLength = 0;
        this.transmitDataQueue = [];
        this.transmitLine = '';

        this.name = '';
        this.gcode = '';
        this.total = 0;
        this.sent = 0;
        this.createdTime = 0;
        this.startedTime = 0;
        this.finishedTime = 0;

        this.emit('unload');
        this.emit('change');
    }
    next() {
        if (this.total === 0) {
            return;
        }
        if (this.total > 0 && this.sent === 0) {
            this.startedTime = new Date().getTime();
            this.emit('start', { time: this.startedTime });
            this.emit('change');
        }

        const streamingMethod = {
            [STREAMING_PROTOCOL_SEND_RESPONSE]: () => {
                while (this.sent < this.total) {
                    const line = this.lines[this.sent];
                    const gcode = stripLine(line);

                    this.sent++;

                    this.emit('change');

                    if (gcode.length > 0) {
                        this.emit('gcode', gcode);
                        break;
                    }

                    this.ack(); // Ack for empty lines

                    // Continue to the next line if empty
                }
            },
            [STREAMING_PROTOCOL_CHAR_COUNTING]: () => {
                if (this.transmitDataQueue.length > 0) {
                    const dataLength = this.transmitDataQueue.shift();
                    this.transmitDataLength -= dataLength;
                }

                while (this.sent < this.total) {
                    const line = this.lines[this.sent];
                    this.transmitLine = this.transmitLine || stripLine(line);

                    if (this.transmitLine.length + this.transmitDataLength >= this.transmitBufferSize) {
                        break;
                    }

                    const gcode = this.transmitLine;
                    this.transmitLine = ''; // clear transmitLine

                    this.sent++;
                    this.emit('change');

                    if (gcode.length > 0) {
                        this.transmitDataLength += gcode.length;
                        this.transmitDataQueue.push(gcode.length);
                        this.emit('gcode', gcode);
                    } else {
                        this.ack(); // Ack for empty lines
                    }

                    // Continue to the next line if empty
                }
            }
        }[this.protocol];

        streamingMethod && streamingMethod();

        if (this.sent >= this.total) {
            this.finishedTime = new Date().getTime();
            this.emit('done', { time: this.finishedTime });
            this.emit('change');
        }
    }
    rewind() {
        this.transmitDataLength = 0;
        this.transmitDataQueue = [];
        this.transmitLine = '';

        this.sent = 0;
        this.received = 0;
        this.startedTime = 0;
        this.finishedTime = 0;
        this.emit('change');
    }
    ack() {
        this.received++;
        this.emit('change');
    }
    // Returns true if any state have changes
    peek() {
        const changed = this.changed;
        this.changed = false;
        return changed;
    }
}

export default GCodeSender;
