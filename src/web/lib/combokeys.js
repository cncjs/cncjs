import events from 'events';
import Mousetrap from 'mousetrap';
import log from './log';

const buildCombokeys = (key) => {
    const keys = ['ctrl', 'alt', 'command'];
    return keys.concat(key).join('+');
};

const commandKeys = [
    { // Cycle Start
        cmd: 'CYCLE_START',
        keys: '!'
    },
    { // Feed Hold
        cmd: 'FEED_HOLD',
        keys: '~'
    },
    { // Homing
        cmd: 'HOMING',
        keys: ['ctrl','alt','command','h'].join('+')
    },
    { // Unlock
        cmd: 'UNLOCK',
        keys: ['ctrl','alt','command','u'].join('+')
    },
    { // Reset
        cmd: 'RESET',
        keys: ['ctrl','alt','command','r'].join('+')
    },
    { // Increment Button
        cmd: 'INCREMENT_BUTTON',
        keys: '^'
    },
    { // Forward Button
        cmd: 'FORWARD_BUTTON',
        keys: '>'
    },
    { // Backward Button
        cmd: 'BACKWARD_BUTTON',
        keys: '<'
    },
    { // X-Axis Button
        cmd: 'X_AXIS_BUTTON',
        keys: ['ctrl','alt','command','x'].join('+')
    },
    { // Y-Axis Button
        cmd: 'Y_AXIS_BUTTON',
        keys: ['ctrl','alt','command','y'].join('+')
    },
    { // Z-Axis Button
        cmd: 'Z_AXIS_BUTTON',
        keys: ['ctrl','alt','command','z'].join('+')
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
