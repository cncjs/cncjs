import deepKeys from 'deep-keys';
import _ from 'lodash';
import serviceContainer from '../service-container';
import {
    ERR_NOT_FOUND
} from '../constants';

const config = serviceContainer.resolve('config');

export const get = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    const value = config.get(key);
    res.send(value);
};

export const unset = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    config.unset(key);
    res.send({ err: false });
};

export const set = (req, res) => {
    const query = req.query || {};
    const data = { ...req.body };

    if (query.key) {
        config.set(`state.${query.key}`, data);
        res.send({ err: false });
        return;
    }

    deepKeys(data).forEach((key) => {
        const oldValue = config.get(`state.${key}`);
        const newValue = _.get(data, key);

        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            config.set(`state.${key}`, {
                ...oldValue,
                ...newValue
            });
        } else {
            config.set(`state.${key}`, newValue);
        }
    });

    res.send({ err: false });
};
