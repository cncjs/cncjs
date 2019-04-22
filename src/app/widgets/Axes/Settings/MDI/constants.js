import constants from 'namespace-constants';
import uuid from 'uuid';

export const {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} = constants(uuid.v4(), [
    'MODAL_CREATE_RECORD',
    'MODAL_UPDATE_RECORD'
]);
