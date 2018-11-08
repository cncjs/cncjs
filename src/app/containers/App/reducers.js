import { createReducer } from 'redux-action';
import {
    APP_INIT,
    APP_INIT_SUCCESS,
    APP_INIT_FAILURE,
    PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS
} from './constants';

const initialState = {
    // App
    isAppInitializing: true,
    error: null,

    // Workspace
    promptUserForCorruptedWorkspaceSettings: false
};

export default createReducer(initialState, {
    [APP_INIT]: () => ({
        isAppInitializing: true
    }),
    [APP_INIT_SUCCESS]: () => ({
        isAppInitializing: false,
        error: null
    }),
    [APP_INIT_FAILURE]: (error) => ({
        isAppInitializing: false,
        error
    }),
    [PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS]: () => ({
        promptUserForCorruptedWorkspaceSettings: true
    })
});
