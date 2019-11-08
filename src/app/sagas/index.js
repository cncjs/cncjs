import { fork, all, call } from 'redux-saga/effects';
import * as app from './app';
import * as serialport from './serialport';

const sagas = [
    app,
    serialport,
];

export default function* root() {
    yield all(sagas.map(saga => call(saga.init)));
    yield all(sagas.map(saga => fork(saga.process)));
}
