import events from 'events';
import Mousetrap from 'mousetrap';

const buildCombokeys = (key) => {
    const keys = ['ctrl', 'alt', 'command'];
    return keys.concat(key).join('+');
};

const commandKeys = [
    { // Decrease step
        cmd: 'DECREASE_STEP',
        keys: buildCombokeys('[')
    },
    { // Increase step
        cmd: 'INCREASE_STEP',
        keys: buildCombokeys(']')
    },
    { // Reset step
        cmd: 'RESET_STEP',
        keys: buildCombokeys('=')
    },
    { // X-left, Y-up
        cmd: 'X-Y+',
        keys: buildCombokeys('q')
    },
    { // Y-up
        cmd: 'Y+',
        keys: buildCombokeys('w')
    },
    { // X-right, Y-up
        cmd: 'X+Y+',
        keys: buildCombokeys('e')
    },
    { // X-left
        cmd: 'X-',
        keys: buildCombokeys('a')
    },
    { // X-zero, Y-zero
        cmd: 'X0Y0',
        keys: buildCombokeys('s')
    },
    { // X-right
        cmd: 'X+',
        keys: buildCombokeys('d')
    },
    { // X-left, Y-down
        cmd: 'X-Y-',
        keys: buildCombokeys('z')
    },
    { // Y-down
        cmd: 'Y-',
        keys: buildCombokeys('x')
    },
    { // X-right, Y-down
        cmd: 'X+Y-',
        keys: buildCombokeys('c')
    },
    { // Z-up
        cmd: 'Z+',
        keys: buildCombokeys('r')
    },
    { // Z-zero
        cmd: 'Z0',
        keys: buildCombokeys('f')
    },
    { // Z-down
        cmd: 'Z-',
        keys: buildCombokeys('v')
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
