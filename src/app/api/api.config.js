import _ from 'lodash';
import fs from 'fs';
import settings from '../config/settings';
import log from '../lib/log';

const loadConfigFile = (file) => {
    let config;
    try {
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        config = {};
    }
    return config;
};

export const get = (req, res) => {
    let query = req.query || {};
    let config = loadConfigFile(settings.cncrc);

    if (query.key) {
        res.send(_.get(config, query.key));
    } else {
        res.send(config);
    }
};

export const unset = (req, res) => {
    let query = req.query || {};
    let config = loadConfigFile(settings.cncrc);

    try {
        if (query.key) {
            _.unset(config, query.key, req.body);
        } else {
            config = {};
        }

        let text = JSON.stringify(config, null, 4); // space=4
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ 'err': true });
            } else {
                res.send({ 'err': false });
            }
        });
    } catch (err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};

export const set = (req, res) => {
    let query = req.query || {};
    let config = loadConfigFile(settings.cncrc);

    try {
        if (query.key) {
            _.set(config, query.key, req.body);
        } else {
            // Copy all of the properties in request body over to the config
            config = _.merge({}, config, req.body);
        }

        let text = JSON.stringify(config, null, 4); // space=4
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ 'err': true });
            } else {
                res.send({ 'err': false });
            }
        });
    } catch (err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};
