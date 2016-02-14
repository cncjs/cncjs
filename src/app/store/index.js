import ImmutableStore from '../lib/immutable-store';

const defaultState = {
    controllers: {}
};

const store = new ImmutableStore(defaultState);

export default store;
