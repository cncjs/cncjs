import events from 'events';
import produce from 'immer';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _update from 'lodash/update';
import _isObject from 'lodash/isObject';
import log from 'app/lib/log';

const strval = (value) => {
  return _isObject(value) ? JSON.stringify(value) : value;
};

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

    get(path, defaultValue) {
      if (defaultValue !== undefined) {
        log.trace(`get(path=${JSON.stringify(path)}, defaultValue=${strval(defaultValue)})`);
      } else {
        log.trace(`get(path=${JSON.stringify(path)})`);
      }

      return (path === undefined) ? this._state : _get(this._state, path, defaultValue);
    }

    set(path, value) {
      const baseState = this._state;
      const nextState = produce(baseState, draftState => {
        _set(draftState, path, value);
      });
      const changed = (baseState !== nextState);

      log.trace(`set(path=${JSON.stringify(path)}, value=${strval(value)}): changed=${changed}`);

      if (changed) {
        this._state = nextState;
        this.emit('change', this._state);
      }

      return this._state;
    }

    unset(path) {
      const baseState = this._state;
      const nextState = produce(baseState, draftState => {
        _unset(draftState, path);
      });
      const changed = (baseState !== nextState);

      log.trace(`unset(path=${JSON.stringify(path)}): changed=${changed}`);

      if (changed) {
        this._state = nextState;
        this.emit('change', this._state);
      }

      return this._state;
    }

    update(path, updater) {
      const baseState = this._state;
      const nextState = produce(baseState, draftState => {
        _update(draftState, path, updater);
      });
      const changed = (baseState !== nextState);

      log.trace(`update(path=${JSON.stringify(path)}, updater=${updater}): changed=${changed}`);

      if (changed) {
        this._state = nextState;
        this.emit('change', this._state);
      }
    }

    clear() {
      log.trace('clear()');

      this._state = {};
      this.emit('change', this._state);
      return this._state;
    }
}

export default EventEmitterStore;
