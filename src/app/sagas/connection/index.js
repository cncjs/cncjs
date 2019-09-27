import { call, put, takeLatest } from 'redux-saga/effects';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
} from 'app/actions/connection';
import {
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
} from 'app/constants/connection';
import controller from 'app/lib/controller';

export function* init() {
    yield null;
}

export function* process() {
    yield takeLatest(OPEN_CONNECTION.REQUEST, openConnection);
    yield takeLatest(CLOSE_CONNECTION.REQUEST, closeConnection);
}

function* openConnection(action) {
    try {
        const { connectionType, connectionOptions, controllerType } = action.payload;

        if (connectionType === CONNECTION_TYPE_SERIAL) {
            const { path, baudRate, rtscts } = connectionOptions;
            yield call(openSerialConnection, path, {
                controllerType,
                baudRate,
                rtscts,
            });
        } else if (connectionType === CONNECTION_TYPE_SOCKET) {
            // Not implemented
        }

        const data = {}; // FIXME

        yield put({ type: OPEN_CONNECTION.SUCCESS, payload: data });
    } catch (e) {
        const error = new Error(e.message);
        yield put({ type: OPEN_CONNECTION.FAILURE, payload: error });
    }
}

function* closeConnection(action) {
    try {
        const { port } = action.payload;

        yield call(closeSerialConnection, port);

        const data = {}; // FIXME

        yield put({ type: CLOSE_CONNECTION.SUCCESS, payload: data });
    } catch (e) {
        const error = new Error(e.message);
        yield put({ type: CLOSE_CONNECTION.FAILURE, payload: error });
    }
}

const openSerialConnection = (path, options) => new Promise((resolve, reject) => {
    controller.openPort(path, options, (err) => {
        if (err) {
            reject(err);
            return;
        }

        resolve();
    });
});

const closeSerialConnection = (port) => new Promise((resolve, reject) => {
    controller.closePort(port, (err) => {
        if (err) {
            reject(err);
            return;
        }

        resolve();
    });
});
