import { fork, all, call } from 'redux-saga/effects';
import * as app from './app';
import * as connection from './connection';
import * as serialport from './serialport';

const programs = [
    app,
    connection,
    serialport,
];

export default function* root() {
    yield all(programs.map(program => call(program.init)));
    yield all(programs.map(program => fork(program.process)));
}
