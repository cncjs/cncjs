import _ from 'lodash';
import events from 'events';

const FLUSH_INTERVAL = 250; // milliseconds
const RATE_LIMIT = 60; // 60 items per second
const QUEUE_LENGTH = Math.floor(RATE_LIMIT / (1000 / FLUSH_INTERVAL));
const FEEDRATE_MIN = 200;
const FEEDRATE_MAX = 800;
const VALUE_MIN = 1;
const VALUE_MAX = 7;
const CYCLE_INTERVAL = 100000 / 1000000; // 0.1s

class ShuttleZone extends events.EventEmitter {
    axis = '';
    value = 0;
    queue = [];
    timer = null;

    accumulate(axis, value = 0, distance = 1) {
        axis = ('' + axis).toUpperCase();
        value = Number(value) || 0;

        if ((this.axis !== axis) ||
            (this.value !== value) || 
            (this.queue.length >= QUEUE_LENGTH)) {
            this.flush();
        }

        const direction = (value < 0) ? -1 : 1;
        const feedrate = ((FEEDRATE_MAX - FEEDRATE_MIN) * distance * ((Math.abs(value) - VALUE_MIN) / (VALUE_MAX - VALUE_MIN))) + FEEDRATE_MIN;
        const relativeDistance = (direction * (feedrate / 60.0) * CYCLE_INTERVAL);

        this.axis = axis;
        this.value = value;
        this.queue.push({
            feedrate: feedrate,
            relativeDistance: relativeDistance
        });

        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
            }, FLUSH_INTERVAL);
        }
    }
    clear() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.queue = [];
    }
    flush(callback) {
        if (this.queue.length === 0) {
            return;
        }

        const accumulatedResult = {
            axis: this.axis,
            feedrate: _.sumBy(this.queue, (o) => o.feedrate) / this.queue.length,
            relativeDistance: _.sumBy(this.queue, (o) => o.relativeDistance)
        };

        clearTimeout(this.timer);
        this.timer = null;
        this.queue = [];
        this.emit('flush', accumulatedResult);
        typeof callback === 'function' && callback(accumulatedResult);
    }
}

export default ShuttleZone;
