import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'connection';

export const {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} = constants(NS, {
    'OPEN_CONNECTION': ['REQUEST'],
    'CLOSE_CONNECTION': ['REQUEST'],
    'UPDATE_CONNECTION': 'UPDATE_CONNECTION',
});

export const openConnection = createAction(OPEN_CONNECTION.REQUEST);
export const closeConnection = createAction(CLOSE_CONNECTION.REQUEST);
export const updateConnection = createAction(UPDATE_CONNECTION);
