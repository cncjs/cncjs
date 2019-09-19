import constants from 'namespace-constants';
import { createAction } from 'redux-action';

export const {
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
} = constants([
    'UPDATE_CONTROLLER_SETTINGS',
    'UPDATE_CONTROLLER_STATE',
]);

export const updateControllerSettings = createAction(UPDATE_CONTROLLER_SETTINGS);
export const updateControllerState = createAction(UPDATE_CONTROLLER_STATE);
