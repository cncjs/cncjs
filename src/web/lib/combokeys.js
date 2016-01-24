import events from 'events';
import Mousetrap from 'mousetrap';
import log from './log';

const buildCombokeys = (key) => {
    const keys = ['ctrl', 'alt', 'command'];
    return keys.concat(key).join('+');
};

const commandKeys = [
    { // Feed Hold
        cmd: 'FEED_HOLD',
        keys: ['ctrl','alt','shift','1'].join('+')
    },
    { // Resume
        cmd: 'RESUME',
        keys: ['ctrl','alt','shift','`'].join('+')
    },
    { // Homing
        cmd: 'HOMING',
        keys: ['ctrl','alt','shift','h'].join('+')
    },
    { // Unlock
        cmd: 'UNLOCK',
        keys: ['ctrl','alt','shift','u'].join('+')
    },
    { // Reset
        cmd: 'RESET',
        keys: ['ctrl','alt','shift','r'].join('+')
    },
    { // Jog Lever Switch
        cmd: 'JOG_LEVER_SWITCH',
        keys: ['ctrl','alt','shift','6'].join('+')
    },
    { // Jog Forward
        cmd: 'JOG_FORWARD',
        keys: ['ctrl','alt','shift','.'].join('+')
    },
    { // Jog Backward
        cmd: 'JOG_BACKWARD',
        keys: ['ctrl','alt','shift',','].join('+')
    },
    { // Jog Stop
        cmd: 'JOG_STOP',
        keys: ['ctrl','alt','shift','/'].join('+')
    },
    { // X-Axis
        cmd: 'X_AXIS',
        keys: ['ctrl','alt','shift','x'].join('+')
    },
    { // Y-Axis
        cmd: 'Y_AXIS',
        keys: ['ctrl','alt','shift','y'].join('+')
    },
    { // Z-Axis
        cmd: 'Z_AXIS',
        keys: ['ctrl','alt','shift','z'].join('+')
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
            const { cmd, keys } = o;
            const callback = () => {
                log.debug('Combokeys:', cmd, keys);
                this.emit(cmd);
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
