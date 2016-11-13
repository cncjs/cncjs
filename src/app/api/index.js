import settings from '../config/settings';
import urljoin from '../lib/urljoin';
import * as versionAPI from './api.version';
import * as configAPI from './api.config';
import * as gcodeAPI from './api.gcode';
import * as i18nAPI from './api.i18n';
import * as controllersAPI from './api.controllers';
import * as accountsAPI from './api.accounts';
import * as macroAPI from './api.macros';

const api = {
    version: versionAPI,
    config: configAPI,
    gcode: gcodeAPI,
    i18n: i18nAPI,
    controllers: controllersAPI,
    accounts: accountsAPI,
    macros: macroAPI,
    addRoutes: (app) => {
        // Version
        app.get(urljoin(settings.route, 'api/version/latest'), api.version.getLatestVersion);

        // Config
        app.get(urljoin(settings.route, 'api/config'), api.config.get);
        app.put(urljoin(settings.route, 'api/config'), api.config.set);
        app.delete(urljoin(settings.route, 'api/config'), api.config.unset);

        // G-code
        app.get(urljoin(settings.route, 'api/gcode'), api.gcode.get);
        app.put(urljoin(settings.route, 'api/gcode'), api.gcode.set);
        app.get(urljoin(settings.route, 'api/gcode/download'), api.gcode.download);

        // Controllers
        app.get(urljoin(settings.route, 'api/controllers'), api.controllers.getActiveControllers);

        // Accounts
        app.get(urljoin(settings.route, 'api/accounts'), api.accounts.listAccounts);
        app.get(urljoin(settings.route, 'api/accounts/:id'), api.accounts.getAccount);
        app.post(urljoin(settings.route, 'api/accounts/'), api.accounts.newAccount);
        app.put(urljoin(settings.route, 'api/accounts/:id'), api.accounts.updateAccount);
        app.delete(urljoin(settings.route, 'api/accounts/:id'), api.accounts.deleteAccount);

        // Macros
        app.get(urljoin(settings.route, 'api/macros'), api.macros.listMacros);
        app.get(urljoin(settings.route, 'api/macros/:id'), api.macros.getMacro);
        app.post(urljoin(settings.route, 'api/macros'), api.macros.addMacro);
        app.put(urljoin(settings.route, 'api/macros/:id'), api.macros.updateMacro);
        app.delete(urljoin(settings.route, 'api/macros/:id'), api.macros.deleteMacro);

        // I18n
        app.get(urljoin(settings.route, 'api/i18n/acceptedLng'), api.i18n.getAcceptedLanguage);
        app.post(urljoin(settings.route, 'api/i18n/sendMissing/:__lng__/:__ns__'), api.i18n.saveMissing);
    }
};

export default api;
