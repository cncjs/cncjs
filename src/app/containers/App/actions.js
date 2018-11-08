import { createAction } from 'redux-action';
import {
    APP_INIT,
    APP_INIT_SUCCESS,
    APP_INIT_FAILURE,
    PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS
} from './constants';

export const appInit = createAction(APP_INIT);
export const appInitSuccess = createAction(APP_INIT_SUCCESS);
export const appInitFailure = createAction(APP_INIT_FAILURE);
export const promptUserForCorruptedWorkspaceSettings = createAction(PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS);
