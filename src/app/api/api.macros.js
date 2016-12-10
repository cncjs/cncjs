import _ from 'lodash';
import uuid from 'uuid';
import settings from '../config/settings';
import config from '../services/configstore';
import {
    ERR_NOT_FOUND,
    ERR_INTERNAL_SERVER_ERROR
} from './constants';

export const listMacros = (req, res) => {
    const macros = _.map(config.get('macros', []), (macro) => {
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
    const macro = _.find(config.get('macros', []), { id: id });

    if (!macro) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Macro not found'
        });
        return;
    }

    res.send({
        id: macro.id,
        name: macro.name,
        content: macro.content
    });
};

export const addMacro = (req, res) => {
    const { name, content } = { ...req.body };

    try {
        const macros = config.get('macros', []);
        const macro = {
            id: uuid.v4(),
            name: name,
            content: content
        };

        if (_.isArray(macros)) {
            macros.push(macro);
            config.set('macros', macros);
        } else {
            config.set('macros', [macro]);
        }

        res.send({ err: null });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const updateMacro = (req, res) => {
    const id = req.params.id;
    const { name, content } = { ...req.body };
    const macros = config.get('macros', []);
    const macro = _.find(macros, { id: id });

    if (!macro) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Macro not found'
        });
        return;
    }

    try {
        macro.name = name;
        macro.content = content;
        config.set('macros', macros);

        res.send({ err: null });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const deleteMacro = (req, res) => {
    const id = req.params.id;
    const macro = _.find(config.get('macros', []), { id: id });

    if (!macro) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Macro not found'
        });
        return;
    }

    try {
        const macros = _.filter(config.get('macros', []), (macro) => {
            return macro.id !== id;
        });
        config.set('macros', macros);

        res.send({ err: null });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};
