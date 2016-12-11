import config from '../services/configstore';
import {
    ERR_NOT_FOUND
} from '../constants';

export const get = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({ msg: 'Not found' });
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
        res.status(ERR_NOT_FOUND).send({ msg: 'Not found' });
        return;
    }

    config.unset(key);
    res.send({ err: false });
};

export const set = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    const value = req.body;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({ msg: 'Not found' });
        return;
    }

    config.set(key, value);
    res.send({ err: false });
};
