import events from 'events';

class Feeder extends events.EventEmitter {
    queue = [];
    pending = false;
    changed = false;

    constructor() {
        super();

        this.on('change', () => {
            this.changed = true;
        });
    }
    get state() {
        return {
            queue: this.queue.length
        };
    }
    feed(data) {
        this.queue = this.queue.concat(data);
        this.emit('change');
    }
    clear() {
        this.queue = [];
        this.pending = false;
        this.emit('change');
    }
    size() {
        return this.queue.length;
    }
    next() {
        if (this.queue.length === 0) {
            this.pending = false;
            return false;
        }

        const data = this.queue.shift();
        this.pending = true;
        this.emit('data', data);
        this.emit('change');

        return data;
    }
    isPending() {
        return this.pending;
    }
    // Returns true if any state have changes
    peek() {
        const changed = this.changed;
        this.changed = false;
        return changed;
    }
}

export default Feeder;
