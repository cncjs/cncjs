import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import ensureArray from 'ensure-array';
import _isPlainObject from 'lodash/isPlainObject';
import _find from 'lodash/find';
import _some from 'lodash/some';
import { v4 as uuidv4 } from 'uuid';
import settings from '../config/settings';
import { ensureFiniteNumber } from '../lib/ensure-type';
import logger from '../lib/logger';
import serviceContainer from '../service-container';
import { getPagingRange } from './shared/paging';
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_NOT_FOUND,
  ERR_CONFLICT,
  ERR_PRECONDITION_FAILED,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const userStore = serviceContainer.resolve('userStore');

const log = logger('api:users');

const CONFIG_KEY = 'users';

// Generate access token
// https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
// Note. Do not use password and other sensitive fields in the payload
const generateAccessToken = (payload, secret = settings.secret) => {
  const token = jwt.sign(payload, secret, {
    expiresIn: settings.accessTokenLifetime
  });

  return token;
};

const getSanitizedRecords = () => {
  const records = ensureArray(userStore.get(CONFIG_KEY));

  let shouldUpdate = false;
  for (let i = 0; i < records.length; ++i) {
    if (!_isPlainObject(records[i])) {
      records[i] = {};
    }

    const record = records[i];

    if (!record.id) {
      record.id = uuidv4();
      shouldUpdate = true;
    }

    // Defaults to true
    if (record.enabled === undefined) {
      record.enabled = true;
    }
  }

  if (shouldUpdate) {
    log.debug(`update sanitized records: ${JSON.stringify(records)}`);

    // Pass `{ silent changes }` will suppress the change event
    userStore.set(CONFIG_KEY, records, { silent: true });
  }

  return records;
};

export const signin = (req, res) => {
  const { token = '', name = '', password = '' } = { ...req.body };
  const users = getSanitizedRecords();
  const enabledUsers = users.filter(user => {
    return user.enabled;
  });

  if (enabledUsers.length === 0) {
    const user = { id: '', name: '' };
    const payload = { ...user };
    const token = generateAccessToken(payload, settings.secret); // generate access token
    res.send({
      enabled: false, // session is disabled
      token: token,
      name: user.name // empty name
    });
    return;
  }

  if (!token) {
    const user = _find(enabledUsers, { name: name });
    const valid = user && bcrypt.compareSync(password, user.password);

    if (!valid) {
      res.status(ERR_UNAUTHORIZED).send({
        msg: 'Authentication failed'
      });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name
    };
    const token = generateAccessToken(payload, settings.secret); // generate access token
    res.send({
      enabled: true, // session is enabled
      token: token, // new token
      name: user.name
    });
    return;
  }

  jwt.verify(token, settings.secret, (err, user) => {
    if (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: 'Internal server error'
      });
      return;
    }

    const iat = new Date(user.iat * 1000).toISOString();
    const exp = new Date(user.exp * 1000).toISOString();
    log.debug(`jwt.verify: user.id=${user.id}, user.name=${user.name}, user.iat=${iat}, user.exp=${exp}`);

    user = _find(enabledUsers, { id: user.id, name: user.name });
    if (!user) {
      res.status(ERR_UNAUTHORIZED).send({
        msg: 'Authentication failed'
      });
      return;
    }

    res.send({
      enabled: true, // session is enabled
      token: token, // old token
      name: user.name
    });
  });
};

export const fetch = (req, res) => {
  const records = getSanitizedRecords();
  const paging = !!req.query.paging;

  if (paging) {
    const { page = 1, pageLength = 10 } = req.query;
    const totalRecords = records.length;
    const [begin, end] = getPagingRange({ page, pageLength, totalRecords });
    const pagedRecords = records.slice(begin, end);

    res.send({
      pagination: {
        page: ensureFiniteNumber(page),
        pageLength: ensureFiniteNumber(pageLength),
        totalRecords: ensureFiniteNumber(totalRecords)
      },
      records: pagedRecords.map(record => {
        const { id, mtime, enabled, name } = { ...record };
        return { id, mtime, enabled, name };
      })
    });
  } else {
    res.send({
      records: records.map(record => {
        const { id, mtime, enabled, name } = { ...record };
        return { id, mtime, enabled, name };
      })
    });
  }
};

export const create = (req, res) => {
  const {
    enabled = true,
    name = '',
    password = ''
  } = { ...req.body };

  if (!name) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'The "name" parameter must not be empty'
    });
    return;
  }

  if (!password) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'The "password" parameter must not be empty'
    });
    return;
  }

  const records = getSanitizedRecords();
  if (_find(records, { name: name })) {
    res.status(ERR_CONFLICT).send({
      msg: 'The specified user already exists'
    });
    return;
  }

  try {
    const salt = bcrypt.genSaltSync();
    const hash = bcrypt.hashSync(password.trim(), salt);
    const records = getSanitizedRecords();
    const record = {
      id: uuidv4(),
      mtime: new Date().getTime(),
      enabled: enabled,
      name: name,
      password: hash
    };

    records.push(record);
    userStore.set(CONFIG_KEY, records);

    res.send({ id: record.id, mtime: record.mtime });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
    });
  }
};

export const read = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = _find(records, { id: id });

  if (!record) {
    res.status(ERR_NOT_FOUND).send({
      msg: 'Not found'
    });
    return;
  }

  const { mtime, enabled, name } = { ...record };
  res.send({ id, mtime, enabled, name });
};

export const update = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = _find(records, { id: id });

  if (!record) {
    res.status(ERR_NOT_FOUND).send({
      msg: 'Not found'
    });
    return;
  }

  const {
    enabled = record.enabled,
    name = record.name,
    oldPassword = '',
    newPassword = ''
  } = { ...req.body };
  const willChangePassword = oldPassword && newPassword;

  // Skip validation for "enabled" and "name"

  if (willChangePassword && !bcrypt.compareSync(oldPassword, record.password)) {
    res.status(ERR_PRECONDITION_FAILED).send({
      msg: 'Incorrect password'
    });
    return;
  }

  const inuse = (record) => {
    return record.id !== id && record.name === name;
  };
  if (_some(records, inuse)) {
    res.status(ERR_CONFLICT).send({
      msg: 'The specified user already exists'
    });
    return;
  }

  try {
    record.mtime = new Date().getTime();
    record.enabled = Boolean(enabled);
    record.name = String(name || '');

    if (willChangePassword) {
      const salt = bcrypt.genSaltSync();
      const hash = bcrypt.hashSync(newPassword.trim(), salt);
      record.password = hash;
    }

    userStore.set(CONFIG_KEY, records);

    res.send({ id: record.id, mtime: record.mtime });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
    });
  }
};

export const __delete = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = _find(records, { id: id });

  if (!record) {
    res.status(ERR_NOT_FOUND).send({
      msg: 'Not found'
    });
    return;
  }

  try {
    const filteredRecords = records.filter(record => {
      return record.id !== id;
    });
    userStore.set(CONFIG_KEY, filteredRecords);

    res.send({ id: record.id });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
    });
  }
};
