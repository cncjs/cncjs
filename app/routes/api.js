module.exports.config = require('./api.config');
module.exports.i18n = require('./api.i18n');
module.exports.file = require('./api.file');

module.exports.status = function(req, res) {
    res.send({'reply':'ok'});
};
