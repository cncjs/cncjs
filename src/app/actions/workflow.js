import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'workflow';

export const {
    UPDATE_WORKFLOW_STATE,
} = constants(NS, [
    'UPDATE_WORKFLOW_STATE',
]);

export const updateWorkflowState = createAction(UPDATE_WORKFLOW_STATE);
