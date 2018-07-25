/* eslint no-bitwise: ["error", { "allow": ["&", "<<"] }] */
import _ from 'lodash';

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

export default GrblLineParserResultStatus;
