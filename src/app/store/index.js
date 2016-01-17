import _ from 'lodash';
import events from 'events';

const defaults = {
    controllers: {}
};

class ImmutableStore extends events.EventEmitter {
    state = defaults;

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
        _.set(state, key, undefined);
        //_.unset(state, key); // TODO: _.unset() is available in lodash@v4
        this.state = state;
        this.emit('change', this.state);
        return this.state;
    }
}

const store = new ImmutableStore();

export default store;
