import { ensureArray, ensureFiniteNumber, ensureString } from 'ensure-type';
import * as json2csv from 'json2csv';
import _find from 'lodash/find';
import _isPlainObject from 'lodash/isPlainObject';
import _values from 'lodash/values';
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

const log = logger('api:macros');

const CONFIG_KEY = 'macros';

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

    if (record.data === undefined) {
      record.data = record.content ?? '';
      shouldUpdate = true;
    }

    if (record.content !== undefined) {
      delete record.content;
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
          const { id, mtime, name, data } = { ...record };
          return { id, mtime, name, data };
        })
      });
    } else {
      res.send({
        records: records.map(record => {
          const { id, mtime, name, data } = { ...record };
          return { id, mtime, name, data };
        })
      });
    }
  },
  exportCSV: (req, res) => {
    const records = getSanitizedRecords();
    const paging = !!req.query.paging;
    const { filename = 'macros.csv' } = { ...req.body };
    const fieldMap = {
      id: 'ID',
      mtime: 'Date Modified',
      name: 'Name',
      data: 'Data',
    };
    const fields = _values(fieldMap);

    res.set('Expires', 0);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Transfer-Encoding', 'binary');
    res.set('Pragma', 'no-cache');
    res.set('Content-Disposition', `attachment; filename=${JSON.stringify(filename)}`);

    if (paging) {
      const { page = 1, pageLength = 10 } = req.query;
      const totalRecords = records.length;
      const [begin, end] = getPagingRange({ page, pageLength, totalRecords });
      const data = records
        .slice(begin, end)
        .map(x => ({
          [fieldMap.id]: x.id,
          [fieldMap.mtime]: new Date(x.mtime).toISOString(),
          [fieldMap.name]: x.name,
          [fieldMap.data]: x.data,
        }));
      const csv = json2csv.parse(data, { fields });
      res.send(csv).end();
    } else {
      const data = records
        .map(x => ({
          [fieldMap.id]: x.id,
          [fieldMap.mtime]: new Date(x.mtime).toISOString(),
          [fieldMap.name]: x.name,
          [fieldMap.data]: x.data,
        }));
      const csv = json2csv.parse(data, { fields });
      res.send(csv).end();
    }
  },
  create: (req, res) => {
    const { name, data } = { ...req.body };

    if (!name) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "name" parameter must not be empty',
      });
      return;
    }

    if (!data) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "data" parameter must not be empty',
      });
      return;
    }

    try {
      const records = getSanitizedRecords();
      const record = {
        id: uuidv4(),
        mtime: new Date().getTime(),
        name: name,
        data: data,
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
        msg: 'Not found',
      });
      return;
    }

    const { mtime, name, data } = { ...record };
    res.send({ id, mtime, name, data });
  },
  update: (req, res) => {
    const id = req.params.id;
    const records = getSanitizedRecords();
    const record = _find(records, { id: id });

    if (!record) {
      res.status(ERR_NOT_FOUND).send({
        msg: 'Not found',
      });
      return;
    }

    const {
      name = record.name,
      data = record.data,
    } = { ...req.body };

    if (!name) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "name" parameter must not be empty',
      });
      return;
    }

    if (!data) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "data" parameter must not be empty',
      });
      return;
    }

    try {
      record.mtime = new Date().getTime();
      record.name = ensureString(name);
      record.data = ensureString(data);

      userStore.set(CONFIG_KEY, records);

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
        msg: 'Not found',
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
