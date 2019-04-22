/* eslint no-bitwise: ["error", { "allow": ["&", "<<"] }] */
import _ from 'lodash';

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

        // Machine Position - reported in current units
        if (_.has(result, 'MPos')) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const mPos = _.get(result, 'MPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
            payload.mpos = {};
            for (let i = 0; i < mPos.length; ++i) {
                payload.mpos[axes[i]] = mPos[i];
            }
        }

        // Work Position - reported in current units
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

export default SmoothieLineParserResultStatus;
