import events from 'events';
import _get from 'lodash/get';
import _merge from 'lodash/merge';
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _isEqual from 'lodash/isEqual';
import log from 'app/lib/log';

class EventEmitterStore extends events.EventEmitter {
    _state = {};

    constructor(state) {
        super();
        this.state = state;
    }

    set state(state) {
        this._state = { ...state };
    }

    get state() {
        return { ...this._state };
    }

    get(key, defaultValue) {
        log.trace(`get(key=${JSON.stringify(key)}, defaultValue=${JSON.stringify(defaultValue)})`);

        return (key === undefined) ? this._state : _get(this._state, key, defaultValue);
    }

    set(key, value) {
        log.trace(`set(key=${JSON.stringify(key)}, value=${JSON.stringify(value)})`);

        const prevValue = this.get(key);
        if (typeof value === 'object' && _isEqual(value, prevValue)) {
            return this._state;
        }
        if (value === prevValue) {
            return this._state;
        }

        _merge(this._state, _set({}, key, value));
        this.emit('change', this._state);
        return this._state;
    }

    unset(key) {
        _unset(this._state, key);
        this.emit('change', this._state);
        return this._state;
    }

    replace(key, value) {
        log.trace(`replace(key=${JSON.stringify(key)}, value=${JSON.stringify(value)})`);

        const prevValue = this.get(key);
        if (typeof value === 'object' && _isEqual(value, prevValue)) {
            return this._state;
        }
        if (value === prevValue) {
            return this._state;
        }
        this.unset(key);
        this.set(key, value);
        return this._state;
    }

    clear() {
        log.trace('clear()');

        this._state = {};
        this.emit('change', this._state);
        return this._state;
    }
}

export default EventEmitterStore;
