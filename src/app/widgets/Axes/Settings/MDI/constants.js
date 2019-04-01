import constants from 'namespace-constants';
import uuid from 'uuid';

module.exports = constants(uuid.v4(), [
    'MODAL_CREATE_RECORD',
    'MODAL_UPDATE_RECORD'
]);
