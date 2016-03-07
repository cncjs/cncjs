import events from 'events';
import Mousetrap from 'mousetrap';
import log from './log';

const commandKeys = [
    { // Feed Hold
        cmd: 'FEED_HOLD',
        keys: '!'
    },
    { // Resume
        cmd: 'RESUME',
        keys: '~'
    },
    { // Homing
        cmd: 'HOMING',
        keys: ['ctrl', 'alt', 'command', 'h'].join('+')
    },
    { // Unlock
        cmd: 'UNLOCK',
        keys: ['ctrl', 'alt', 'command', 'u'].join('+')
    },
    { // Reset
        cmd: 'RESET',
        keys: ['ctrl', 'alt', 'command', 'r'].join('+')
    },
    { // Jog Lever Switch
        cmd: 'JOG_LEVER_SWITCH',
        keys: ['ctrl', 'alt', 'command', '='].join('+')
    },
    { // Jog Forward
        cmd: 'JOG_FORWARD',
        keys: ['ctrl', 'alt', 'command', ']'].join('+')
    },
    { // Jog Backward
        cmd: 'JOG_BACKWARD',
        keys: ['ctrl', 'alt', 'command', '['].join('+')
    },
    { // Shuttle Zone -7
        cmd: 'SHUTTLE_ZONE',
        value: -7,
        keys: ['ctrl', 'alt', 'shift', '7'].join('+')
    },
    { // Shuttle Zone -6
        cmd: 'SHUTTLE_ZONE',
        value: -6,
        keys: ['ctrl', 'alt', 'shift', '6'].join('+')
    },
    { // Shuttle Zone -5
        cmd: 'SHUTTLE_ZONE',
        value: -5,
        keys: ['ctrl', 'alt', 'shift', '5'].join('+')
    },
    { // Shuttle Zone -4
        cmd: 'SHUTTLE_ZONE',
        value: -4,
        keys: ['ctrl', 'alt', 'shift', '4'].join('+')
    },
    { // Shuttle Zone -3
        cmd: 'SHUTTLE_ZONE',
        value: -3,
        keys: ['ctrl', 'alt', 'shift', '3'].join('+')
    },
    { // Shuttle Zone -2
        cmd: 'SHUTTLE_ZONE',
        value: -2,
        keys: ['ctrl', 'alt', 'shift', '2'].join('+')
    },
    { // Shuttle Zone -1
        cmd: 'SHUTTLE_ZONE',
        value: -1,
        keys: ['ctrl', 'alt', 'shift', '1'].join('+')
    },
    { // Shuttle Zone 0
        cmd: 'SHUTTLE_ZONE',
        value: 0,
        keys: ['ctrl', 'alt', 'command', '0'].join('+')
    },
    { // Shuttle Zone 1
        cmd: 'SHUTTLE_ZONE',
        value: 1,
        keys: ['ctrl', 'alt', 'command', '1'].join('+')
    },
    { // Shuttle Zone 2
        cmd: 'SHUTTLE_ZONE',
        value: 2,
        keys: ['ctrl', 'alt', 'command', '2'].join('+')
    },
    { // Shuttle Zone 3
        cmd: 'SHUTTLE_ZONE',
        value: 3,
        keys: ['ctrl', 'alt', 'command', '3'].join('+')
    },
    { // Shuttle Zone 4
        cmd: 'SHUTTLE_ZONE',
        value: 4,
        keys: ['ctrl', 'alt', 'command', '4'].join('+')
    },
    { // Shuttle Zone 5
        cmd: 'SHUTTLE_ZONE',
        value: 5,
        keys: ['ctrl', 'alt', 'command', '5'].join('+')
    },
    { // Shuttle Zone 6
        cmd: 'SHUTTLE_ZONE',
        value: 6,
        keys: ['ctrl', 'alt', 'command', '6'].join('+')
    },
    { // Shuttle Zone 7
        cmd: 'SHUTTLE_ZONE',
        value: 7,
        keys: ['ctrl', 'alt', 'command', '7'].join('+')
    },
    { // X-Axis
        cmd: 'X_AXIS',
        keys: ['ctrl', 'alt', 'command', 'x'].join('+')
    },
    { // Y-Axis
        cmd: 'Y_AXIS',
        keys: ['ctrl', 'alt', 'command', 'y'].join('+')
    },
    { // Z-Axis
        cmd: 'Z_AXIS',
        keys: ['ctrl', 'alt', 'command', 'z'].join('+')
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
            const { keys, cmd, value } = o;
            const callback = () => {
                log.debug('combokeys:', keys, cmd, value);
                this.emit(cmd, value);
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
