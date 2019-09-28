import { call, put, takeLatest } from 'redux-saga/effects';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
} from 'app/actions/connection';
import controller from 'app/lib/controller';
import promisify from 'app/lib/promisify';

const asyncOpenConnection = promisify(controller.openConnection, {
    errorFirst: true,
    thisArg: controller
});
const asyncCloseConnection = promisify(controller.closeConnection, {
    errorFirst: true,
    thisArg: controller
});

export function* init() {
    yield null;
}

export function* process() {
    yield takeLatest(OPEN_CONNECTION.REQUEST, openConnection);
    yield takeLatest(CLOSE_CONNECTION.REQUEST, closeConnection);
}

function* openConnection(action) {
    try {
        const { controllerType, connectionType, connectionOptions } = action.payload;

        const connectionState = yield call(asyncOpenConnection, controllerType, connectionType, connectionOptions);
        const data = {
            ...connectionState,
        };

        yield put({ type: OPEN_CONNECTION.SUCCESS, payload: data });
    } catch (e) {
        const error = new Error(e.message);
        yield put({ type: OPEN_CONNECTION.FAILURE, payload: error });
    }
}

function* closeConnection(action) {
    try {
        const connectionState = yield call(asyncCloseConnection);
        const data = {
            ...connectionState,
        };

        yield put({ type: CLOSE_CONNECTION.SUCCESS, payload: data });
    } catch (e) {
        const error = new Error(e.message);
        yield put({ type: CLOSE_CONNECTION.FAILURE, payload: error });
    }
}
