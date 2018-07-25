import ImmutableStore from '../lib/ImmutableStore';

const defaultState = {
    controllers: {}
};

const store = new ImmutableStore(defaultState);

export default store;
