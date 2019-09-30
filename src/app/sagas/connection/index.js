import { call, put, takeLatest } from 'redux-saga/effects';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} from 'app/actions/connection';
import {
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
    CONNECTION_STATE_CONNECTED,
    CONNECTION_STATE_DISCONNECTED,
} from 'app/constants/connection';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import reduxStore from 'app/store/redux';

export function* init() {
    controller.addListener('connection:open', (connectionState) => {
        const { type, ident, options } = { ...connectionState };

        log.debug(`A new connection was established: type=${JSON.stringify(type)}, options=${JSON.stringify(options)}`);

        reduxStore.dispatch({
            type: UPDATE_CONNECTION,
            payload: {
                error: null,
                state: CONNECTION_STATE_CONNECTED,
                type,
                ident,
                options,
            }
        });
    });

    controller.addListener('connection:error', (connectionState, error) => {
        const { type, options } = { ...connectionState };

        if (type === CONNECTION_TYPE_SERIAL) {
            log.error(`Error opening serial port: ${options.path}`);
        } else if (type === CONNECTION_TYPE_SOCKET) {
            log.error(`Error opening socket connection: ${options.host}:${options.port}`);
        }

        reduxStore.dispatch({
            type: UPDATE_CONNECTION,
            payload: {
                error,
                state: CONNECTION_STATE_DISCONNECTED,
                type: null,
                ident: null,
                options: null,
            }
        });
    });

    controller.addListener('connection:close', (connectionState) => {
        const { type, options } = { ...connectionState };

        log.debug(`The connection was closed: type=${JSON.stringify(type)}, options=${JSON.stringify(options)}`);

        reduxStore.dispatch({
            type: UPDATE_CONNECTION,
            payload: {
                error: null,
                state: CONNECTION_STATE_DISCONNECTED,
                type: null,
                ident: null,
                options: null,
            }
        });
    });

    yield null;
}

export function* process() {
    yield takeLatest(OPEN_CONNECTION.REQUEST, openConnection);
    yield takeLatest(CLOSE_CONNECTION.REQUEST, closeConnection);
}

function* openConnection(action) {
    try {
        const { controllerType, connectionType, connectionOptions } = action.payload;
        const { type, options } = yield call(() => new Promise((resolve, reject) => {
            controller.open(controllerType, connectionType, connectionOptions, (err, ...args) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(...args);
            });
        }));

        log.debug(`openConnection: type=${type}, options=${JSON.stringify(options)}`);
    } catch (e) {
        const error = new Error(e.message);
        log.error('openConnection:', error);
        yield put({
            type: UPDATE_CONNECTION,
            payload: {
                error,
                state: CONNECTION_STATE_DISCONNECTED,
                type: null,
                ident: null,
                options: null,
            }
        });
    }
}

function* closeConnection(action) {
    try {
        const { type, options } = yield call(() => new Promise((resolve, reject) => {
            controller.close((err, ...args) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(...args);
            });
        }));

        log.debug(`closeConnection: type=${type}, options=${JSON.stringify(options)}`);
    } catch (e) {
        const error = new Error(e.message);
        log.error('closeConnection:', error);
        yield put({
            type: UPDATE_CONNECTION,
            payload: {
                error,
                state: CONNECTION_STATE_DISCONNECTED,
                type: null,
                ident: null,
                options: null,
            }
        });
    }
}
