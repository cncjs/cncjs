import deepKeys from 'deep-keys';
import _ from 'lodash';
import config from '../services/configstore';
import {
  ERR_BAD_REQUEST,
} from '../constants';

const CONFIG_KEY = 'tool';

export const get = (req, res) => {
  res.send(config.get(CONFIG_KEY));
};

export const set = (req, res) => {
  const data = { ...req.body };
  const keys = deepKeys(data);
  const allowedKeySet = new Set([
    'toolChangePolicy',
    'toolChangeX',
    'toolChangeY',
    'toolChangeZ',
    'toolProbeX',
    'toolProbeY',
    'toolProbeZ',
    'toolProbeCustomCommands',
    'toolProbeCommand',
    'toolProbeDistance',
    'toolProbeFeedrate',
    'touchPlateHeight',
  ]);
  const invalidKeys = keys.filter((key) => !allowedKeySet.has(key));
  if (invalidKeys.length > 0) {
    res.status(ERR_BAD_REQUEST).send({
      msg: `Invalid keys specified: ${invalidKeys.join(', ')}`,
    });
    return;
  }

  keys.forEach((key) => {
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
