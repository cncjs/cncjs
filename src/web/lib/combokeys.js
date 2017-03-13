import events from 'events';
import Mousetrap from 'mousetrap';
import log from './log';
import { preventDefault } from './dom-events';

const AXIS_X = 'x';
const AXIS_Y = 'y';
const AXIS_Z = 'z';
const FORWARD = 1;
const BACKWARD = -1;
const OVERSHOOT_FACTOR = 10; // 10x
const UNDERSHOOT_FACTOR = 0.1; // 0.1x

const commandKeys = [
    { // Feed Hold
        keys: '!',
        cmd: 'CONTROLLER_COMMAND',
        payload: {
            command: 'feedhold'
        },
        preventDefault: true
    },
    { // Cycle Start
        keys: '~',
        cmd: 'CONTROLLER_COMMAND',
        payload: {
            command: 'cyclestart'
        },
        preventDefault: true
    },
    { // Homing
        keys: ['ctrl', 'alt', 'command', 'h'].join('+'),
        cmd: 'CONTROLLER_COMMAND',
        payload: {
            command: 'homing'
        },
        preventDefault: true
    },
    { // Unlock
        keys: ['ctrl', 'alt', 'command', 'u'].join('+'),
        cmd: 'CONTROLLER_COMMAND',
        payload: {
            command: 'unlock'
        },
        preventDefault: true
    },
    { // Reset
        keys: ['ctrl', 'alt', 'command', 'r'].join('+'),
        cmd: 'CONTROLLER_COMMAND',
        payload: {
            command: 'reset'
        },
        preventDefault: true
    },
    { // Jog Lever Switch
        keys: ['ctrl', 'alt', 'command', '='].join('+'),
        cmd: 'JOG_LEVER_SWITCH',
        payload: {
        },
        preventDefault: true
    },
    { // Jog Lever Switch (Alias)
        keys: ['ctrl', 'alt', 'command', 'l'].join('+'),
        cmd: 'JOG_LEVER_SWITCH',
        payload: {
        },
        preventDefault: true
    },
    { // Jog Forward
        keys: ['ctrl', 'alt', 'command', ']'].join('+'),
        cmd: 'JOG',
        payload: {
            axis: null,
            direction: FORWARD,
            factor: 1
        },
        preventDefault: true
    },
    { // Jog Forward (Alias)
        keys: ['ctrl', 'alt', 'command', 'f'].join('+'),
        cmd: 'JOG',
        payload: {
            axis: null,
            direction: FORWARD,
            factor: 1
        },
        preventDefault: true
    },
    { // Jog Backward
        keys: ['ctrl', 'alt', 'command', '['].join('+'),
        cmd: 'JOG',
        payload: {
            axis: null,
            direction: BACKWARD,
            factor: 1
        },
        preventDefault: true
    },
    { // Jog Backward (Alias)
        keys: ['ctrl', 'alt', 'command', 'b'].join('+'),
        cmd: 'JOG',
        payload: {
            axis: null,
            direction: BACKWARD,
            factor: 1
        },
        preventDefault: true
    },
    { // Jog X+
        keys: 'right',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: FORWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog X+ (undershoot)
        keys: 'alt+right',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: FORWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog X+ (overshoot)
        keys: 'shift+right',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: FORWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog X-
        keys: 'left',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: BACKWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog X- (undershoot)
        keys: 'alt+left',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: BACKWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog X- (overshoot)
        keys: 'shift+left',
        cmd: 'JOG',
        payload: {
            axis: AXIS_X,
            direction: BACKWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Y+
        keys: 'up',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: FORWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog Y+ (undershoot)
        keys: 'alt+up',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: FORWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Y+ (overshoot)
        keys: 'shift+up',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: FORWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Y-
        keys: 'down',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: BACKWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog Y- (undershoot)
        keys: 'alt+down',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: BACKWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Y- (overshoot)
        keys: 'shift+down',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Y,
            direction: BACKWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Z+
        keys: 'pageup',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: FORWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog Z+ (undershoot)
        keys: 'alt+pageup',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: FORWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Z+ (overshoot)
        keys: 'shift+pageup',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: FORWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Z-
        keys: 'pagedown',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: BACKWARD,
            factor: 1
        },
        preventDefault: false
    },
    { // Jog Z- (undershoot)
        keys: 'alt+pagedown',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: BACKWARD,
            factor: UNDERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Jog Z- (overshoot)
        keys: 'shift+pagedown',
        cmd: 'JOG',
        payload: {
            axis: AXIS_Z,
            direction: BACKWARD,
            factor: OVERSHOOT_FACTOR
        },
        preventDefault: false
    },
    { // Shuttle Zone -7
        keys: ['ctrl', 'alt', 'shift', '7'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -7
        },
        preventDefault: true
    },
    { // Shuttle Zone -6
        keys: ['ctrl', 'alt', 'shift', '6'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -6
        },
        preventDefault: true
    },
    { // Shuttle Zone -5
        keys: ['ctrl', 'alt', 'shift', '5'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -5
        },
        preventDefault: true
    },
    { // Shuttle Zone -4
        keys: ['ctrl', 'alt', 'shift', '4'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -4
        },
        preventDefault: true
    },
    { // Shuttle Zone -3
        keys: ['ctrl', 'alt', 'shift', '3'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -3
        },
        preventDefault: true
    },
    { // Shuttle Zone -2
        keys: ['ctrl', 'alt', 'shift', '2'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -2
        },
        preventDefault: true
    },
    { // Shuttle Zone -1
        keys: ['ctrl', 'alt', 'shift', '1'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: -1
        },
        preventDefault: true
    },
    { // Shuttle Zone 0
        keys: ['ctrl', 'alt', 'command', '0'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 0
        },
        preventDefault: true
    },
    { // Shuttle Zone 1
        keys: ['ctrl', 'alt', 'command', '1'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 1
        },
        preventDefault: true
    },
    { // Shuttle Zone 2
        keys: ['ctrl', 'alt', 'command', '2'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 2
        },
        preventDefault: true
    },
    { // Shuttle Zone 3
        keys: ['ctrl', 'alt', 'command', '3'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 3
        },
        preventDefault: true
    },
    { // Shuttle Zone 4
        keys: ['ctrl', 'alt', 'command', '4'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 4
        },
        preventDefault: true
    },
    { // Shuttle Zone 5
        keys: ['ctrl', 'alt', 'command', '5'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 5
        },
        preventDefault: true
    },
    { // Shuttle Zone 6
        keys: ['ctrl', 'alt', 'command', '6'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 6
        },
        preventDefault: true
    },
    { // Shuttle Zone 7
        keys: ['ctrl', 'alt', 'command', '7'].join('+'),
        cmd: 'SHUTTLE',
        payload: {
            value: 7
        },
        preventDefault: true
    },
    { // Select X-axis
        keys: ['ctrl', 'alt', 'command', 'x'].join('+'),
        cmd: 'SELECT_AXIS',
        payload: {
            axis: 'x'
        },
        preventDefault: true
    },
    { // Select Y-axis
        keys: ['ctrl', 'alt', 'command', 'y'].join('+'),
        cmd: 'SELECT_AXIS',
        payload: {
            axis: 'y'
        },
        preventDefault: true
    },
    { // Select Z-axis
        keys: ['ctrl', 'alt', 'command', 'z'].join('+'),
        cmd: 'SELECT_AXIS',
        payload: {
            axis: 'z'
        },
        preventDefault: true
    }
];

class Combokeys extends events.EventEmitter {
    state = {
        didBindEvents: false
    };
    list = [];

    constructor(options = {}) {
        super();

        if (options.autoBind) {
            this.bind();
        }
    }
    bind() {
        if (this.state.didBindEvents) {
            return;
        }
        commandKeys.forEach((o) => {
            const { keys, cmd, payload = {} } = o;
            const callback = (event) => {
                log.debug(`combokeys: keys=${keys} cmd=${cmd} payload=${JSON.stringify(payload)}`);
                if (!!o.preventDefault) {
                    preventDefault(event);
                }
                this.emit(cmd, event, payload);
            };
            Mousetrap.bind(keys, callback);
            this.list.push({ keys: keys, callback: callback });
        });
        this.state.didBindEvents = true;
    }
    unbind() {
        if (!this.state.didBindEvents) {
            return;
        }
        this.list.forEach((o) => {
            const { keys, callback } = o;
            Mousetrap.unbind(keys, callback);
        });
        this.state.didBindEvents = false;
    }
    reset() {
        Mousetrap.reset();
        this.state.didBindEvents = false;
    }
}

const combokeys = new Combokeys({ autoBind: true });

export default combokeys;
