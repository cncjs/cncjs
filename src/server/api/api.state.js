import deepKeys from 'deep-keys';
import _ from 'lodash';
import config from '../services/configstore';
import {
  ERR_NOT_FOUND
} from '../constants';

const CONFIG_KEY = 'state';

export const get = (req, res) => {
  const query = req.query || {};

  if (!query.key) {
    res.send(config.get(CONFIG_KEY));
    return;
  }

  const key = `${CONFIG_KEY}.${query.key}`;
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
    res.send(config.get(CONFIG_KEY));
    return;
  }

  const key = `${CONFIG_KEY}.${query.key}`;
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
    const key = `${CONFIG_KEY}.${query.key}`;
    config.set(key, data);
    res.send({ err: false });
    return;
  }

  deepKeys(data).forEach((key) => {
    const oldValue = config.get(`${CONFIG_KEY}.${key}`);
    const newValue = _.get(data, key);

    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      config.set(`${CONFIG_KEY}.${key}`, {
        ...oldValue,
        ...newValue
      });
    } else {
      config.set(`${CONFIG_KEY}.${key}`, newValue);
    }
  });

  res.send({ err: false });
};
