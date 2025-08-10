import deepKeys from 'deep-keys';
import _ from 'lodash';
import serviceContainer from '../service-container';
import {
  ERR_BAD_REQUEST,
} from '../constants';

const userStore = serviceContainer.resolve('userStore');

const CONFIG_KEY = 'tool';

const api = {
  get: (req, res) => {
    res.send(userStore.get(CONFIG_KEY));
  },
  set: (req, res) => {
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
      const oldValue = userStore.get(`${CONFIG_KEY}.${key}`);
      const newValue = _.get(data, key);

      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        userStore.set(`${CONFIG_KEY}.${key}`, {
          ...oldValue,
          ...newValue
        });
      } else {
        userStore.set(`${CONFIG_KEY}.${key}`, newValue);
      }
    });

    res.send({ err: false });
  },
};

export default api;
