import events from 'events';

class Activity extends events.EventEmitter {
    lastUpdateTime = 0;

    get status() {
        const idleTime = (this.lastUpdateTime > 0)
            ? Date.now() - this.lastUpdateTime
            : 0;

        return {
            lastUpdateTime: this.lastUpdateTime,
            idleTime: (idleTime > 0) ? idleTime : 0
        };
    }

    reset() {
        this.lastUpdateTime = 0;
    }

    log(msg, ...args) {
        this.lastUpdateTime = Date.now();
        this.emit('update', this.status);
    }
}

export default Activity;
