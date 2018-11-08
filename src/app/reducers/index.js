import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import app from 'app/containers/App/reducers';

const rootReducer = combineReducers({
    container: combineReducers({
        app,
    }),
    routing: routerReducer
});

export default rootReducer;
