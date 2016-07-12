import _ from 'lodash';
import events from 'events';
import {
    GRBL_ACTIVE_STATE_UNKNOWN,
    GRBL_MODAL_GROUPS
} from './constants';

class GrblLineParser {
    parse(line) {
        const parsers = [
            GrblLineParserResultStatus,
            GrblLineParserResultOk,
            GrblLineParserResultError,
            GrblLineParserResultAlarm,
            GrblLineParserResultParserState,
            GrblLineParserResultParameters,
            GrblLineParserResultFeedback,
            GrblLineParserResultSettings,
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
        const pattern = /[a-zA-Z]+(:[0-9\.\-]+(,[0-9\.\-]+){0,5})?/g;
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

// https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl#grbl-response-meanings
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

// https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl#alarms
class GrblLineParserResultAlarm {
    static parse(line) {
        const r = line.match(/^ALARM:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultAlarm,
            payload: payload
        };
    }
}

class GrblLineParserResultParserState {
    static parse(line) {
        // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
        const r = line.match(/^\[((?:[a-zA-Z][0-9]+(?:\.[0-9]*)?\s*)+)\]$/);
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
            type: GrblLineParserResultParserState,
            payload: payload
        };
    }
}

class GrblLineParserResultParameters {
    static parse(line) {
        const r = line.match(/^\[(G54|G55|G56|G57|G58|G59|G28|G30|G92|TLO|PRB):(.+)\]$/);
        if (!r) {
            return null;
        }

        const [full, key, value] = r;
        const payload = {
            [key]: {}
        };

        if (_.includes(['G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G28', 'G30', 'G92'], key)) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const list = value.split(',');
            for (let i = 0; i < list.length; ++i) {
                payload[key][axes[i]] = list[i];
            }
        }

        // [TLO:0.000]
        if (key === 'TLO') {
            payload[key].value = value;
        }

        // [PRB:0.000,0.000,1.492:1]
        if (key === 'PRB') {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const [str, result] = value.split(':');
            const list = str.split(',');
            payload[key].result = Number(result);
            for (let i = 0; i < list.length; ++i) {
                payload[key][axes[i]] = list[i];
            }
        }

        return {
            type: GrblLineParserResultParameters,
            payload: payload
        };
    }
}

// https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl#feedback-messages
class GrblLineParserResultFeedback {
    static parse(line) {
        const r = line.match(/^\[(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultFeedback,
            payload: payload
        };
    }
}

class GrblLineParserResultSettings {
    static parse(line) {
        const r = line.match(/^(\$[^=]+)=([^ ]*)\s*(.*)/);
        if (!r) {
            return null;
        }

        const payload = {
            name: r[1],
            value: r[2],
            message: _.trim(r[3], '()')
        };

        return {
            type: GrblLineParserResultSettings,
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
    state = {
        status: {
            activeState: GRBL_ACTIVE_STATE_UNKNOWN,
            machinePosition: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            workPosition: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            }
        },
        parserstate: {
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
        }
    };
    parser = new GrblLineParser();

    parse(data) {
        data = ('' + data).replace(/\s+$/, '');
        if (!data) {
            return;
        }

        this.emit('raw', { raw: data });

        const result = this.parser.parse(data) || {};
        const { type, payload } = result;

        if (type === GrblLineParserResultStatus) {
            if (!_.isEqual(this.state.status, payload)) {
                this.emit('statuschange', payload);
                this.state = {
                    ...this.state,
                    status: {
                        ...this.state.status,
                        ...payload
                    }
                };
            }
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
        if (type === GrblLineParserResultAlarm) {
            this.emit('alarm', payload);
            return;
        }
        if (type === GrblLineParserResultParserState) {
            if (!_.isEqual(this.state.parserstate, payload)) {
                this.emit('parserstatechange', payload);
                this.state = {
                    ...this.state,
                    parserstate: {
                        ...this.state.parserstate,
                        ...payload
                    }
                };
            }
            this.emit('parserstate', payload);
            return;
        }
        if (type === GrblLineParserResultParameters) {
            this.emit('parameters', payload);
            return;
        }
        if (type === GrblLineParserResultFeedback) {
            this.emit('feedback', payload);
            return;
        }
        if (type === GrblLineParserResultSettings) {
            this.emit('settings', payload);
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
    GrblLineParser,
    GrblLineParserResultStatus,
    GrblLineParserResultOk,
    GrblLineParserResultError,
    GrblLineParserResultAlarm,
    GrblLineParserResultParserState,
    GrblLineParserResultParameters,
    GrblLineParserResultFeedback,
    GrblLineParserResultSettings,
    GrblLineParserResultStartup
};
export default Grbl;
