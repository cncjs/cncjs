import { fork, all, call } from 'redux-saga/effects';
import * as app from './app';
import * as connection from './connection';

const programs = [
    app,
    connection,
];

export default function* root() {
    yield all(programs.map(program => call(program.init)));
    yield all(programs.map(program => fork(program.process)));
}
