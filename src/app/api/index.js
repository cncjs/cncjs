import * as api_status from './api.status';
import * as api_config from './api.config';
import * as api_file from './api.file';
import * as api_i18n from './api.i18n';
import * as api_ports from './api.ports';

const api = {
    status: api_status,
    config: api_config,
    file: api_file,
    i18n: api_i18n,
    ports: api_ports
};

export default api;
