import _ from 'lodash';
import events from 'events';
import * as parser from 'gcode-parser';

class GCode extends events.EventEmitter {
    name = '';
    gcode = '';
    remain = [];
    sent = [];
    total = 0;
    createdTime = 0;
    startedTime = 0;
    finishedTime = 0;

    _changed = false;

    constructor() {
        super();

        this.on('statuschange', () => {
            this._changed = true;
        });
    }
    load(name, gcode, callback) {
        parser.parseString(gcode, (err, data) => {
            if (err) {
                callback(err);
                return;
            }

            this.name = name;
            this.gcode = gcode;
            this.remain = _.map(data, 'line');
            this.sent = [];
            this.total = this.remain.length;
            this.createdTime = new Date().getTime();
            this.startedTime = 0;
            this.finishedTime = 0;

            this.emit('load', { name: name, gcode: gcode });
            this.emit('statuschange');

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
        this.emit('statuschange');
    }
    next() {
        let remainLength = this.remain.length;
        let sentLength = this.sent.length;

        if (remainLength === 0 && sentLength === 0) {
            return;
        }
        if (remainLength === 0) {
            this.finishedTime = new Date().getTime();
            this.emit('done', { time: this.finishedTime });
            this.emit('statuschange');
            return;
        }
        if (sentLength === 0) {
            this.startedTime = new Date().getTime();
            this.emit('start', { time: this.startedTime });
            this.emit('statuschange');
        }

        let gcode = this.remain.shift();
        if (gcode) {
            this.sent.push(gcode);
            this.emit('progress', { gcode: gcode });
            this.emit('statuschange');
        }

        return gcode;
    }
    rewind() {
        this.remain = this.sent.concat(this.remain);
        this.sent = [];
        this.startedTime = 0;
        this.finishedTime = 0;
        this.emit('statuschange');
    }
    // Returns true if any state have changes
    peek() {
        let changed = this._changed;
        this._changed = false;
        return changed;
    }
}

export { GCode };
