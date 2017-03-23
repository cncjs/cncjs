/* eslint no-bitwise: ["error", { "allow": ["&", "<<"] }] */
/* eslint no-continue: 0 */
import _ from 'lodash';
import events from 'events';
import {
    SMOOTHIE_ACTIVE_STATE_ALARM,
    SMOOTHIE_MODAL_GROUPS
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

class SmoothieLineParser {
    parse(line) {
        const parsers = [
            // <>
            SmoothieLineParserResultStatus,

            // ok
            SmoothieLineParserResultOk,

            // error:x
            SmoothieLineParserResultError,

            // ALARM:
            SmoothieLineParserResultAlarm,

            // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
            SmoothieLineParserResultParserState,

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
            SmoothieLineParserResultParameters,

            // Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz
            SmoothieLineParserResultVersion
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

class SmoothieLineParserResultStatus {
    // <Idle>
    // <Idle,MPos:5.5290,0.5600,7.0000,WPos:1.5290,-5.4400,-0.0000>
    // <Idle,MPos:5.5290,0.5600,7.0000,0.0000,WPos:1.5290,-5.4400,-0.0000,0.0000>
    // <Idle,MPos:0.0000,0.0000,0.0000,WPos:0.0000,0.0000,0.0000,Buf:0,RX:0,Lim:000>
    // <Idle,MPos:0.0000,0.0000,0.0000,WPos:0.0000,0.0000,0.0000,Buf:0,RX:0,Ln:0,F:0.>
    static parse(line) {
        const r = line.match(/^<(.+)>$/);
        if (!r) {
            return null;
        }

        const payload = {};
        const pattern = /[a-zA-Z]+(:[0-9\.\-]+(,[0-9\.\-]+){0,5})?/g;
        const params = r[1].match(pattern);
        const result = {};

        { // Active State (Grbl v0.9, v1.1)
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

        // Machine Position
        if (_.has(result, 'MPos')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const mPos = _.get(result, 'MPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.mpos = {};
            for (let i = 0; i < mPos.length; ++i) {
                payload.mpos[axes[i]] = mPos[i];
            }
        }

        // Work Position
        if (_.has(result, 'WPos')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const wPos = _.get(result, 'WPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.wpos = {};
            for (let i = 0; i < wPos.length; ++i) {
                payload.wpos[axes[i]] = wPos[i];
            }
        }

        // Planner Buffer (Grbl v0.9)
        if (_.has(result, 'Buf')) {
            payload.buf = payload.buf || {};
            payload.buf.planner = Number(_.get(result, 'Buf[0]', 0));
        }

        // RX Buffer (Grbl v0.9)
        if (_.has(result, 'RX')) {
            payload.buf = payload.buf || {};
            payload.buf.rx = Number(_.get(result, 'RX[0]', 0));
        }

        // Line Number
        // Ln:99999 indicates line 99999 is currently being executed.
        if (_.has(result, 'Ln')) {
            payload.ln = Number(_.get(result, 'Ln[0]', 0));
        }

        // Feed Rate
        // F:500 contains real-time feed rate data as the value.
        // This appears only when VARIABLE_SPINDLE is disabled.
        if (_.has(result, 'F')) {
            payload.feedrate = Number(_.get(result, 'F[0]', 0));
        }

        // Limit Pins (Grbl v0.9)
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

        return {
            type: SmoothieLineParserResultStatus,
            payload: payload
        };
    }
}

class SmoothieLineParserResultOk {
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: SmoothieLineParserResultOk,
            payload: payload
        };
    }
}

class SmoothieLineParserResultError {
    static parse(line) {
        const r = line.match(/^error:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: SmoothieLineParserResultError,
            payload: payload
        };
    }
}

class SmoothieLineParserResultAlarm {
    static parse(line) {
        const r = line.match(/^ALARM:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: SmoothieLineParserResultAlarm,
            payload: payload
        };
    }
}

class SmoothieLineParserResultParserState {
    // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
    static parse(line) {
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

        for (let i = 0; i < words.length; ++i) {
            const word = words[i];

            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                const r = _.find(SMOOTHIE_MODAL_GROUPS, (group) => {
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
            type: SmoothieLineParserResultParserState,
            payload: payload
        };
    }
}

class SmoothieLineParserResultParameters {
    static parse(line) {
        const r = line.match(/^\[(G54|G55|G56|G57|G58|G59|G59.1|G59.2|G59.3|G28|G30|G92|TLO|PRB):(.+)\]$/);
        if (!r) {
            return null;
        }

        const name = r[1];
        const value = r[2];
        const payload = {
            name: name,
            value: ''
        };

        // [G59:0.0000] or [G59.1:0.0000]
        const re = /^G\d+(\.\d+)?$/i;
        if (re.test(name)) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const list = value.split(',');
            payload.value = {};
            for (let i = 0; i < list.length; ++i) {
                payload.value[axes[i]] = list[i];
            }
        }

        // [TLO:0.0000]
        if (name === 'TLO') {
            payload.value = value;
        }

        // [PRB:0.0000,0.0000,0.0000:0]
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
            type: SmoothieLineParserResultParameters,
            payload: payload
        };
    }
}

class SmoothieLineParserResultVersion {
    // Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz
    static parse(line) {
        // LPC1768 or LPC1769 should be Smoothie
        if (line.indexOf('LPC176') < 0) {
            return null;
        }

        const payload = {};
        const r = line.match(/[a-zA-Z0-9\s]+:[^,]+/g);
        if (!r) {
            return null;
        }

        r.forEach((str) => {
            const nv = str.match(/\s*([^:]+)\s*:\s*(.*)\s*$/);
            if (!nv) {
                return;
            }

            const [name, value] = nv.slice(1);

            // Build version: edge-3332442
            if (name.match(/Build version/i)) {
                _.set(payload, 'build.version', value);
            }

            // Build date: Apr 22 2015 15:52:55
            if (name.match(/Build date/i)) {
                _.set(payload, 'build.date', value);
            }

            // MCU: LPC1769
            if (name.match(/MCU/i)) {
                _.set(payload, 'mcu', value);
            }

            // System Clock: 120MHz
            if (name.match(/System Clock/i)) {
                _.set(payload, 'sysclk', value);
            }
        });

        // MCU is a required field
        if (!payload.mcu) {
            return null;
        }

        return {
            type: SmoothieLineParserResultVersion,
            payload: payload
        };
    }
}

class Smoothie extends events.EventEmitter {
    state = {
        build: {
            version: '',
            date: ''
        },
        mcu: '',
        sysclk: '',
        status: {
            activeState: '',
            mpos: {
                x: '0.0000',
                y: '0.0000',
                z: '0.0000'
            },
            wpos: {
                x: '0.0000',
                y: '0.0000',
                z: '0.0000'
            },
            ovF: 100,
            ovS: 100
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
        parameters: {}
    };
    parser = new SmoothieLineParser();

    parse(data) {
        data = ('' + data).replace(/\s+$/, '');
        if (!data) {
            return;
        }

        this.emit('raw', { raw: data });

        const result = this.parser.parse(data) || {};
        const { type, payload } = result;

        if (type === SmoothieLineParserResultStatus) {
            // WCO:0.0000,10.0000,2.5000
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
        if (type === SmoothieLineParserResultOk) {
            this.emit('ok', payload);
            return;
        }
        if (type === SmoothieLineParserResultError) {
            // https://nodejs.org/api/events.html#events_error_events
            // As a best practice, listeners should always be added for the 'error' events.
            this.emit('error', payload);
            return;
        }
        if (type === SmoothieLineParserResultAlarm) {
            this.emit('alarm', payload);
            return;
        }
        if (type === SmoothieLineParserResultParserState) {
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
        if (type === SmoothieLineParserResultParameters) {
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
        if (type === SmoothieLineParserResultVersion) {
            const nextState = { // enforce state change
                ...this.state,
                ...payload
            };
            if (!_.isEqual(this.state.build, nextState.build)) {
                this.state = nextState; // enforce state change
            }
            this.emit('version', payload);
            return;
        }
        if (data.length > 0) {
            this.emit('others', payload);
            return;
        }
    }
    isAlarm() {
        const activeState = _.get(this.state, 'status.activeState');
        return activeState === SMOOTHIE_ACTIVE_STATE_ALARM;
    }
}

export {
    SmoothieLineParser,
    SmoothieLineParserResultStatus,
    SmoothieLineParserResultOk,
    SmoothieLineParserResultError,
    SmoothieLineParserResultAlarm,
    SmoothieLineParserResultParserState,
    SmoothieLineParserResultParameters,
    SmoothieLineParserResultVersion
};
export default Smoothie;
