import constants from 'namespace-constants';
import uuid from 'uuid/v4';

export const {
    APP_INIT,
    APP_INIT_SUCCESS,
    APP_INIT_FAILURE,
    PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS
} = constants(uuid(), [
    'APP_INIT',
    'APP_INIT_SUCCESS',
    'APP_INIT_FAILURE',
    'PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS'
]);
