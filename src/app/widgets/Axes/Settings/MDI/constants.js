import constants from 'namespace-constants';
import { v4 as uuidv4 } from 'uuid';

export const {
  MODAL_CREATE_RECORD,
  MODAL_UPDATE_RECORD
} = constants(uuidv4(), [
  'MODAL_CREATE_RECORD',
  'MODAL_UPDATE_RECORD'
]);
