import { ensureArray, ensureFiniteNumber } from 'ensure-type';
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

    // Defaults to true
    if (record.enabled === undefined) {
      record.enabled = true;
    }

    // Alias command
    if (!record.commands) {
      record.commands = record.command ?? '';
      delete record.command;
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
          const { id, mtime, enabled, title, commands } = { ...record };
          return { id, mtime, enabled, title, commands };
        })
      });
    } else {
      res.send({
        records: records.map(record => {
          const { id, mtime, enabled, title, commands } = { ...record };
          return { id, mtime, enabled, title, commands };
        })
      });
    }
  },
  create: (req, res) => {
    const {
      enabled = true,
      title = '',
      commands = ''
    } = { ...req.body };

    if (!title) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "title" parameter must not be empty'
      });
      return;
    }

    if (!commands) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "commands" parameter must not be empty'
      });
      return;
    }

    try {
      const records = getSanitizedRecords();
      const record = {
        id: uuidv4(),
        mtime: new Date().getTime(),
        enabled: !!enabled,
        title: title,
        commands: commands
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
    const records = getSanitizedRecords();
    const filteredRecords = records.filter(record => {
      // Keep records that are not in the ids array
      return !ids.includes(record.id);
    });
    const totalCount = records.length;
    const requestedCount = ids.length;
    const deletedCount = totalCount - filteredRecords.length;

    let status = '';
    let message = '';
    if (deletedCount === requestedCount) {
      status = 'ok';
      message = 'All requested items were successfully deleted.';
    } else if (deletedCount > 0) {
      status = 'partial';
      message = `${deletedCount} of ${requestedCount} requested items were deleted.`;
    } else {
      status = 'not_found';
      message = 'No requested items were found for deletion.';
    }

    userStore.set(CONFIG_KEY, filteredRecords);

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

    const { mtime, enabled, title, commands } = { ...record };
    res.send({ id, mtime, enabled, title, commands });
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
      title = record.title,
      commands = record.commands
    } = { ...req.body };

    // Skip validation for "enabled", "title", and "commands"

    try {
      record.mtime = new Date().getTime();
      record.enabled = Boolean(enabled);
      record.title = String(title ?? '');
      record.commands = String(commands ?? '');

      // Remove deprecated parameter
      if (record.command !== undefined) {
        delete record.command;
      }

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

    const title = record.title;
    const commands = record.commands;

    log.info(`run: title="${title}", commands="${commands}"`);

    const context = {
      id,
      name: title,
    };
    const taskId = shellCommand.spawn(commands, context);

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
