import _ from 'lodash';
import events from 'events';
import * as parser from 'gcode-parser';

export const STREAMING_PROTOCOL_SEND_RESPONSE = 0;
export const STREAMING_PROTOCOL_CHAR_COUNTING = 1;

const DEFAULT_STREAMING_BUFFER_SIZE = 127;

class GCodeSender extends events.EventEmitter {
    name = '';
    gcode = '';
    remain = [];
    sent = [];
    streamingBufferSize = DEFAULT_STREAMING_BUFFER_SIZE;
    streamingProtocol = STREAMING_PROTOCOL_SEND_RESPONSE;
    streamingQueue = []; // used in char-counting streaming protocol
    total = 0;
    createdTime = 0;
    startedTime = 0;
    finishedTime = 0;
    changed = false;

    // @param {number} streamingProtocol The streaming protocol. 0 for send-response (default), 1 for character-counting.
    // @param {number} streamingBufferSize The buffer size used in character-counting streaming protocol. Defaults to 127.
    constructor(options) {
        super();

        const {
            streamingProtocol = STREAMING_PROTOCOL_SEND_RESPONSE,
            streamingBufferSize = DEFAULT_STREAMING_BUFFER_SIZE
        } = { ...options };

        if (_.includes([
            STREAMING_PROTOCOL_SEND_RESPONSE,
            STREAMING_PROTOCOL_CHAR_COUNTING
        ], streamingProtocol)) {
            this.streamingProtocol = streamingProtocol;
        }
        if (_.isNumber(streamingBufferSize) && streamingBufferSize > 0) {
            this.streamingBufferSize = streamingBufferSize;
        }

        this.on('change', () => {
            this.changed = true;
        });
    }
    get state() {
        return {
            name: this.name,
            size: this.gcode.length,
            remain: this.remain.length,
            sent: this.sent.length,
            total: this.total,
            streaming: {
                proto: this.streamingProtocol,
                queue: this.streamingQueue.join('').length
            },
            createdTime: this.createdTime,
            startedTime: this.startedTime,
            finishedTime: this.finishedTime
        };
    }
    load(name, gcode, callback) {
        parser.parseString(gcode, (err, results) => {
            if (err) {
                callback(err);
                return;
            }

            this.name = name;
            this.gcode = gcode;
            this.remain = _(results)
                .map('words')
                .map((words) => {
                    return _.map(words, (word) => word[0] + word[1]).join(' ') + '\n';
                })
                .value();
            this.sent = [];
            this.streamingQueue = [];
            this.total = this.remain.length;
            this.createdTime = new Date().getTime();
            this.startedTime = 0;
            this.finishedTime = 0;

            this.emit('load', { name: name, gcode: gcode });
            this.emit('change');

            callback();
        });
    }
    unload() {
        this.name = '';
        this.gcode = '';
        this.remain = [];
        this.sent = [];
        this.streamingQueue = [];
        this.total = 0;
        this.createdTime = 0;
        this.startedTime = 0;
        this.finishedTime = 0;

        this.emit('unload');
        this.emit('change');
    }
    next() {
        if (this.remain.length === 0 && this.sent.length === 0) {
            return;
        }
        if (this.remain.length > 0 && this.sent.length === 0) {
            this.startedTime = new Date().getTime();
            this.emit('start', { time: this.startedTime });
            this.emit('change');
        }

        const streamingMethod = {
            [STREAMING_PROTOCOL_SEND_RESPONSE]: () => {
                while (this.remain.length > 0) {
                    const gcode = this.remain.shift();
                    this.sent.push(gcode);
                    this.emit('change');

                    if (gcode.trim().length > 0) {
                        this.emit('gcode', gcode);
                        break;
                    }

                    // Continue to the next line if empty
                }
            },
            [STREAMING_PROTOCOL_CHAR_COUNTING]: () => {
                this.streamingQueue.shift();

                while (this.remain.length > 0) {
                    const gcode = this.remain.shift();
                    const streamingQueueLength = this.streamingQueue.join('').length;

                    if (gcode.length + streamingQueueLength >= this.streamingBufferSize) {
                        this.remain.unshift(gcode);
                        break;
                    }

                    this.sent.push(gcode);
                    this.emit('change');

                    if (gcode.trim().length > 0) {
                        this.streamingQueue.push(gcode);
                        this.emit('gcode', gcode);
                    }

                    // Continue to the next line if empty
                }
            }
        }[this.streamingProtocol];

        streamingMethod && streamingMethod();

        if (this.remain.length === 0) {
            this.finishedTime = new Date().getTime();
            this.emit('done', { time: this.finishedTime });
            this.emit('change');
        }
    }
    rewind() {
        this.remain = this.sent.concat(this.remain);
        this.sent = [];
        this.streamingQueue = [];
        this.startedTime = 0;
        this.finishedTime = 0;
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
