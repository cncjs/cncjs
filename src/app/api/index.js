import settings from '../config/settings';
import urljoin from '../lib/urljoin';
import * as versionAPI from './api.version';
import * as configAPI from './api.config';
import * as gcodeAPI from './api.gcode';
import * as i18nAPI from './api.i18n';
import * as controllersAPI from './api.controllers';
import * as macroAPI from './api.macro';

const api = {
    version: versionAPI,
    config: configAPI,
    gcode: gcodeAPI,
    i18n: i18nAPI,
    controllers: controllersAPI,
    macro: macroAPI,
    addRoutes: (app) => {
        // Version
        app.get(urljoin(settings.route, 'api/version/latest'), api.version.getLatestVersion);

        // Config
        app.get(urljoin(settings.route, 'api/config'), api.config.get);
        app.put(urljoin(settings.route, 'api/config'), api.config.set);
        app.delete(urljoin(settings.route, 'api/config'), api.config.unset);

        // G-code
        app.put(urljoin(settings.route, 'api/gcode'), api.gcode.upload);
        app.get(urljoin(settings.route, 'api/gcode'), api.gcode.download);

        // Controllers
        app.get(urljoin(settings.route, 'api/controllers'), api.controllers.getActiveControllers);

        // Macro
        app.get(urljoin(settings.route, 'api/macro'), api.macro.listMacros);
        app.get(urljoin(settings.route, 'api/macro/:id'), api.macro.getMacro);
        app.post(urljoin(settings.route, 'api/macro'), api.macro.addMacro);
        app.put(urljoin(settings.route, 'api/macro/:id'), api.macro.updateMacro);
        app.delete(urljoin(settings.route, 'api/macro/:id'), api.macro.deleteMacro);

        // I18n
        app.get(urljoin(settings.route, 'api/i18n/acceptedLng'), api.i18n.getAcceptedLanguage);
        app.post(urljoin(settings.route, 'api/i18n/sendMissing/:__lng__/:__ns__'), api.i18n.saveMissing);
    }
};

export default api;
