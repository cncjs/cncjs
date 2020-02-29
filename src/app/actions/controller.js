import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'controller';

export const {
    UPDATE_BOUNDING_BOX,
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
    UPDATE_FEEDER_STATUS,
    UPDATE_SENDER_STATUS,
    UPDATE_WORKFLOW_STATE,
} = constants(NS, [
    'UPDATE_BOUNDING_BOX',
    'UPDATE_CONTROLLER_SETTINGS',
    'UPDATE_CONTROLLER_STATE',
    'UPDATE_FEEDER_STATUS',
    'UPDATE_SENDER_STATUS',
    'UPDATE_WORKFLOW_STATE',
]);

export const updateBoundingBox = createAction(UPDATE_BOUNDING_BOX);
export const updateControllerSettings = createAction(UPDATE_CONTROLLER_SETTINGS);
export const updateControllerState = createAction(UPDATE_CONTROLLER_STATE);
export const updateFeederStatus = createAction(UPDATE_FEEDER_STATUS);
export const updateWorkflowState = createAction(UPDATE_WORKFLOW_STATE);
