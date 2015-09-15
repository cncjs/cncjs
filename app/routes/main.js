var settings = require('../config/settings');
var urljoin = require('../lib/urljoin');

module.exports = {
    init: function(app) {
        var api = require('./api');
        var site = require('./site');

        // status
        app.get(urljoin(settings.route, 'api/status'), api.status);

        // i18n
        app.get(urljoin(settings.route, 'api/i18n/lng'), api.i18n.getLanguage);
        app.post(urljoin(settings.route, 'api/i18n/lng/:__lng__'), api.i18n.setLanguage);
        app.get(urljoin(settings.route, 'api/i18n/acceptedLng'), api.i18n.getAcceptedLanguage);
        app.post(urljoin(settings.route, 'api/i18n/sendMissing/:__lng__/:__ns__'), api.i18n.saveMissing);

        // site
        app.get(urljoin(settings.route, '*'), site.view);

        return module.exports;
    }
};
