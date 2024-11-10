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

const userStore = serviceContainer.resolve('userStore');

const log = logger('api:mdi');

const CONFIG_KEY = 'mdi';

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

    if (record.action === undefined) {
      record.action = record.command ?? '';
      shouldUpdate = true;
    }

    // Remove deprecated keys
    if (record.command !== undefined) {
      delete record.command;
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
          const { id, name, action, grid = {} } = { ...record };
          return { id, name, action, grid };
        })
      });
    } else {
      res.send({
        records: records.map(record => {
          const { id, name, action, grid = {} } = { ...record };
          return { id, name, action, grid };
        })
      });
    }
  },
  create: (req, res) => {
    const { name, action, grid = {} } = { ...req.body };

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
        name: name,
        action: action,
        grid: grid,
      };

      records.push(record);
      userStore.set(CONFIG_KEY, records);

      res.send({ err: null });
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

    const { name, action, grid = {} } = { ...record };
    res.send({ id, name, action, grid });
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
      name = record.name,
      action = record.action,
      grid = record.grid,
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
      record.name = String(name ?? '');
      record.action = String(action ?? '');
      record.grid = _isPlainObject(grid) ? grid : {};

      userStore.set(CONFIG_KEY, records);

      res.send({ err: null });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
  // FIXME: Refactor the Axes widget and remove the bulkUpdate API
  bulkUpdate: (req, res) => {
    const { records } = { ...req.body };

    if (!records) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "records" parameter must not be empty'
      });
      return;
    }

    const filteredRecords = ensureArray(records)
      .filter(record => _isPlainObject(record));

    for (let i = 0; i < filteredRecords.length; ++i) {
      const record = filteredRecords[i];
      const { id, name, action, grid = {} } = { ...record };

      if (!id) {
        record.id = uuidv4();
      }
      record.name = String(name ?? '');
      record.action = String(action ?? '');
      record.grid = _isPlainObject(grid) ? grid : {};
    }

    try {
      userStore.set(CONFIG_KEY, filteredRecords);
      res.send({ err: null });
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

      res.send({ err: null });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
};

export default api;
