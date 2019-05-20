import _ from 'lodash';
import events from 'events';

class ImmutableStore extends events.EventEmitter {
    state = {};

    constructor(state = {}) {
        super();

        this.state = state;
    }

    get(key, defaultValue) {
        return _.get(this.state, key, defaultValue);
    }

    set(key, value) {
        this.state = _.merge({}, this.state, _.set({}, key, value));
        this.emit('change', this.state);
        return this.state;
    }

    unset(key) {
        let state = _.extend({}, this.state);
        _.unset(state, key);
        this.state = state;
        this.emit('change', this.state);
        return this.state;
    }

    replace(key, value) {
        this.unset(key);
        this.set(key, value);
    }

    clear() {
        this.state = {};
        this.emit('change', this.state);
        return this.state;
    }
}

export default ImmutableStore;
