import events from 'events';
import produce from 'immer';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _update from 'lodash/update';
import x from 'app/lib/json-stringify';
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

  get(path, defaultValue) {
    if (defaultValue !== undefined) {
      log.trace(`get(path=${x(path)}, defaultValue=${x(defaultValue)})`);
    } else {
      log.trace(`get(path=${x(path)})`);
    }

    return (path === undefined) ? this._state : _get(this._state, path, defaultValue);
  }

  set(path, value) {
    const baseState = this._state;
    const nextState = produce(baseState, draftState => {
      _set(draftState, path, value);
    });
    const changed = (baseState !== nextState);

    log.trace(`set(path=${x(path)}, value=${x(value)}): changed=${changed}`);

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

    log.trace(`unset(path=${x(path)}): changed=${changed}`);

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

    log.trace(`update(path=${x(path)}, updater=${updater}): changed=${changed}`);

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
