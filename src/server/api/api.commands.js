import { ensureArray, ensureFiniteNumber, ensureString } from 'ensure-type';
import _find from 'lodash/find';
import _isPlainObject from 'lodash/isPlainObject';
import { v4 as uuidv4 } from 'uuid';
import settings from '../config/settings';
import x from '../lib/json-stringify';
import logger from '../lib/logger';
import serviceContainer from '../service-container';
import { getPagingRange } from './shared/paging';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const shellCommand = serviceContainer.resolve('shellCommand');
const userStore = serviceContainer.resolve('userStore');

const log = logger('api:commands');

const CONFIG_KEY = 'commands';

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

    if (record.enabled === undefined) {
      record.enabled = true;
      shouldUpdate = true;
    }

    if (record.name === undefined) {
      record.name = record.title ?? '';
      shouldUpdate = true;
    }

    if (record.action === undefined) {
      record.action = record.data ?? record.commands ?? record.command ?? '';
      shouldUpdate = true;
    }

    // Remove deprecated keys
    if (record.title !== undefined) {
      delete record.title;
      shouldUpdate = true;
    }
    if (record.data !== undefined) {
      delete record.data;
      shouldUpdate = true;
    }
    if (record.command !== undefined) {
      delete record.command;
      shouldUpdate = true;
    }
    if (record.commands !== undefined) {
      delete record.commands;
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    log.debug(`update sanitized records: ${JSON.stringify(records)}`);

    // Pass `{ silent changes }` will suppress the change event
    userStore.set(CONFIG_KEY, records, { silent: true });
  }

  return records;
};

const api = {
  fetch: (req, res) => {
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
          const { id, mtime, enabled, name, action } = { ...record };
          return { id, mtime, enabled, name, action };
        })
      });
    } else {
      res.send({
        records: records.map(record => {
          const { id, mtime, enabled, name, action } = { ...record };
          return { id, mtime, enabled, name, action };
        })
      });
    }
  },
  create: (req, res) => {
    const {
      enabled = true,
      name = '',
      action = '',
    } = { ...req.body };

    if (!name) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "name" parameter must not be empty'
      });
      return;
    }

    if (!action) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "action" parameter must not be empty'
      });
      return;
    }

    try {
      const records = getSanitizedRecords();
      const record = {
        id: uuidv4(),
        mtime: new Date().getTime(),
        enabled: !!enabled,
        name,
        action,
      };

      records.push(record);
      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id, mtime: record.mtime });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
  bulkDelete: (req, res) => {
    const ids = ensureArray(req.body?.ids);
    if (!ids.length) {
      res.status(400);
      res.send({ status: 'error', message: 'No valid IDs provided.' });
      return;
    }

    const records = getSanitizedRecords();
    const requestCount = ids.length;
    let mutationCount = 0;

    const filteredRecords = records.filter(record => {
      if (ids.includes(record.id)) {
        ++mutationCount;
        return false;
      }
      return true;
    });

    userStore.set(CONFIG_KEY, filteredRecords);

    let status = '';
    let message = '';
    if (mutationCount === requestCount) {
      status = 'ok';
      message = 'All requested items were successfully deleted.';
    } else if (mutationCount > 0) {
      status = 'partial';
      message = `${mutationCount} out of ${requestCount} requested items were deleted.`;
    } else {
      status = 'not_found';
      message = 'None of the requested items were found.';
    }

    res.send({ status, message });
  },
  bulkEnable: (req, res) => {
    const ids = ensureArray(req.body?.ids);
    if (!ids.length) {
      res.status(400);
      res.send({ status: 'error', message: 'No valid IDs provided.' });
      return;
    }

    const records = getSanitizedRecords();
    const requestCount = ids.length;
    let mutationCount = 0;

    const updatedRecords = records.map(record => {
      if (ids.includes(record.id)) {
        mutationCount++;
        return { ...record, enabled: true };
      }
      return record;
    });

    userStore.set(CONFIG_KEY, updatedRecords);

    let status = '';
    let message = '';
    if (mutationCount === requestCount) {
      status = 'ok';
      message = 'All requested items were successfully updated.';
    } else if (mutationCount > 0) {
      status = 'partial';
      message = `${mutationCount} out of ${requestCount} requested items were updated.`;
    } else {
      status = 'not_found';
      message = 'None of the requested items were found.';
    }

    res.send({ status, message });
  },
  bulkDisable: (req, res) => {
    const ids = ensureArray(req.body?.ids);
    if (!ids.length) {
      res.status(400);
      res.send({ status: 'error', message: 'No valid IDs provided.' });
      return;
    }

    const records = getSanitizedRecords();
    const requestCount = ids.length;
    let mutationCount = 0;

    const updatedRecords = records.map(record => {
      if (ids.includes(record.id)) {
        mutationCount++;
        return { ...record, enabled: false };
      }
      return record;
    });

    userStore.set(CONFIG_KEY, updatedRecords);

    let status = '';
    let message = '';
    if (mutationCount === requestCount) {
      status = 'ok';
      message = 'All requested items were successfully updated.';
    } else if (mutationCount > 0) {
      status = 'partial';
      message = `${mutationCount} out of ${requestCount} requested items were updated.`;
    } else {
      status = 'not_found';
      message = 'None of the requested items were found.';
    }

    res.send({ status, message });
  },
  read: (req, res) => {
    const id = req.params.id;
    const records = getSanitizedRecords();
    const record = _find(records, { id: id });

    if (!record) {
      res.status(ERR_NOT_FOUND).send({
        msg: 'Not found'
      });
      return;
    }

    const { mtime, enabled, name, action } = { ...record };
    res.send({ id, mtime, enabled, name, action });
  },
  update: (req, res) => {
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
      action = record.action,
    } = { ...req.body };

    // Skip validation for "enabled", "name", and "action"

    try {
      record.mtime = new Date().getTime();
      record.enabled = Boolean(enabled);
      record.name = ensureString(name);
      record.action = ensureString(action);

      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id, mtime: record.mtime });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
  delete: (req, res) => {
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

      res.send({ status: 'ok' });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
  run: (req, res) => {
    const id = req.params.id;
    const records = getSanitizedRecords();
    const record = _find(records, { id: id });

    if (!record) {
      res.status(ERR_NOT_FOUND).send({
        msg: 'Not found'
      });
      return;
    }

    const name = record.name;
    const action = record.action;
    const context = {
      id,
      name,
    };
    const taskId = shellCommand.spawn(action, context);

    res.send({ taskId: taskId });
  },
  enable: (req, res) => {
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
      record.enabled = true;

      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id, mtime: record.mtime });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
  disable: (req, res) => {
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
      record.enabled = false;

      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id, mtime: record.mtime });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
};

export default api;
