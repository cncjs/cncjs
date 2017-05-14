import _ from 'lodash';
import events from 'events';

import {
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_ALARM,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,

    // G-code Motion Mode
    TINYG_GCODE_MOTION_G0,
    TINYG_GCODE_MOTION_G1,
    TINYG_GCODE_MOTION_G2,
    TINYG_GCODE_MOTION_G3,
    TINYG_GCODE_MOTION_G80,

    // G-code Coordinate System
    TINYG_GCODE_COORDINATE_G53,
    TINYG_GCODE_COORDINATE_G54,
    TINYG_GCODE_COORDINATE_G55,
    TINYG_GCODE_COORDINATE_G56,
    TINYG_GCODE_COORDINATE_G57,
    TINYG_GCODE_COORDINATE_G58,
    TINYG_GCODE_COORDINATE_G59,

    // G-code Plane Selection
    TINYG_GCODE_PLANE_G17,
    TINYG_GCODE_PLANE_G18,
    TINYG_GCODE_PLANE_G19,

    // G-code Units
    TINYG_GCODE_UNITS_G20,
    TINYG_GCODE_UNITS_G21,

    // G-code Distance Mode
    TINYG_GCODE_DISTANCE_G90,
    TINYG_GCODE_DISTANCE_G91,

    // G-code Feedrate Mode
    TINYG_GCODE_FEEDRATE_G93,
    TINYG_GCODE_FEEDRATE_G94,
    TINYG_GCODE_FEEDRATE_G95,

    // G-code Path Control Mode
    TINYG_GCODE_PATH_G61,
    TINYG_GCODE_PATH_G61_1,
    TINYG_GCODE_PATH_G64

} from './constants';

class TinyGParser {
    parse(data) {
        const parsers = [
            TinyGParserResultQueueReports,
            TinyGParserResultStatusReports,
            TinyGParserResultSystemSettings,
            TinyGParserResultOverrides,
            TinyGParserResultReceiveReports
        ];

        for (let parser of parsers) {
            const result = parser.parse(data);
            if (result) {
                _.set(result, 'payload.raw', data);
                _.set(result, 'payload.f', data.f || []); // footer
                return result;
            }
        }

        return {
            type: null,
            payload: {
                raw: data,
                f: data.f || [] // footer
            }
        };
    }
}

class TinyGParserResultQueueReports {
    static parse(data) {
        const qr = _.get(data, 'r.qr') || _.get(data, 'qr');
        const qi = _.get(data, 'r.qi') || _.get(data, 'qi');
        const qo = _.get(data, 'r.qo') || _.get(data, 'qo');

        if (!qr) {
            return null;
        }

        const payload = {
            qr: Number(qr) || 0,
            qi: Number(qi) || 0,
            qo: Number(qo) || 0
        };

        return {
            type: TinyGParserResultQueueReports,
            payload: payload
        };
    }
}

class TinyGParserResultStatusReports {
    static parse(data) {
        const sr = _.get(data, 'r.sr') || _.get(data, 'sr');
        if (!sr) {
            return null;
        }

        const payload = {
            sr: sr
        };

        return {
            type: TinyGParserResultStatusReports,
            payload: payload
        };
    }
}

// https://github.com/synthetos/g2/wiki/Text-Mode#displaying-settings-and-groups
class TinyGParserResultSystemSettings {
    static parse(data) {
        const sys = _.get(data, 'r.sys') || _.get(data, 'sys');
        if (!sys) {
            return null;
        }

        const payload = {
            sys: sys
        };

        return {
            type: TinyGParserResultSystemSettings,
            payload: payload
        };
    }
}

class TinyGParserResultOverrides {
    static parse(data) {
        const mfo = _.get(data, 'r.mfo');
        const mto = _.get(data, 'r.mto');
        const sso = _.get(data, 'r.sso');

        if (!mfo && !mto && !sso) {
            return null;
        }

        const payload = {};

        if (mfo) {
            payload.mfo = mfo;
        }
        if (mto) {
            payload.mto = mto;
        }
        if (sso) {
            payload.sso = sso;
        }

        return {
            type: TinyGParserResultOverrides,
            payload: payload
        };
    }
}

class TinyGParserResultReceiveReports {
    static parse(data) {
        const r = _.get(data, 'r.r') || _.get(data, 'r');
        if (!r) {
            return null;
        }

        const payload = {
            r: r
        };

        return {
            type: TinyGParserResultReceiveReports,
            payload: payload
        };
    }
}

class TinyG extends events.EventEmitter {
    state = {
        // Queue Reports
        qr: 0,
        // Status Reports
        sr: {
            machineState: '',
            mpos: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            wpos: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            modal: {
                motion: '', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
                coordinate: '', // G54, G55, G56, G57, G58, G59
                plane: '', // G17: xy-plane, G18: xz-plane, G19: yz-plane
                units: '', // G20: Inches, G21: Millimeters
                distance: '', // G90: Absolute, G91: Relative
                feedrate: '' // G93: Inverse Time Mode, G94: Units Per Minutes
            }
        }
    };
    settings = {
        // Identification Parameters
        // https://github.com/synthetos/g2/wiki/Configuring-0.99-System-Groups#identification-parameters
        fb: 0, // firmware build
        fbs: '', // firmware build string
        fbc: '', // firmware build config
        fv: 0, // firmware version
        hp: 0, // hardware platform: 1=Xmega, 2=Due, 3=v9(ARM)
        hv: 0, // hardware version
        id: '', // board ID

        mfo: 1, // manual feedrate override
        mto: 1, // manual traverse override
        sso: 1 // spindle speed override
    };
    footer = {
        revision: 0,
        statusCode: 0, // https://github.com/synthetos/g2/wiki/Status-Codes
        rxBufferInfo: 0
    };
    plannerBufferPoolSize = 0; // Suggest 12 min. Limit is 255

    parser = new TinyGParser();

    parse(data) {
        data = ('' + data).replace(/\s+$/, '');
        if (!data) {
            return;
        }

        this.emit('raw', { raw: data });

        if (data.match(/^{/)) {
            try {
                data = JSON.parse(data);
            } catch (err) {
                data = {};
            }

            const result = this.parser.parse(data) || {};
            const { type, payload } = result;

            if (type === TinyGParserResultQueueReports) {
                const { qr } = payload;

                // The planner buffer pool size will be checked every time the planner buffer changes
                if (qr > this.plannerBufferPoolSize) {
                    this.plannerBufferPoolSize = qr;
                }

                if (this.state.qr !== qr) {
                    this.state = { // enforce change
                        ...this.state,
                        qr
                    };
                }
                this.emit('qr', { qr });
            } else if (type === TinyGParserResultStatusReports) {
                // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Codes#status-report-enumerations
                const keymaps = {
                    'line': 'line',
                    'vel': 'velocity',
                    'feed': 'feedrate',
                    'stat': 'machineState',
                    'cycs': 'cycleState',
                    'mots': 'motionState',
                    'hold': 'feedholdState',
                    'momo': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_MOTION_G0]: 'G0', // Straight (linear) traverse
                            [TINYG_GCODE_MOTION_G1]: 'G1', // Straight (linear) feed
                            [TINYG_GCODE_MOTION_G2]: 'G2', // CW arc traverse
                            [TINYG_GCODE_MOTION_G3]: 'G3', // CCW arc traverse
                            [TINYG_GCODE_MOTION_G80]: 'G80' // Cancel motion mode
                        }[val] || '';
                        _.set(target, 'modal.motion', gcode);
                    },
                    'coor': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_COORDINATE_G53]: 'G53', // Machine coordinate system
                            [TINYG_GCODE_COORDINATE_G54]: 'G54', // Coordinate system 1
                            [TINYG_GCODE_COORDINATE_G55]: 'G55', // Coordinate system 2
                            [TINYG_GCODE_COORDINATE_G56]: 'G56', // Coordinate system 3
                            [TINYG_GCODE_COORDINATE_G57]: 'G57', // Coordinate system 4
                            [TINYG_GCODE_COORDINATE_G58]: 'G58', // Coordinate system 5
                            [TINYG_GCODE_COORDINATE_G59]: 'G59' // Coordinate system 6
                        }[val] || '';
                        _.set(target, 'modal.coordinate', gcode);
                    },
                    'plan': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_PLANE_G17]: 'G17', // XY plane
                            [TINYG_GCODE_PLANE_G18]: 'G18', // XZ plane
                            [TINYG_GCODE_PLANE_G19]: 'G19' // YZ plane
                        }[val] || '';
                        _.set(target, 'modal.plane', gcode);
                    },
                    'unit': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_UNITS_G20]: 'G20', // Inches mode
                            [TINYG_GCODE_UNITS_G21]: 'G21' // Millimeters mode
                        }[val] || '';
                        _.set(target, 'modal.units', gcode);
                    },
                    'dist': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_DISTANCE_G90]: 'G90', // Absolute distance
                            [TINYG_GCODE_DISTANCE_G91]: 'G91' // Incremental distance
                        }[val] || '';
                        _.set(target, 'modal.distance', gcode);
                    },
                    'frmo': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_FEEDRATE_G93]: 'G93', // Inverse time mode
                            [TINYG_GCODE_FEEDRATE_G94]: 'G94', // Units-per-minute mode
                            [TINYG_GCODE_FEEDRATE_G95]: 'G95' // Units-per-revolution mode
                        }[val] || '';
                        _.set(target, 'modal.feedrate', gcode);
                    },
                    'path': (target, val) => {
                        const gcode = {
                            [TINYG_GCODE_PATH_G61]: 'G61', // Exact path mode
                            [TINYG_GCODE_PATH_G61_1]: 'G61.1', // Exact stop mode
                            [TINYG_GCODE_PATH_G64]: 'G64' // Continuous mode
                        }[val] || '';
                        _.set(target, 'modal.path', gcode);
                    },

                    // Work Position
                    // {posx: ... through {posa:... are reported in the currently
                    // active Units mode (G20/G21), and also apply any offsets,
                    // including coordinate system selection, G92, and tool offsets.
                    // These are provided to drive digital readouts
                    'posx': 'wpos.x',
                    'posy': 'wpos.y',
                    'posz': 'wpos.z',
                    'posa': 'wpos.a',
                    'posb': 'wpos.b',
                    'posc': 'wpos.c',

                    // Machine Position
                    // {mpox: ... through {mpoa:... are reported in the machine's
                    // internal coordinate system (canonical machine) and will always
                    // be in millimeters with no offsets.
                    // These are provided to drive graphical displays so they do not
                    // have to be aware of Gcode Units mode or any offsets in effect.
                    'mpox': 'mpos.x',
                    'mpoy': 'mpos.y',
                    'mpoz': 'mpos.z',
                    'mpoa': 'mpos.a',
                    'mpob': 'mpos.b',
                    'mpoc': 'mpos.c'
                };
                const sr = {
                    ...this.state.sr,
                    modal: {
                        ...this.state.sr.modal
                    },
                    wpos: {
                        ...this.state.sr.wpos
                    },
                    mpos: {
                        ...this.state.sr.mpos
                    }
                };
                _.each(keymaps, (target, key) => {
                    if (typeof target === 'string') {
                        const val = _.get(payload.sr, key);
                        if (val !== undefined) {
                            _.set(sr, target, val);
                        }
                    }
                    if (typeof target === 'function') {
                        const val = _.get(payload.sr, key);
                        if (val !== undefined) {
                            target(sr, val);
                        }
                    }
                });

                if (!_.isEqual(this.state.sr, sr)) {
                    this.state = { // enforce change
                        ...this.state,
                        sr: sr
                    };
                }
                this.emit('sr', payload.sr);
            } else if (type === TinyGParserResultSystemSettings) {
                this.settings = { // enforce change
                    ...this.settings,
                    ...payload.sys
                };
                this.emit('sys', payload.sys);
            } else if (type === TinyGParserResultOverrides) {
                const {
                    mfo = this.settings.mfo,
                    mto = this.settings.mto,
                    sso = this.settings.sso
                } = payload;
                this.settings = { // enforce change
                    ...this.settings,
                    mfo,
                    mto,
                    sso
                };
                this.emit('ov', { mfo, mto, sso });
            } else if (type === TinyGParserResultReceiveReports) {
                const settings = {};
                for (let key in payload.r) {
                    if (key in this.settings) {
                        settings[key] = payload.r[key];
                    }
                }
                if (Object.keys(settings).length > 0) {
                    this.settings = { // enforce change
                        ...this.settings,
                        ...settings
                    };
                }

                this.emit('r', payload.r);
            }

            if (payload.f && payload.f.length > 0) {
                this.footer.revision = payload.f[0];
                this.footer.statusCode = payload.f[1];
                this.footer.rxBufferInfo = payload.f[2];
                this.emit('f', payload.f);
            }
        }
    }
    getMachinePosition(state = this.state) {
        return _.get(state, 'sr.mpos', {});
    }
    getWorkPosition(state = this.state) {
        return _.get(state, 'sr.wpos', {});
    }
    isAlarm() {
        const machineState = _.get(this.state, 'sr.machineState');
        return machineState === TINYG_MACHINE_STATE_ALARM;
    }
    isIdle() {
        const machineState = _.get(this.state, 'sr.machineState');
        return (
            (machineState === TINYG_MACHINE_STATE_READY) ||
            (machineState === TINYG_MACHINE_STATE_STOP) ||
            (machineState === TINYG_MACHINE_STATE_END)
        );
    }
}

export {
    TinyGParser
};
export default TinyG;
