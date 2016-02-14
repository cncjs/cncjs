import _ from 'lodash';
import events from 'events';
import store from '../../../store';

const HERTZ_LIMIT = 60; // 60 items per second
const FLUSH_INTERVAL = 250; // milliseconds
const QUEUE_LENGTH = Math.floor(HERTZ_LIMIT / (1000 / FLUSH_INTERVAL));

const DEFAULT_FEEDRATE_MIN = 500;
const DEFAULT_FEEDRATE_MAX = 1500;
const DEFAULT_HERTZ = 10; // 10 times per second
const DEFAULT_OVERSHOOT = 1;

class ShuttleControl extends events.EventEmitter {
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

        const valueMax = 7; // Shuttle Zone +7/-7
        const valueMin = 1; // Shuttle Zone +1/-1
        const feedrateMin = Number(store.get('widgets.axes.shuttle.feedrateMin')) || DEFAULT_FEEDRATE_MIN;
        const feedrateMax = Number(store.get('widgets.axes.shuttle.feedrateMax')) || DEFAULT_FEEDRATE_MAX;
        const hertz = Number(store.get('widgets.axes.shuttle.hertz')) || DEFAULT_HERTZ;
        const overshoot = Number(store.get('widgets.axes.shuttle.overshoot')) || DEFAULT_OVERSHOOT;
        const direction = (value < 0) ? -1 : 1;
        const feedrate = ((feedrateMax - feedrateMin) * distance * ((Math.abs(value) - valueMin) / (valueMax - valueMin))) + feedrateMin;
        const relativeDistance = direction * overshoot * (feedrate / 60.0) / hertz;

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

export default ShuttleControl;
