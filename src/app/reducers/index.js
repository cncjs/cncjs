import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import app from 'app/containers/App/reducers';
import connection from './connection';
import controller from './controller';
import feeder from './feeder';
import sender from './sender';
import serialport from './serialport';
import workflow from './workflow';

const rootReducer = combineReducers({
    container: combineReducers({
        app,
    }),
    connection,
    controller,
    feeder,
    sender,
    serialport,
    workflow,
    routing: routerReducer
});

export default rootReducer;
