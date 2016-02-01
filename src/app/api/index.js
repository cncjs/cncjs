import settings from '../config/settings';
import urljoin from '../lib/urljoin';
import * as api_status from './api.status';
import * as api_config from './api.config';
import * as api_gcode from './api.gcode';
import * as api_i18n from './api.i18n';
import * as api_controllers from './api.controllers';

const api = {
    status: api_status,
    config: api_config,
    gcode: api_gcode,
    i18n: api_i18n,
    controllers: api_controllers,
    addRoutes: (app) => {
        // status
        app.get(urljoin(settings.route, 'api/status'), api.status.currentStatus);

        // config
        app.get(urljoin(settings.route, 'api/config'), api.config.get);
        app.put(urljoin(settings.route, 'api/config'), api.config.set);
        app.delete(urljoin(settings.route, 'api/config'), api.config.unset);

        // gcode 
        app.post(urljoin(settings.route, 'api/gcode/upload'), api.gcode.upload);

        // controllers
        app.get(urljoin(settings.route, 'api/controllers'), api.controllers.getActiveControllers);

        // i18n
        app.get(urljoin(settings.route, 'api/i18n/acceptedLng'), api.i18n.getAcceptedLanguage);
        app.post(urljoin(settings.route, 'api/i18n/sendMissing/:__lng__/:__ns__'), api.i18n.saveMissing);
    }
};

export default api;
