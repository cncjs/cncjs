import _ from 'lodash';
import events from 'events';
import * as parser from 'gcode-parser';

class GCodeSender extends events.EventEmitter {
    name = '';
    gcode = '';
    remain = [];
    sent = [];
    total = 0;
    createdTime = 0;
    startedTime = 0;
    finishedTime = 0;
    changed = false;

    constructor() {
        super();

        this.on('change', () => {
            this.changed = true;
        });
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
                    return _.map(words, (word) => word[0] + word[1]).join(' ');
                })
                .value();
            this.sent = [];
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
        this.total = 0;
        this.createdTime = 0;
        this.startedTime = 0;
        this.finishedTime = 0;

        this.emit('unload');
        this.emit('change');
    }
    next() {
        let remainLength = this.remain.length;
        let sentLength = this.sent.length;

        if (remainLength === 0 && sentLength === 0) {
            return false;
        }
        if (remainLength === 0) {
            this.finishedTime = new Date().getTime();
            this.emit('done', { time: this.finishedTime });
            this.emit('change');
            return false;
        }
        if (sentLength === 0) {
            this.startedTime = new Date().getTime();
            this.emit('start', { time: this.startedTime });
            this.emit('change');
        }

        let gcode = this.remain.shift();
        this.sent.push(gcode);
        this.emit('change');
        this.emit('progress', { gcode: gcode });

        // Continue to the next line if empty
        if (!gcode) {
            return this.next();
        }

        return gcode;
    }
    rewind() {
        this.remain = this.sent.concat(this.remain);
        this.sent = [];
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
