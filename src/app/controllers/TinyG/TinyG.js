import _ from 'lodash';
import events from 'events';

import {
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
            qr: qr,
            qi: qi,
            qo: qo
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
        qi: 0,
        qo: 0,
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
    // Identification Parameters
    // https://github.com/synthetos/g2/wiki/Configuring-0.99-System-Groups#identification-parameters
    ident = {
        fv: 0, // Firmware Version
        fb: 0, // Firmware Build
        fbs: '', // Firmware Build String
        fbc: '', // Firmware Build Config
        hp: 0, // Hardware Platform: 1=Xmega, 2=Due, 3=v9(ARM)
        hv: 0, // Hardware Version
        id: '' // board ID
    };
    footer = {
        revision: 0,
        statusCode: 0, // https://github.com/synthetos/g2/wiki/Status-Codes
        rxBufferInfo: 0
    };
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
                const { qr, qi, qo } = payload;
                if (this.state.qr !== qr ||
                    this.state.qi !== qi ||
                    this.state.qo !== qo) {
                    this.state = { // enforce state change
                        ...this.state,
                        qr,
                        qi,
                        qo
                    };
                }
                this.emit('qr', { qr, qi, qo });
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
                    this.state = { // enforce state change
                        ...this.state,
                        sr: sr
                    };
                }
                this.emit('sr', payload.sr);
            } else if (type === TinyGParserResultReceiveReports) {
                // Identification Parameters
                for (let setting of ['fv', 'fb', 'fbs', 'fbc', 'hp', 'hv', 'id']) {
                    if (payload.r[setting]) {
                        this.ident[setting] = payload.r[setting];
                    }
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
}

export {
    TinyGParser
};
export default TinyG;
