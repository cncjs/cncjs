import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import app from 'app/containers/App/reducers';
import controller from './controller';

const rootReducer = combineReducers({
    container: combineReducers({
        app,
    }),
    controller,
    routing: routerReducer
});

export default rootReducer;
