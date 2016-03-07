import settings from '../config/settings';
import urljoin from '../lib/urljoin';
import * as statusAPI from './api.status';
import * as configAPI from './api.config';
import * as gcodeAPI from './api.gcode';
import * as i18nAPI from './api.i18n';
import * as controllersAPI from './api.controllers';

const api = {
    status: statusAPI,
    config: configAPI,
    gcode: gcodeAPI,
    i18n: i18nAPI,
    controllers: controllersAPI,
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
