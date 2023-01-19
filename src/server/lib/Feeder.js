import { ensureArray } from 'ensure-type';
import events from 'events';

class Feeder extends events.EventEmitter {
    state = {
        hold: false,
        holdReason: null,
        queue: [],
        pending: false,
        changed: false,
    };

    dataFilter = null;

    // @param {object} [options] The options object.
    // @param {function} [options.dataFilter] A function to be used to handle the data. The function accepts two arguments: The data to be sent to the controller, and the context.
    constructor(options) {
        super();

        if (typeof options.dataFilter === 'function') {
            this.dataFilter = options.dataFilter;
        }

        this.on('change', () => {
            this.state.changed = true;
        });
    }

    toJSON() {
        return {
            hold: this.state.hold,
            holdReason: this.state.holdReason,
            queue: this.state.queue.length,
            pending: this.state.pending,
            changed: this.state.changed,
        };
    }

    // @param {string} data The data to be added to the queue.
    // @param {object} [context] The context associated with the data.
    // @param {object} [options] The options object.
    // @param {string} [options.direction] The direction can be one of 'prepend' or 'append' (default). It's used to instruct the feeder to insert data to the beginning or the end of the queue.
    feed(data, context, options) {
        // Clear pending state when the feeder queue is empty
        if (this.state.queue.length === 0) {
            this.state.pending = false;
        }

        data = ensureArray(data);
        if (data.length > 0) {
            const queueItems = data.map(command => ({
                command,
                context: { ...context },
            }));

            const direction = options?.direction; // One of: prepend, append (default)
            if (direction === 'prepend') {
                // prepend
                this.state.queue = this.state.queue.slice().unshift(...queueItems);
            } else {
                // append
                this.state.queue = this.state.queue.concat(queueItems);
            }

            this.emit('change');
        }
    }

    prepend(data, context, options) {
        options = { ...options, direction: 'prepend' };
        this.feed(data, context, options);
    }

    append(data, context, options) {
        options = { ...options, direction: 'append' };
        this.feed(data, context, options);
    }

    hold(reason) {
        if (this.state.hold) {
            return;
        }
        this.state.hold = true;
        this.state.holdReason = reason;
        this.emit('hold');
        this.emit('change');
    }

    unhold() {
        if (!this.state.hold) {
            return;
        }
        this.state.hold = false;
        this.state.holdReason = null;
        this.emit('unhold');
        this.emit('change');
    }

    clear() {
        this.state.queue = [];
        this.state.pending = false;
        this.emit('change');
    }

    reset() {
        this.state.hold = false;
        this.state.holdReason = null;
        this.state.queue = [];
        this.state.pending = false;
        this.emit('change');
    }

    size() {
        return this.state.queue.length;
    }

    next() {
        while (!this.state.hold && this.state.queue.length > 0) {
            let { command, context } = this.state.queue.shift();

            if (this.dataFilter) {
                command = this.dataFilter(command, context) || '';
                if (!command) { // Ignore blank lines
                    continue;
                }
            }

            this.state.pending = true;
            this.emit('data', command, context);
            this.emit('change');
            break;
        }

        // Clear pending state when the feeder queue is empty
        if (this.state.queue.length === 0) {
            this.state.pending = false;
        }

        return this.state.pending;
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
