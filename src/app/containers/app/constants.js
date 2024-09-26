import constants from 'namespace-constants';
import { v4 as uuidv4 } from 'uuid';

export const {
  APP_INIT,
  APP_INIT_SUCCESS,
  APP_INIT_FAILURE,
  PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS
} = constants(uuidv4(), [
  'APP_INIT',
  'APP_INIT_SUCCESS',
  'APP_INIT_FAILURE',
  'PROMPT_USER_FOR_CORRUPTED_WORKSPACE_SETTINGS'
]);
