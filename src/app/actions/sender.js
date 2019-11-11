import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'sender';

export const {
    UPDATE_BOUNDING_BOX,
    UPDATE_SENDER_STATUS,
} = constants(NS, [
    'UPDATE_BOUNDING_BOX',
    'UPDATE_SENDER_STATUS',
]);

export const updateBoundingBox = createAction(UPDATE_BOUNDING_BOX);
export const updateSenderStatus = createAction(UPDATE_SENDER_STATUS);
