class CommandQueue {
    state = {
        queue: [],
        executed: 0,
        loop: false,
        stopped: true,
        callbacks: []
    };

    on(evt, callback) {
        if (evt === 'data' && (typeof callback === 'function')) {
            this.state.callbacks.push(callback);
        }
    }
    play(options) {
        options = options || {};
        this.state.stopped = false;
        this.state.loop = !!options.loop;
        this.next();
    }
    pause() {
        this.state.stopped = true;
    }
    stop() {
        this.state.stopped = true;
        this.state.loop = false;
        this.state.executed = 0;
    }
    replay(options) {
        this.stop();
        this.play(options);
    }
    clear() {
        this.state.queue = [];
        this.state.executed = 0;
    }
    push(data) {
        this.state.queue = this.state.queue.concat(data);
    }
    next() {
        if (this.state.stopped) {
            return;
        }

        if (this.state.loop && this.state.queue.length > 0 && this.state.executed >= this.state.queue.length) {
            this.state.executed = 0;
            this.next();
            return;
        }

        if (this.state.executed < this.state.queue.length) {
            let data = this.state.queue[this.state.executed];
            this.state.executed++;

            this.state.callbacks.forEach((callback) => {
                callback(data);
            });
        }
    }
    isRunning() {
        let { stopped } = this.state;
        return !stopped;
    }
    getExecutedCount() {
        let { executed } = this.state;
        return executed;
    }
    size() {
        let { queue } = this.state;
        return queue.length;
    }
}

export default CommandQueue;
