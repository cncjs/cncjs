import ImmutableStore from '../lib/immutable-store';

const defaultState = {
    controllers: {}
};

const state = _.merge({}, defaultState);
const store = new ImmutableStore(state);

export default store;
