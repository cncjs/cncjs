import _ from 'lodash';
import events from 'events';
import settings from '../../config/settings';
import {
    GRBL_ACTIVE_STATE_UNKNOWN,
    GRBL_ACTIVE_STATES,
    GRBL_MODAL_GROUPS
} from './constants';

//
// Grbl 0.9j ['$' for help]
//
const matchGrblInitializationMessage = (msg) => {
    return msg.match(/^Grbl/i);
};

//
// > ?
// <Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>
//
const matchGrblCurrentStatus = (msg) => {
    return msg.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
};

//
// Example
// > $G
// [G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]
//
const matchGrblParserState = (msg) => {
    return msg.match(/\[(?:\w+[0-9]+\.?[0-9]*\s*)+\]/);
};

class Grbl extends events.EventEmitter {
    status = {
        activeState: GRBL_ACTIVE_STATE_UNKNOWN,
        machinePos: { x: 0, y: 0, z: 0 },
        workingPos: { x: 0, y: 0, z: 0 }
    };
    parserstate = {
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
    };

    constructor() {
        super();
    }
    getActiveState() {
        const { activeState } = this.status;

        // Idle, Run, Hold, Door, Home, Alarm, Check
        console.assert(_.includes(GRBL_ACTIVE_STATES, activeState), activeState);

        return activeState;
    }
    parse(data) {
        data = data.replace(/\s+$/, '');
        if (settings.debug) {
            //console.log('<<', data);
        }
        if (!data) {
            return;
        }

        this.emit('raw', data);

        // Example: Grbl 0.9j ['$' for help]
        if (matchGrblInitializationMessage(data)) {
            this.emit('startup', { raw: data });
            return;
        }

        if (matchGrblCurrentStatus(data)) {
            let r = data.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
            let status = {
                activeState: r[1], // Active States: Idle, Run, Hold, Door, Home, Alarm, Check
                machinePos: { // Machine position
                    x: r[2], 
                    y: r[3],
                    z: r[4]
                },
                workingPos: { // Working position
                    x: r[5],
                    y: r[6],
                    z: r[7]
                }
            };

            this.emit('status', { raw: data, status: status });

            if (!(_.isEqual(this.status, status))) {
                this.emit('statuschange', { raw: data, status: status });
            }

            this.status = status;

            return;
        }

        if (matchGrblParserState(data)) {
            let r = data.match(/\[([^\]]*)\]/);
            let words = _(r[1].split(' '))
                .compact()
                .map((word) => {
                    return _.trim(word);
                })
                .value();

            let parserstate = {};
            _.each(words, (word) => {
                // Gx, Mx
                if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                    let r = _.find(GRBL_MODAL_GROUPS, (group) => {
                        return _.includes(group.modes, word);
                    });

                    if (r) {
                        _.set(parserstate, 'modal.' + r.group, word);
                    }
                }

                // T: tool number
                if (word.indexOf('T') === 0) {
                    _.set(parserstate, 'tool', word.substring(1));
                }

                // F: feed rate
                if (word.indexOf('F') === 0) {
                    _.set(parserstate, 'feedrate', word.substring(1));
                }

                // S: spindle speed
                if (word.indexOf('S') === 0) {
                    _.set(parserstate, 'spindle', word.substring(1));
                }
            });

            this.emit('parserstate', { raw: data, parserstate: parserstate });

            if (!(_.isEqual(this.parserstate, parserstate))) {
                this.emit('parserstatechange', { raw: data, parserstate: parserstate });
            }

            this.parserstate = parserstate;

            return;
        }

        if (data.indexOf('ok') === 0) {
            this.emit('ok', { raw: data });
            return;
        }
            
        if (data.indexOf('error') === 0) {
            this.emit('error', { raw: data });
            return;
        }

        if (data.length > 0) {
            this.emit('others', { raw: data });
            return;
        }

    }
}

export { Grbl };
