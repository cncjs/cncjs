import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { END } from 'redux-saga';
import { createLogger } from 'redux-logger';
import rootReducer from 'app/reducers';
import sagaMiddleware from './sagaMiddleware';

/** Use redux-devtools-extension for Chrome or Firefox browsers in development mode
 *  Repo: https://github.com/zalmoxisus/redux-devtools-extension
 *  Chrome Extension: https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd
 *  Firefox Add-on: https://addons.mozilla.org/en-US/firefox/addon/remotedev
 */
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancer = composeEnhancers(
    // Middleware you want to use in development
    applyMiddleware(thunk, sagaMiddleware, createLogger({ collapsed: true })),
    // Optional. Lets you write ?debug_session=<key> in address bar to persist debug sessions
);

const configureStore = (preloadedState) => {
    // Note: only Redux >= 3.1.0 supports passing enhancer as third argument.
    // See https://github.com/rackt/redux/releases/tag/v3.1.0
    const store = createStore(rootReducer, preloadedState, enhancer);

    // Hot reload reducers (requires Webpack or Browserify HMR to be enabled)
    if (module.hot) {
        // Enable Webpack hot module replacement for reducers
        module.hot.accept('app/reducers', () => {
            const nextReducer = require('app/reducers').default;
            store.replaceReducer(nextReducer);
        });
    }

    store.runSaga = sagaMiddleware.run;
    store.close = () => store.dispatch(END);
    return store;
};

export default configureStore;
