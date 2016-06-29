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
                _.set(result, 'payload.raw', line);
                return result;
            }
        }

        return {
            type: null,
            payload: {
                raw: line
            }
        };
    }
}

//https://github.com/grbl/grbl/blob/master/grbl/report.c
class GrblLineParserResultStatus {
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

        const payload = {};
        const pattern = /[a-zA-Z]+(:([0-9\.\-]+(,[0-9\.\-]+){1,5})|:([0-9\.\-]+))?/g;
        let params = r[1].match(pattern);
        let result = {};

        // Active State
        payload.activeState = params.shift();

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
            payload.machinePosition = {};
            for (let i = 0; i < mPos.length; ++i) {
                payload.machinePosition[axes[i]] = mPos[i];
            }
        }

        { // Work Position
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const wPos = _.get(result, 'WPos') || ['0.000', '0.000', '0.000']; // Defaults to [x, y, z]
            payload.workPosition = {};
            for (let i = 0; i < wPos.length; ++i) {
                payload.workPosition[axes[i]] = wPos[i];
            }
        }

        { // Planner Buffer
            if (result.hasOwnProperty('Buf')) {
                payload.plannerBuffer = _.get(result, 'Buf[0]');
            }
        }

        { // RX Buffer
            if (result.hasOwnProperty('RX')) {
                payload.rxBuffer = _.get(result, 'RX[0]');
            }
        }

        { // Line Number
            if (result.hasOwnProperty('Ln')) {
                payload.lineNumber = _.get(result, 'Ln[0]');
            }
        }

        { // Realtime Rate
            if (result.hasOwnProperty('F')) {
                payload.realtimeRate = _.get(result, 'F[0]');
            }
        }

        { // Limit Pins
            if (result.hasOwnProperty('Lim')) {
                payload.limitPins = _.get(result, 'Lim[0]');
            }
        }

        return {
            type: GrblLineParserResultStatus,
            payload: payload
        };
    }
}

class GrblLineParserResultOk {
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: GrblLineParserResultOk,
            payload: payload
        };
    }
}

class GrblLineParserResultError {
    static parse(line) {
        const r = line.match(/^error:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultError,
            payload: payload
        };
    }
}

class GrblLineParserResultGCodeModes {
    static parse(line) {
        const r = line.match(/^\[(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {};
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
                    _.set(payload, 'modal.' + r.group, word);
                }
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _.set(payload, 'tool', word.substring(1));
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _.set(payload, 'feedrate', word.substring(1));
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _.set(payload, 'spindle', word.substring(1));
            }
        });

        return {
            type: GrblLineParserResultGCodeModes,
            payload: payload
        };
    }
}

class GrblLineParserResultStartup {
    // Grbl 0.9j ['$' for help]
    static parse(line) {
        const r = line.match(/^Grbl\s*(\d+\.\d+[a-zA-Z]?)/);
        if (!r) {
            return null;
        }

        const payload = {
            version: r[1]
        };

        return {
            type: GrblLineParserResultStartup,
            payload: payload
        };
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

        const result = this.parser.parse(data) || {};
        const { type, payload } = result;

        if (type === GrblLineParserResultStatus) {
            if (!_.isEqual(this.status, payload)) {
                this.emit('statuschange', payload);
            }
            this.status = payload;
            this.emit('status', payload);
            return;
        }
        if (type === GrblLineParserResultOk) {
            this.emit('ok', payload);
            return;
        }
        if (type === GrblLineParserResultError) {
            this.emit('error', payload);
            return;
        }
        if (type === GrblLineParserResultGCodeModes) {
            if (!_.isEqual(this.parserstate, payload)) {
                this.emit('parserstatechange', payload);
            }
            this.parserstate = payload;
            this.emit('parserstate', payload);
            return;
        }
        if (type === GrblLineParserResultStartup) {
            this.emit('startup', payload);
            return;
        }
        if (data.length > 0) {
            this.emit('others', payload);
            return;
        }
    }
}

export {
    Grbl,
    GrblLineParser,
    GrblLineParserResultStatus,
    GrblLineParserResultOk,
    GrblLineParserResultError,
    GrblLineParserResultGCodeModes,
    GrblLineParserResultStartup
};
