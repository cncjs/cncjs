import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import app from 'app/containers/App/reducers';
import connection from './connection';
import controller from './controller';
import serialport from './serialport';
import workflow from './workflow';

const rootReducer = combineReducers({
    container: combineReducers({
        app,
    }),
    connection,
    controller,
    serialport,
    workflow,
    routing: routerReducer
});

export default rootReducer;
