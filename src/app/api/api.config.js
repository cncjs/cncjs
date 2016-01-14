import _ from 'lodash';
import fs from 'fs';
import settings from '../config/settings';
import log from '../lib/log';

const loadConfigFile = (file) => {
    let config;
    try {
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch(err) {
        config = {};
    }
    return config;
};

export const loadConfig = (req, res) => {
    let config = loadConfigFile(settings.cncrc);
    res.send(config);
};

export const saveConfig = (req, res) => {
    let config = loadConfigFile(settings.cncrc);

    try {
        // Copy all of the properties in request body over to the config
        _.extend(config, req.body);

        let text = JSON.stringify(config, null, 4); // space=4
        fs.writeFile(settings.cncrc, text, (err) => {
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
