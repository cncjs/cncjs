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
    if (!_.isArray(config.macros)) {
        config.macros = [];
    }
    return config;
};

export const listMacros = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const macros = _.map(config.macros, (macro) => {
        const { id, name, content } = macro;

        return {
            id: id,
            name: name,
            size: _.size(content)
        };
    });

    res.send(macros);
};

export const getMacro = (req, res) => {
    const id = req.params.id;
    const config = loadConfigFile(settings.cncrc);
    const macro = _.find(config.macros, { id: id });

    if (!macro) {
        res.status(404);
        return;
    }

    res.send({
        id: macro.id,
        name: macro.name,
        content: macro.content
    });
};

export const addMacro = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const { name, content } = { ...req.body };

    try {
        const macro = {
            id: uuid.v4(),
            name: name,
            content: content
        };

        if (!_.isArray(config.macros)) {
            config.macros = [];
        }
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

export const updateMacro = (req, res) => {
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

export const deleteMacro = (req, res) => {
    const id = req.params.id;
    const config = loadConfigFile(settings.cncrc);

    try {
        const macros = _.filter(config.macros, (macro) => {
            return macro.id !== id;
        });

        config.macros = macros || [];

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
