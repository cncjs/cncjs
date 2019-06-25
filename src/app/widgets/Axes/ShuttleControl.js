import _ from 'lodash';
import events from 'events';

const HERTZ_LIMIT = 60; // 60 items per second
const FLUSH_INTERVAL = 250; // milliseconds
const QUEUE_LENGTH = Math.floor(HERTZ_LIMIT / (1000 / FLUSH_INTERVAL));

const DEFAULT_FEEDRATE_MIN = 500;
const DEFAULT_FEEDRATE_MAX = 1500;
const DEFAULT_HERTZ = 10; // 10 times per second
const DEFAULT_OVERSHOOT = 1;

class ShuttleControl extends events.EventEmitter {
    zone = 0;

    axis = '';

    queue = [];

    timer = null;

    accumulate(zone = 0, { axis = '', distance = 1, feedrateMin, feedrateMax, hertz, overshoot }) {
        zone = Number(zone) || 0;
        axis = ('' + axis).toUpperCase();
        feedrateMin = Number(feedrateMin) || DEFAULT_FEEDRATE_MIN;
        feedrateMax = Number(feedrateMax) || DEFAULT_FEEDRATE_MAX;
        hertz = Number(hertz) || DEFAULT_HERTZ;
        overshoot = Number(overshoot) || DEFAULT_OVERSHOOT;

        if ((this.zone !== zone) ||
            (this.axis !== axis) ||
            (this.queue.length >= QUEUE_LENGTH)) {
            this.flush();
        }

        const zoneMax = 7; // Shuttle Zone +7/-7
        const zoneMin = 1; // Shuttle Zone +1/-1
        const direction = (zone < 0) ? -1 : 1;
        const feedrate = ((feedrateMax - feedrateMin) * distance * ((Math.abs(zone) - zoneMin) / (zoneMax - zoneMin))) + feedrateMin;
        const relativeDistance = direction * overshoot * (feedrate / 60.0) / hertz;

        this.zone = zone;
        this.axis = axis;
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
