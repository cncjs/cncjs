import events from 'events';

class Feeder extends events.EventEmitter {
    state = {
        queue: [],
        pending: false,
        changed: false
    };

    constructor() {
        super();

        this.on('change', () => {
            this.state.changed = true;
        });
    }
    toJSON() {
        return {
            queue: this.state.queue.length,
            pending: this.state.pending,
            changed: this.state.changed
        };
    }
    feed(data = [], context = {}) {
        data = [].concat(data);
        if (data.length > 0) {
            this.state.queue = this.state.queue.concat(data.map(command => {
                return { command: command, context: context };
            }));
            this.emit('change');
        }
    }
    clear() {
        this.state.queue = [];
        this.state.pending = false;
        this.emit('change');
    }
    size() {
        return this.state.queue.length;
    }
    next() {
        if (this.state.queue.length === 0) {
            this.state.pending = false;
            return false;
        }

        const { command, context } = this.state.queue.shift();
        this.state.pending = true;
        this.emit('data', command, context);
        this.emit('change');

        return true;
    }
    isPending() {
        return this.state.pending;
    }
    // Returns true if any state have changes
    peek() {
        const changed = this.state.changed;
        this.state.changed = false;
        return changed;
    }
}

export default Feeder;
