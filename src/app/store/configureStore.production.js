import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { END } from 'redux-saga';
import rootReducer from '../reducers';
import sagaMiddleware from './sagaMiddleware';

const enhancer = applyMiddleware(thunk, sagaMiddleware);

const configureStore = (preloadedState) => {
    // Note: only Redux >= 3.1.0 supports passing enhancer as third argument.
    // See https://github.com/rackt/redux/releases/tag/v3.1.0
    const store = createStore(rootReducer, preloadedState, enhancer);
    store.runSaga = sagaMiddleware.run;
    store.close = () => store.dispatch(END);
    return store;
};

export default configureStore;
