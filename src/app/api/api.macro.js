import fs from 'fs';
import _ from 'lodash';
import uuid from 'node-uuid';
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

export const list = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const { macros = [] } = config;

    res.send(macros);
};

export const add = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const { name, content } = { ...req.body };

    try {
        const macro = {
            id: uuid.v4(),
            name: name,
            content: content
        };
        config.macros.push(macro);

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};

export const update = (req, res) => {
    const id = req.params.id;
    const { name, content } = { ...req.body };
    const config = loadConfigFile(settings.cncrc);

    try {
        const macro = _.find(config.macros, { id: id });
        macro.name = name;
        macro.content = content;

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};

export const remove = (req, res) => {
    const id = req.params.id;
    const config = loadConfigFile(settings.cncrc);

    try {
        const macros = _.filter(config.macros, (macro) => {
            return macro.id !== id;
        });

        config.macros = macros;

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};
