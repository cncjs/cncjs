/* eslint no-bitwise: ["error", { "allow": ["&", "<<"] }] */
/* eslint no-continue: 0 */
import _ from 'lodash';
import events from 'events';
import {
    GRBL_ACTIVE_STATE_ALARM,
    GRBL_MODAL_GROUPS
} from './constants';

// http://stackoverflow.com/questions/10454518/javascript-how-to-retrieve-the-number-of-decimals-of-a-string-number
function decimalPlaces(num) {
    const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) {
        return 0;
    }
    return Math.max(
        0,
        // Number of digits right of decimal point.
        (match[1] ? match[1].length : 0)
        // Adjust for scientific notation.
        - (match[2] ? +match[2] : 0)
    );
}

// Grbl v1.1
// https://github.com/gnea/grbl/blob/edge/doc/markdown/interface.md

class GrblLineParser {
    parse(line) {
        const parsers = [
            // <>
            GrblLineParserResultStatus,

            // ok
            GrblLineParserResultOk,

            // error:x
            GrblLineParserResultError,

            // ALARM:
            GrblLineParserResultAlarm,

            // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.] (v0.9)
            // [GC:G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.] (v1.1)
            GrblLineParserResultParserState,

            // [G54:0.000,0.000,0.000]
            // [G55:0.000,0.000,0.000]
            // [G56:0.000,0.000,0.000]
            // [G57:0.000,0.000,0.000]
            // [G58:0.000,0.000,0.000]
            // [G59:0.000,0.000,0.000]
            // [G28:0.000,0.000,0.000]
            // [G30:0.000,0.000,0.000]
            // [G92:0.000,0.000,0.000]
            // [TLO:0.000]
            // [PRB:0.000,0.000,0.000:0]
            GrblLineParserResultParameters,

            // [HLP:] (v1.1)
            GrblLineParserResultHelp,

            // [VER:] (v1.1)
            GrblLineParserResultVersion,

            // [OPT:] (v1.1)
            GrblLineParserResultOption,

            // [echo:] (v1.1)
            GrblLineParserResultEcho,

            // [] (v0.9)
            // [MSG:] (v1.1)
            GrblLineParserResultFeedback,

            // $xx
            GrblLineParserResultSettings,

            // Grbl X.Xx ['$' for help]
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
    // * Grbl v0.9
    //   <Idle>
    //   <Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>
    //   <Idle,MPos:5.529,0.560,7.000,0.000,WPos:1.529,-5.440,-0.000,0.000>
    //   <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000,Buf:0,RX:0,Lim:000>
    //   <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000,Buf:0,RX:0,Ln:0,F:0.>
    // * Grbl v1.1
    //   <Idle|MPos:3.000,2.000,0.000|FS:0,0>
    //   <Hold:0|MPos:5.000,2.000,0.000|FS:0,0>
    //   <Idle|MPos:5.000,2.000,0.000|FS:0,0|Ov:100,100,100>
    //   <Idle|MPos:5.000,2.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
    //   <Run|MPos:23.036,1.620,0.000|FS:500,0>
    static parse(line) {
        const r = line.match(/^<(.+)>$/);
        if (!r) {
            return null;
        }

        const payload = {};
        const pattern = /[a-zA-Z]+(:[0-9\.\-]+(,[0-9\.\-]+){0,5})?/g;
        const params = r[1].match(pattern);
        const result = {};

        { // Active State (v0.9, v1.1)
            // * Valid states types: Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep
            // * Sub-states may be included via : a colon delimiter and numeric code.
            // * Current sub-states are:
            //   - Hold:0 Hold complete. Ready to resume.
            //   - Hold:1 Hold in-progress. Reset will throw an alarm.
            //   - Door:0 Door closed. Ready to resume.
            //   - Door:1 Machine stopped. Door still ajar. Can't resume until closed.
            //   - Door:2 Door opened. Hold (or parking retract) in-progress. Reset will throw an alarm.
            //   - Door:3 Door closed and resuming. Restoring from park, if applicable. Reset will throw an alarm.
            const states = (params.shift() || '').split(':');
            payload.activeState = states[0] || '';
            payload.subState = Number(states[1] || '');
        }

        for (let param of params) {
            const nv = param.match(/^(.+):(.+)/);
            if (nv) {
                let type = nv[1];
                let value = nv[2].split(',');
                result[type] = value;
            }
        }

        // Machine Position (v0.9, v1.1)
        if (_.has(result, 'MPos')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const mPos = _.get(result, 'MPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.mpos = {};
            for (let i = 0; i < mPos.length; ++i) {
                payload.mpos[axes[i]] = mPos[i];
            }
        }

        // Work Position (v0.9, v1.1)
        if (_.has(result, 'WPos')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const wPos = _.get(result, 'WPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.wpos = {};
            for (let i = 0; i < wPos.length; ++i) {
                payload.wpos[axes[i]] = wPos[i];
            }
        }

        // Work Coordinate Offset (v1.1)
        if (_.has(result, 'WCO')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const wco = _.get(result, 'WCO', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.wco = {};
            for (let i = 0; i < wco.length; ++i) {
                payload.wco[axes[i]] = wco[i];
            }
        }

        // Planner Buffer (v0.9)
        if (_.has(result, 'Buf')) {
            payload.buf = payload.buf || {};
            payload.buf.planner = Number(_.get(result, 'Buf[0]', 0));
        }

        // RX Buffer (v0.9)
        if (_.has(result, 'RX')) {
            payload.buf = payload.buf || {};
            payload.buf.rx = Number(_.get(result, 'RX[0]', 0));
        }

        // Buffer State (v1.1)
        // Bf:15,128. The first value is the number of available blocks in the planner buffer and the second is number of available bytes in the serial RX buffer.
        if (_.has(result, 'Bf')) {
            payload.buf = payload.buf || {};
            payload.buf.planner = Number(_.get(result, 'Bf[0]', 0));
            payload.buf.rx = Number(_.get(result, 'Bf[1]', 0));
        }

        // Line Number (v0.9, v1.1)
        // Ln:99999 indicates line 99999 is currently being executed.
        if (_.has(result, 'Ln')) {
            payload.ln = Number(_.get(result, 'Ln[0]', 0));
        }

        // Feed Rate (v0.9, v1.1)
        // F:500 contains real-time feed rate data as the value.
        // This appears only when VARIABLE_SPINDLE is disabled.
        if (_.has(result, 'F')) {
            payload.feedrate = Number(_.get(result, 'F[0]', 0));
        }

        // Current Feed and Speed (v1.1)
        // FS:500,8000 contains real-time feed rate, followed by spindle speed, data as the values.
        if (_.has(result, 'FS')) {
            payload.feedrate = Number(_.get(result, 'FS[0]', 0));
            payload.spindle = Number(_.get(result, 'FS[1]', 0));
        }

        // Limit Pins (v0.9)
        // X_AXIS is (1<<0) or bit 0
        // Y_AXIS is (1<<1) or bit 1
        // Z_AXIS is (1<<2) or bit 2
        if (_.has(result, 'Lim')) {
            const value = Number(_.get(result, 'Lim[0]', 0));
            payload.pinState = [
                (value & (1 << 0)) ? 'X' : '',
                (value & (1 << 1)) ? 'Y' : '',
                (value & (1 << 2)) ? 'Z' : '',
                (value & (1 << 2)) ? 'A' : ''
            ].join('');
        }

        // Input Pin State (v1.1)
        // * Pn:XYZPDHRS indicates which input pins Grbl has detected as 'triggered'.
        // * Each letter of XYZPDHRS denotes a particular 'triggered' input pin.
        //   - X Y Z XYZ limit pins, respectively
        //   - P the probe pin.
        //   - D H R S the door, hold, soft-reset, and cycle-start pins, respectively.
        //   - Example: Pn:PZ indicates the probe and z-limit pins are 'triggered'.
        //   - Note: A may be added in later versions for an A-axis limit pin.
        if (_.has(result, 'Pn')) {
            payload.pinState = _.get(result, 'Pn[0]', '');
        }

        // Override Values (v1.1)
        // Ov:100,100,100 indicates current override values in percent of programmed values for feed, rapids, and spindle speed, respectively.
        if (_.has(result, 'Ov')) {
            payload.ov = _.get(result, 'Ov', []).map(v => Number(v));
        }

        // Accessory State (v1.1)
        // * A:SFM indicates the current state of accessory machine components, such as the spindle and coolant.
        // * Each letter after A: denotes a particular state. When it appears, the state is enabled. When it does not appear, the state is disabled.
        //   - S indicates spindle is enabled in the CW direction. This does not appear with C.
        //   - C indicates spindle is enabled in the CCW direction. This does not appear with S.
        //   - F indicates flood coolant is enabled.
        //   - M indicates mist coolant is enabled.
        if (_.has(result, 'A')) {
            payload.accessoryState = _.get(result, 'A[0]', '');
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
    // * Grbl v0.9
    //   [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
    // * Grbl v1.1
    //   [GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 S0.0 F500.0]
    static parse(line) {
        const r = line.match(/^\[(?:GC:)?((?:[a-zA-Z][0-9]+(?:\.[0-9]*)?\s*)+)\]$/);
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

        for (let i = 0; i < words.length; ++i) {
            const word = words[i];

            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                const r = _.find(GRBL_MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, word);
                });

                if (!r) {
                    continue;
                }

                if (r.group === 'coolant') {
                    if (word === 'M7') {
                        _.set(payload, 'modal.coolant.mist', true);
                    } else if (word === 'M8') {
                        _.set(payload, 'modal.coolant.flood', true);
                    } else { // M9
                        _.set(payload, 'modal.coolant.mist', false);
                        _.set(payload, 'modal.coolant.flood', false);
                    }
                } else {
                    _.set(payload, 'modal.' + r.group, word);
                }

                continue;
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _.set(payload, 'tool', word.substring(1));
                continue;
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _.set(payload, 'feedrate', word.substring(1));
                continue;
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _.set(payload, 'spindle', word.substring(1));
                continue;
            }
        }

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

        const name = r[1];
        const value = r[2];
        const payload = {
            name: name,
            value: ''
        };

        // [Gxx:0.000]
        const re = /^G\d+$/i;
        if (re.test(name)) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const list = value.split(',');
            payload.value = {};
            for (let i = 0; i < list.length; ++i) {
                payload.value[axes[i]] = list[i];
            }
        }

        // [TLO:0.000]
        if (name === 'TLO') {
            payload.value = value;
        }

        // [PRB:0.000,0.000,1.492:1]
        if (name === 'PRB') {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const [str, result] = value.split(':');
            const list = str.split(',');
            payload.value = {};
            payload.value.result = Number(result);
            for (let i = 0; i < list.length; ++i) {
                payload.value[axes[i]] = list[i];
            }
        }

        return {
            type: GrblLineParserResultParameters,
            payload: payload
        };
    }
}

class GrblLineParserResultHelp {
    static parse(line) {
        // * Grbl v1.1
        //   [HLP:]
        const r = line.match(/^\[(?:HLP:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultHelp,
            payload: payload
        };
    }
}

class GrblLineParserResultVersion {
    static parse(line) {
        // * Grbl v1.1
        //   [VER:]
        const r = line.match(/^\[(?:VER:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultVersion,
            payload: payload
        };
    }
}

class GrblLineParserResultOption {
    static parse(line) {
        // * Grbl v1.1
        //   [OPT:]
        const r = line.match(/^\[(?:OPT:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultOption,
            payload: payload
        };
    }
}

class GrblLineParserResultEcho {
    static parse(line) {
        // * Grbl v1.1
        //   [echo:]
        const r = line.match(/^\[(?:echo:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultEcho,
            payload: payload
        };
    }
}

// https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl#feedback-messages
class GrblLineParserResultFeedback {
    // * Grbl v0.9
    //   []
    // * Grbl v1.1
    //   [MSG:]
    static parse(line) {
        const r = line.match(/^\[(?:MSG:)?(.+)\]$/);
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
            setting: r[1],
            value: r[2],
            description: _.trim(r[3], '()')
        };

        return {
            type: GrblLineParserResultSettings,
            payload: payload
        };
    }
}

class GrblLineParserResultStartup {
    // * Grbl v0.9
    //   Grbl 0.9j ['$' for help]
    // * Grbl v1.1
    //   Grbl 1.1d ['$' for help]
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
        version: '',
        status: {
            activeState: '',
            mpos: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            wpos: {
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
                program: 'M0', // M0, M1, M2, M30
                spindle: 'M5', // M3, M4, M5
                coolant: { // M7, M8, M9
                    mist: false, // M7
                    flood: false // M8
                }
            },
            tool: '',
            feedrate: '',
            spindle: ''
        },
        parameters: {
        },
        settings: {
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
            // Grbl v1.1
            // WCO:0.000,10.000,2.500
            // A current work coordinate offset is now sent to easily convert
            // between position vectors, where WPos = MPos - WCO for each axis.
            if (_.has(payload, 'mpos') && !_.has(payload, 'wpos')) {
                payload.wpos = payload.wpos || {};
                _.each(payload.mpos, (mpos, axis) => {
                    const digits = decimalPlaces(mpos);
                    const wco = _.get((payload.wco || this.state.status.wco), axis, 0);
                    payload.wpos[axis] = (Number(mpos) - Number(wco)).toFixed(digits);
                });
            } else if (_.has(payload, 'wpos') && !_.has(payload, 'mpos')) {
                payload.mpos = payload.mpos || {};
                _.each(payload.wpos, (wpos, axis) => {
                    const digits = decimalPlaces(wpos);
                    const wco = _.get((payload.wco || this.state.status.wco), axis, 0);
                    payload.mpos[axis] = (Number(wpos) + Number(wco)).toFixed(digits);
                });
            }

            const nextState = {
                ...this.state,
                status: {
                    ...this.state.status,
                    ...payload
                }
            };
            if (!_.isEqual(this.state.status, nextState.status)) {
                this.state = nextState; // enforce state change
            }
            this.emit('status', payload);
            return;
        }
        if (type === GrblLineParserResultOk) {
            this.emit('ok', payload);
            return;
        }
        if (type === GrblLineParserResultError) {
            // https://nodejs.org/api/events.html#events_error_events
            // As a best practice, listeners should always be added for the 'error' events.
            this.emit('error', payload);
            return;
        }
        if (type === GrblLineParserResultAlarm) {
            this.emit('alarm', payload);
            return;
        }
        if (type === GrblLineParserResultParserState) {
            const nextState = {
                ...this.state,
                parserstate: {
                    ...this.state.parserstate,
                    ...payload
                }
            };
            if (!_.isEqual(this.state.parserstate, nextState.parserstate)) {
                this.state = nextState; // enforce state change
            }
            this.emit('parserstate', payload);
            return;
        }
        if (type === GrblLineParserResultParameters) {
            const { name, value } = payload;
            const { parameters } = this.state;
            parameters[name] = value;

            const nextState = {
                ...this.state,
                parameters: parameters
            };
            if (!_.isEqual(this.state.parameters, nextState.parameters)) {
                this.state = nextState; // enforce state change
            }
            this.emit('parameters', payload);
            return;
        }
        if (type === GrblLineParserResultFeedback) {
            this.emit('feedback', payload);
            return;
        }
        if (type === GrblLineParserResultSettings) {
            const { setting, value } = payload;
            const nextState = {
                ...this.state,
                settings: {
                    ...this.state.settings,
                    [setting]: value
                }
            };
            if (!_.isEqual(this.state.settings, nextState.settings)) {
                this.state = nextState; // enforce state change
            }
            this.emit('settings', payload);
            return;
        }
        if (type === GrblLineParserResultStartup) {
            const { version } = payload;
            const nextState = { // enforce state change
                ...this.state,
                version: version
            };
            if (!_.isEqual(this.state.version, nextState.version)) {
                this.state = nextState; // enforce state change
            }
            this.emit('startup', payload);
            return;
        }
        if (data.length > 0) {
            this.emit('others', payload);
            return;
        }
    }
    isAlarm() {
        const activeState = _.get(this.state, 'status.activeState');
        return activeState === GRBL_ACTIVE_STATE_ALARM;
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
    GrblLineParserResultHelp,
    GrblLineParserResultVersion,
    GrblLineParserResultOption,
    GrblLineParserResultEcho,
    GrblLineParserResultFeedback,
    GrblLineParserResultSettings,
    GrblLineParserResultStartup
};
export default Grbl;
