import deepKeys from 'deep-keys';
import _get from 'lodash/get';
import serviceContainer from '../service-container';
import {
    ERR_NOT_FOUND
} from '../constants';

const userStore = serviceContainer.resolve('userStore');

export const get = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(userStore.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!userStore.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    const value = userStore.get(key);
    res.send(value);
};

export const unset = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(userStore.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!userStore.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    userStore.unset(key);
    res.send({ err: false });
};

export const set = (req, res) => {
    const query = req.query || {};
    const data = { ...req.body };

    if (query.key) {
        userStore.set(`state.${query.key}`, data);
        res.send({ err: false });
        return;
    }

    deepKeys(data).forEach((key) => {
        const oldValue = userStore.get(`state.${key}`);
        const newValue = _get(data, key);

        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            userStore.set(`state.${key}`, {
                ...oldValue,
                ...newValue
            });
        } else {
            userStore.set(`state.${key}`, newValue);
        }
    });

    res.send({ err: false });
};
