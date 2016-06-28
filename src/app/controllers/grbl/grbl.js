import _ from 'lodash';
import events from 'events';
import settings from '../../config/settings';
import {
    GRBL_ACTIVE_STATES,
    GRBL_MODAL_GROUPS
} from './constants';

class GrblLineParser {
    parse(line) {
        const parsers = [
            GrblLineParserResultStatus,
            GrblLineParserResultOk,
            GrblLineParserResultError,
            GrblLineParserResultGCodeModes,
            GrblLineParserResultStartup
        ];

        for (let parser of parsers) {
            const result = parser.parse(line);
            if (result) {
                return result;
            }
        }

        return null;
    }
}

class GrblLineParserResult {
    raw = '';

    constructor(raw) {
        this.raw = raw;
    }
    toObject() {
        const ret = { ...this };
        return ret;
    }
}

class GrblLineParserResultStatus extends GrblLineParserResult {
    // <Idle>
    // <Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>
    // <Idle,MPos:5.529,0.560,7.000,0.000,WPos:1.529,-5.440,-0.000,0.000>
    // <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000,Buf:0,RX:0,Lim:000>
    // <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000,Buf:0,RX:0,Ln:0,F:0.>
    static parse(line) {
        const r = line.match(/^<(.+)>$/);
        if (!r) {
            return null;
        }

        // See https://github.com/grbl/grbl/blob/master/grbl/report.c
        const ret = new GrblLineParserResultStatus(line);
        const pattern = /[a-zA-Z]+(:([0-9\.\-]+(,[0-9\.\-]+){1,5})|:([0-9\.\-]+))?/g;
        let params = r[1].match(pattern);
        let result = {};

        // Active State
        ret.activeState = params.shift();

        for (let param of params) {
            const nv = param.match(/^(.+):(.+)/);
            if (nv) {
                let type = nv[1];
                let value = nv[2].split(',');
                result[type] = value;
            }
        }

        { // Machine Position
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const mPos = _.get(result, 'MPos') || ['0.000', '0.000', '0.000']; // Defaults to [x, y, z]
            ret.machinePosition = {};
            for (let i = 0; i < mPos.length; ++i) {
                ret.machinePosition[axes[i]] = mPos[i];
            }
        }

        { // Work Position
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const wPos = _.get(result, 'WPos') || ['0.000', '0.000', '0.000']; // Defaults to [x, y, z]
            ret.workPosition = {};
            for (let i = 0; i < wPos.length; ++i) {
                ret.workPosition[axes[i]] = wPos[i];
            }
        }

        { // Planner Buffer
            if (result.hasOwnProperty('Buf')) {
                ret.plannerBuffer = _.get(result, 'Buf[0]');
            }
        }

        { // RX Buffer
            if (result.hasOwnProperty('RX')) {
                ret.rxBuffer = _.get(result, 'RX[0]');
            }
        }

        { // Line Number
            if (result.hasOwnProperty('Ln')) {
                ret.lineNumber = _.get(result, 'Ln[0]');
            }
        }

        { // Realtime Rate
            if (result.hasOwnProperty('F')) {
                ret.realtimeRate = _.get(result, 'F[0]');
            }
        }

        { // Limit Pins
            if (result.hasOwnProperty('Lim')) {
                ret.limitPins = _.get(result, 'Lim[0]');
            }
        }

        return ret;
    }
}

class GrblLineParserResultOk extends GrblLineParserResult {
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const ret = new GrblLineParserResultOk(line);
        return ret;
    }
}

class GrblLineParserResultError extends GrblLineParserResult {
    static parse(line) {
        const r = line.match(/^error:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const ret = new GrblLineParserResultError(line);
        ret.message = r[1];
        return ret;
    }
}

class GrblLineParserResultGCodeModes extends GrblLineParserResult {
    static parse(line) {
        const r = line.match(/^\[(.+)\]$/);
        if (!r) {
            return null;
        }

        const ret = new GrblLineParserResultGCodeModes(line);
        const words = _(r[1].split(' '))
            .compact()
            .map((word) => {
                return _.trim(word);
            })
            .value();

        words.forEach((word) => {
            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                let r = _.find(GRBL_MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, word);
                });

                if (r) {
                    _.set(ret, 'modal.' + r.group, word);
                }
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _.set(ret, 'tool', word.substring(1));
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _.set(ret, 'feedrate', word.substring(1));
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _.set(ret, 'spindle', word.substring(1));
            }
        });

        return ret;
    }
}

class GrblLineParserResultStartup extends GrblLineParserResult {
    // Grbl 0.9j ['$' for help]
    static parse(line) {
        const r = line.match(/^Grbl\s*(\d+\.\d+[a-zA-Z]?)/);
        if (!r) {
            return null;
        }

        const ret = new GrblLineParserResultStartup(line);
        ret.version = r[1];
        return ret;
    }
}

class Grbl extends events.EventEmitter {
    status = {};
    parserstate = {
        modal: {
            motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
            coordinate: 'G54', // G54, G55, G56, G57, G58, G59
            plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
            units: 'G21', // G20: Inches, G21: Millimeters
            distance: 'G90', // G90: Absolute, G91: Relative
            feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
            program: 'M0',
            spindle: 'M5',
            coolant: 'M9'
        },
        tool: '',
        feedrate: '',
        spindle: ''
    };
    parser = new GrblLineParser();

    getActiveState() {
        const { activeState } = this.status;

        // Idle, Run, Hold, Door, Home, Alarm, Check
        console.assert(_.includes(GRBL_ACTIVE_STATES, activeState), activeState);

        return activeState;
    }
    parse(data) {
        data = ('' + data).replace(/\s+$/, '');
        if (settings.debug) {
            // console.log('<<', data);
        }
        if (!data) {
            return;
        }

        this.emit('raw', data);

        const result = this.parser.parse(data);

        if (result instanceof GrblLineParserResultStatus) {
            if (!_.isEqual(this.status, result)) {
                this.emit('statuschange', result);
            }
            this.status = result;
            this.emit('status', result);
            return;
        }
        if (result instanceof GrblLineParserResultOk) {
            this.emit('ok', result);
            return;
        }
        if (result instanceof GrblLineParserResultError) {
            this.emit('error', result);
            return;
        }
        if (result instanceof GrblLineParserResultGCodeModes) {
            if (!_.isEqual(this.parserstate, result)) {
                this.emit('parserstatechange', result);
            }
            this.parserstate = result;
            this.emit('parserstate', result);
            return;
        }
        if (result instanceof GrblLineParserResultStartup) {
            this.emit('startup', result);
            return;
        }
        if (data.length > 0) {
            this.emit('others', { raw: data });
            return;
        }
    }
}

export {
    Grbl,
    GrblLineParser,
    GrblLineParserResult,
    GrblLineParserResultStartup
};
