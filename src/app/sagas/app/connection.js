import _get from 'lodash/get';
import _noop from 'lodash/noop';
import { call, takeLatest } from 'redux-saga/effects';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} from 'app/actions/connection';
import * as SERIALPORT from 'app/actions/serialport';
import {
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
    CONNECTION_STATE_CONNECTED,
    CONNECTION_STATE_DISCONNECTED,
} from 'app/constants/connection';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import reduxStore from 'app/store/redux';

const x = JSON.stringify;

export function* init() {
    controller.addListener('connection:open', (connectionState) => {
        const { type, ident, options } = { ...connectionState };

        log.debug(`A new connection was established: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

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
        const { type, ident, options } = { ...connectionState };

        log.debug(`A connection error occurred: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

        if (type === CONNECTION_TYPE_SERIAL) {
            const path = _get(options, 'path');
            log.error(`Error opening serial port: ${path}`);
            log.error(error);
        } else if (type === CONNECTION_TYPE_SOCKET) {
            const host = _get(options, 'host');
            const port = _get(options, 'port');
            log.error(`Error opening socket connection: ${host}:${port}`);
            log.error(error);
        }

        reduxStore.dispatch({
            type: UPDATE_CONNECTION,
            payload: {
                error,
                state: CONNECTION_STATE_DISCONNECTED,
                type,
                ident,
                options,
            }
        });
    });

    controller.addListener('connection:change', (connectionState, connected) => {
        const { type, ident, options } = { ...connectionState };

        log.debug(`The connection status was changed: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

        if (type === CONNECTION_TYPE_SERIAL) {
            const comName = _get(options, 'path');

            reduxStore.dispatch({
                type: SERIALPORT.UPDATE_CONNECTION_STATUS,
                payload: {
                    comName,
                    connected,
                }
            });
        }
    });

    controller.addListener('connection:close', (connectionState) => {
        const { type, ident, options } = { ...connectionState };

        log.debug(`The connection was closed: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

        reduxStore.dispatch({
            type: UPDATE_CONNECTION,
            payload: {
                error: null,
                state: CONNECTION_STATE_DISCONNECTED,
                type,
                ident,
                options,
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
    const controllerType = _get(action.payload, 'controller.type');
    const connectionType = _get(action.payload, 'connection.type');
    const connectionOptions = _get(action.payload, 'connection.options');
    const openConnectionCallback = _noop; // Callback is not required

    yield call({ context: controller, fn: controller.open }, controllerType, connectionType, connectionOptions, openConnectionCallback);
}

function* closeConnection(action) {
    const closeConnectionCallback = _noop; // Callback is not required

    yield call({ context: controller, fn: controller.close }, closeConnectionCallback);
}
