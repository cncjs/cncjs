import _ from 'lodash';
import events from 'events';

class TinyG2Parser {
    parse(data) {
        const parsers = [
            TinyG2ParserResultStatusReports,
            TinyG2ParserResultFirmwareBuild,
            TinyG2ParserResultHardwarePlatform
        ];

        for (let parser of parsers) {
            const result = parser.parse(data);
            if (result) {
                _.set(result, 'payload.raw', data);
                return result;
            }
        }

        return {
            type: null,
            payload: {
                raw: data
            }
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

            if (type === TinyG2ParserResultStatusReports) {
                // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Codes#status-report-enumerations
                const keymaps = {
                    'n': 'n',
                    'vel': 'velocity',
                    'feed': 'feedrate',
                    'stat': 'machineState',
                    'macs': 'rawMachineState',
                    'cycs': 'cycleState',
                    'mots': 'motionState',
                    'hold': 'feedholdState',
                    'momo': (target, val) => {
                        const gcode = {
                            0: 'G0', // Straight (linear) traverse
                            1: 'G1', // Straight (linear) feed
                            2: 'G2', // CW arc traverse
                            3: 'G3', // CCW arc traverse
                            4: 'G80' // Cancel motion mode
                        }[val] || '';
                        _.set(target, 'modal.motion', gcode);
                    },
                    'coor': (target, val) => {
                        const gcode = {
                            0: 'G53', // Machine coordinate system
                            1: 'G54', // Coordinate system 1
                            2: 'G55', // Coordinate system 2
                            3: 'G56', // Coordinate system 3
                            4: 'G57', // Coordinate system 4
                            5: 'G58', // Coordinate system 5
                            6: 'G59'  // Coordinate system 6
                        }[val] || '';
                        _.set(target, 'modal.coordinate', gcode);
                    },
                    'plan': (target, val) => {
                        const gcode = {
                            0: 'G17', // XY plane
                            1: 'G18', // XZ plane
                            2: 'G19'  // YZ plane
                        }[val] || '';
                        _.set(target, 'modal.plane', gcode);
                    },
                    'unit': (target, val) => {
                        const gcode = {
                            0: 'G20', // Inches mode
                            1: 'G21'  // Millimeters mode
                        }[val] || '';
                        _.set(target, 'modal.units', gcode);
                    },
                    'dist': (target, val) => {
                        const gcode = {
                            0: 'G90', // Absolute distance
                            1: 'G91'  // Incremental distance
                        }[val] || '';
                        _.set(target, 'modal.distance', gcode);
                    },
                    'frmo': (target, val) => {
                        const gcode = {
                            0: 'G93', // Inverse time mode
                            1: 'G94', // Units-per-minute mode
                            2: 'G95'  // Units-per-revolution mode
                        }[val] || '';
                        _.set(target, 'modal.feedrate', gcode);
                    },
                    'path': (target, val) => {
                        const gcode = {
                            0: 'G61',   // Exact path mode
                            1: 'G61.1', // Exact stop mode
                            2: 'G64'    // Continuous mode
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
                const sr = { ...this.state.sr };
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
                this.emit('sr', sr);
                return;
            }
            if (type === TinyG2ParserResultFirmwareBuild) {
                if (!_.isEqual(this.state.fb, payload.fb)) {
                    this.state = { // enforce state change
                        ...this.state,
                        fb: payload.fb
                    };
                }
                this.emit('fb', payload);
                return;
            }
            if (type === TinyG2ParserResultHardwarePlatform) {
                if (!_.isEqual(this.state.hp, payload.hp)) {
                    this.state = { // enforce state change
                        ...this.state,
                        hp: payload.hp
                    };
                }
                this.emit('hp', payload);
                return;
            }
        }
    }
}

export {
    TinyG2Parser
};
export default TinyG2;
