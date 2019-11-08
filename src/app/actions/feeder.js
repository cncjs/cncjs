import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'feeder';

export const {
    UPDATE_FEEDER_STATUS,
} = constants(NS, [
    'UPDATE_FEEDER_STATUS',
]);

export const updateFeederStatus = createAction(UPDATE_FEEDER_STATUS);
