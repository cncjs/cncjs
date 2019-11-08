import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'sender';

export const {
    UPDATE_SENDER_STATUS,
} = constants(NS, [
    'UPDATE_SENDER_STATUS',
]);

export const updateSenderStatus = createAction(UPDATE_SENDER_STATUS);
