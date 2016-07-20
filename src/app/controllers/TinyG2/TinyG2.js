import _ from 'lodash';
import events from 'events';

class TinyG2Parser {
    parse(data) {
        const parsers = [
            TinyG2ParserResultStatusReports
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

        const payload = { ...sr };

        return {
            type: TinyG2ParserResultStatusReports,
            payload: payload
        };
    }
}

class TinyG2 extends events.EventEmitter {
    state = {
        statusReports: {
            activeState: '',
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
        }
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
                const keymaps = {
                    'n': 'n',
                    'vel': 'velocity',
                    'feed': 'feedrate',
                    'stat': (target, val) => {
                        const machineState = {
                            1: 'Reset',
                            2: 'Alarm',
                            3: 'Stop',
                            4: 'End',
                            5: 'Run',
                            6: 'Hold',
                            7: 'Probe',
                            9: 'Homing'
                        }[val] || '';
                        _.set(target, 'machineState', machineState);
                    },
                    'momo': (target, val) => {
                        const gcode = {
                            0: 'G0', // traverse
                            1: 'G1', // straight feed
                            2: 'G2', // cw arc
                            3: 'G3' // ccw arc
                        }[val] || '';
                        _.set(target, 'modal.motion', gcode);
                    },
                    'coor': (target, val) => {
                        const gcode = {
                            0: 'G53',
                            1: 'G54',
                            2: 'G55',
                            3: 'G56',
                            4: 'G57',
                            5: 'G58',
                            6: 'G59'
                        }[val] || '';
                        _.set(target, 'modal.coordinate', gcode);
                    },
                    'plan': (target, val) => {
                        const gcode = {
                            0: 'G17', // XY-plane
                            1: 'G18', // XZ-plane
                            2: 'G19'  // YZ-plane
                        }[val] || '';
                        _.set(target, 'modal.plane', gcode);
                    },
                    'unit': (target, val) => {
                        const gcode = {
                            0: 'G20', // Inches
                            1: 'G21'  // Millimeters
                        }[val] || '';
                        _.set(target, 'modal.units', gcode);
                    },
                    'dist': (target, val) => {
                        const gcode = {
                            0: 'G90', // Absolute
                            1: 'G91'  // Relative
                        }[val] || '';
                        _.set(target, 'modal.distance', gcode);
                    },
                    'frmo': (target, val) => {
                        const gcode = {
                            0: 'G94', // Units Per Minute Mode
                            1: 'G93'  // Inverse Time Mode
                        }[val] || '';
                        _.set(target, 'modal.feedrate', gcode);
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
                const statusReports = { ...this.state.statusReports };
                _.each(keymaps, (target, key) => {
                    if (typeof target === 'string') {
                        const val = _.get(payload, key);
                        if (val !== undefined) {
                            _.set(statusReports, target, val);
                        }
                    }
                    if (typeof target === 'function') {
                        const val = _.get(payload, key);
                        if (val !== undefined) {
                            target(statusReports, val);
                        }
                    }
                });

                if (!_.isEqual(this.state.statusReports, statusReports)) {
                    this.emit('statusReportsChange', statusReports);
                    this.state = {
                        ...this.state,
                        statusReports: statusReports
                    };
                }
                this.emit('statusReports', statusReports);
                return;
            }
        }
    }
}

export {
    TinyG2Parser
};
export default TinyG2;
