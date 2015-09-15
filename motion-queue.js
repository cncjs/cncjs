var MotionQueue = function(options) {

    var Wrapper = function() {
        this._queue = [];
        this._executed = 0;
        this._stopped = false;
        this._callbacks = [];
    };

    Wrapper.prototype.on = function(evt, callback) {
        if (evt === 'data' && (typeof callback === 'function')) {
            this._callbacks.push(callback);
        }
        return this;
    };

    Wrapper.prototype.run = function() {
        this._stopped = false;
        this.next();
        return this;
    };

    Wrapper.prototype.pause = function() {
        this._stopped = true;
        return this;
    };

    Wrapper.prototype.stop = function() {
        this._stopped = true;
        this._executed = 0;
        return this;
    };

    Wrapper.prototype.clear = function() {
        this._queue = [];
        this._executed = 0;
        return this;
    };

    Wrapper.prototype.add = function(data) {
        this._queue = this._queue.concat(data);
        return this;
    };

    Wrapper.prototype.next = function() {
        if ( ! this._stopped && (this._executed < this._queue.length)) {
            var data = this._queue[this._executed];
            this._executed++;

            this._callbacks.forEach(function(callback) {
                callback(data);
            });
        }
        return this;
    };

    Wrapper.prototype.status = function() {
        return {
            total: this._queue.length,
            executed: this._executed
        };
    };

    Wrapper.prototype.executed = function() {
        return this._executed;
    };

    Wrapper.prototype.size = function() {
        return this._queue.length;
    };

    return new Wrapper();
};

module.exports = MotionQueue;
