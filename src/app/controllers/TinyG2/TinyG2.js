import _ from 'lodash';
import events from 'events';

import {
    // G-code Motion Mode
    TINYG2_GCODE_MOTION_G0,
    TINYG2_GCODE_MOTION_G1,
    TINYG2_GCODE_MOTION_G2,
    TINYG2_GCODE_MOTION_G3,
    TINYG2_GCODE_MOTION_G80,

    // G-code Coordinate System
    TINYG2_GCODE_COORDINATE_G53,
    TINYG2_GCODE_COORDINATE_G54,
    TINYG2_GCODE_COORDINATE_G55,
    TINYG2_GCODE_COORDINATE_G56,
    TINYG2_GCODE_COORDINATE_G57,
    TINYG2_GCODE_COORDINATE_G58,
    TINYG2_GCODE_COORDINATE_G59,

    // G-code Plane Selection
    TINYG2_GCODE_PLANE_G17,
    TINYG2_GCODE_PLANE_G18,
    TINYG2_GCODE_PLANE_G19,

    // G-code Units
    TINYG2_GCODE_UNITS_G20,
    TINYG2_GCODE_UNITS_G21,

    // G-code Distance Mode
    TINYG2_GCODE_DISTANCE_G90,
    TINYG2_GCODE_DISTANCE_G91,

    // G-code Feedrate Mode
    TINYG2_GCODE_FEEDRATE_G93,
    TINYG2_GCODE_FEEDRATE_G94,
    TINYG2_GCODE_FEEDRATE_G95,

    // G-code Path Control Mode
    TINYG2_GCODE_PATH_G61,
    TINYG2_GCODE_PATH_G61_1,
    TINYG2_GCODE_PATH_G64

} from './constants';

class TinyG2Parser {
    parse(data) {
        const parsers = [
            TinyG2ParserResultQueueReports,
            TinyG2ParserResultStatusReports,
            TinyG2ParserResultFirmwareBuild,
            TinyG2ParserResultHardwarePlatform
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

class TinyG2ParserResultQueueReports {
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
            type: TinyG2ParserResultQueueReports,
            payload: payload
        };
    }
}

class TinyG2ParserResultStatusReports {
    static parse(data) {
        const sr = _.get(data, 'r.sr') || _.get(data, 'sr');
        if (!sr) {
            return null;
        }

        const payload = {
            sr: sr
        };

        return {
            type: TinyG2ParserResultStatusReports,
            payload: payload
        };
    }
}

class TinyG2ParserResultFirmwareBuild {
    static parse(data) {
        const fb = _.get(data, 'r.fb');
        if (!fb) {
            return null;
        }

        const payload = {
            fb: fb
        };

        return {
            type: TinyG2ParserResultFirmwareBuild,
            payload: payload
        };
    }
}

class TinyG2ParserResultHardwarePlatform {
    static parse(data) {
        const hp = _.get(data, 'r.hp');
        if (!hp) {
            return null;
        }

        const payload = {
            hp: hp
        };

        return {
            type: TinyG2ParserResultHardwarePlatform,
            payload: payload
        };
    }
}

class TinyG2 extends events.EventEmitter {
    state = {
        // Queue Reports
        qr: 0,
        qi: 0,
        qo: 0,
        // Status Reports
        sr: {
            machineState: '',
            machinePosition: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            workPosition: {
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
        },
        // Hardware Platform
        hp: 0,
        // Firmware Build
        fb: 0
    };
    footer = {
        revision: 0,
        statusCode: 0,
        rxBufferInfo: 0
    };
    parser = new TinyG2Parser();

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

            if (type === TinyG2ParserResultQueueReports) {
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
            } else if (type === TinyG2ParserResultStatusReports) {
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
                            [TINYG2_GCODE_MOTION_G0]: 'G0', // Straight (linear) traverse
                            [TINYG2_GCODE_MOTION_G1]: 'G1', // Straight (linear) feed
                            [TINYG2_GCODE_MOTION_G2]: 'G2', // CW arc traverse
                            [TINYG2_GCODE_MOTION_G3]: 'G3', // CCW arc traverse
                            [TINYG2_GCODE_MOTION_G80]: 'G80' // Cancel motion mode
                        }[val] || '';
                        _.set(target, 'modal.motion', gcode);
                    },
                    'coor': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_COORDINATE_G53]: 'G53', // Machine coordinate system
                            [TINYG2_GCODE_COORDINATE_G54]: 'G54', // Coordinate system 1
                            [TINYG2_GCODE_COORDINATE_G55]: 'G55', // Coordinate system 2
                            [TINYG2_GCODE_COORDINATE_G56]: 'G56', // Coordinate system 3
                            [TINYG2_GCODE_COORDINATE_G57]: 'G57', // Coordinate system 4
                            [TINYG2_GCODE_COORDINATE_G58]: 'G58', // Coordinate system 5
                            [TINYG2_GCODE_COORDINATE_G59]: 'G59' // Coordinate system 6
                        }[val] || '';
                        _.set(target, 'modal.coordinate', gcode);
                    },
                    'plan': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_PLANE_G17]: 'G17', // XY plane
                            [TINYG2_GCODE_PLANE_G18]: 'G18', // XZ plane
                            [TINYG2_GCODE_PLANE_G19]: 'G19' // YZ plane
                        }[val] || '';
                        _.set(target, 'modal.plane', gcode);
                    },
                    'unit': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_UNITS_G20]: 'G20', // Inches mode
                            [TINYG2_GCODE_UNITS_G21]: 'G21' // Millimeters mode
                        }[val] || '';
                        _.set(target, 'modal.units', gcode);
                    },
                    'dist': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_DISTANCE_G90]: 'G90', // Absolute distance
                            [TINYG2_GCODE_DISTANCE_G91]: 'G91' // Incremental distance
                        }[val] || '';
                        _.set(target, 'modal.distance', gcode);
                    },
                    'frmo': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_FEEDRATE_G93]: 'G93', // Inverse time mode
                            [TINYG2_GCODE_FEEDRATE_G94]: 'G94', // Units-per-minute mode
                            [TINYG2_GCODE_FEEDRATE_G95]: 'G95' // Units-per-revolution mode
                        }[val] || '';
                        _.set(target, 'modal.feedrate', gcode);
                    },
                    'path': (target, val) => {
                        const gcode = {
                            [TINYG2_GCODE_PATH_G61]: 'G61', // Exact path mode
                            [TINYG2_GCODE_PATH_G61_1]: 'G61.1', // Exact stop mode
                            [TINYG2_GCODE_PATH_G64]: 'G64' // Continuous mode
                        }[val] || '';
                        _.set(target, 'modal.path', gcode);
                    },
                    'posx': 'workPosition.x',
                    'posy': 'workPosition.y',
                    'posz': 'workPosition.z',
                    'posa': 'workPosition.a',
                    'posb': 'workPosition.b',
                    'posc': 'workPosition.c',
                    'mpox': 'machinePosition.x',
                    'mpoy': 'machinePosition.y',
                    'mpoz': 'machinePosition.z',
                    'mpoa': 'machinePosition.a',
                    'mpob': 'machinePosition.b',
                    'mpoc': 'machinePosition.c'
                };
                const sr = {
                    ...this.state.sr,
                    modal: {
                        ...this.state.sr.modal
                    },
                    workPosition: {
                        ...this.state.sr.workPosition
                    },
                    machinePosition: {
                        ...this.state.sr.machinePosition
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
            } else if (type === TinyG2ParserResultFirmwareBuild) {
                if (!_.isEqual(this.state.fb, payload.fb)) {
                    this.state = { // enforce state change
                        ...this.state,
                        fb: payload.fb
                    };
                }
                this.emit('fb', payload.fb);
            } else if (type === TinyG2ParserResultHardwarePlatform) {
                if (!_.isEqual(this.state.hp, payload.hp)) {
                    this.state = { // enforce state change
                        ...this.state,
                        hp: payload.hp
                    };
                }
                this.emit('hp', payload.hp);
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
    TinyG2Parser
};
export default TinyG2;
