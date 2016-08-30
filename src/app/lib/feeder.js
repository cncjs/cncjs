import events from 'events';

class Feeder extends events.EventEmitter {
    queue = [];
    pending = false;

    feed(data) {
        this.queue = this.queue.concat(data);
    }
    clear() {
        this.queue = [];
        this.pending = false;
    }
    next() {
        if (this.queue.length === 0) {
            this.pending = false;
            return false;
        }

        const data = this.queue.shift();
        this.pending = true;
        this.emit('data', data);

        return data;
    }
    isPending() {
        return this.pending;
    }
}

export default Feeder;
