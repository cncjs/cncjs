var fs = require('fs'),
    _ = require('lodash'),
    settings = require('../config/settings'),
    log = require('../lib/log');

var loadConfig = function(file) {
    var config = {};

    try {
        config = JSON.parse(fs.readFileSync(settings.cncrc, 'utf8'));
    }
    catch(err) {
        config = {};
    }

    return config;
};

module.exports = {};

module.exports.loadConfig = function(req, res) {
    config = loadConfig(settings.cncrc);
    res.send(config);
};

module.exports.saveConfig = function(req, res) {
    var config = loadConfig(settings.cncrc);

    try {
        // Copy all of the properties in request body over to the config
        _.extend(config, req.body);

        var text = JSON.stringify(config, null, 4); // space=4
        fs.writeFile(settings.cncrc, text, function(err) {
            if (err) {
                log.error(err);
                res.send({ 'err': true });
            } else {
                res.send({ 'err': false });
            }
        });
    }
    catch(err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};
