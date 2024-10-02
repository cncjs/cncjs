import { ensureArray, ensureFiniteNumber, ensureString } from 'ensure-type';
import _get from 'lodash/get';
import _set from 'lodash/set';
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

const log = logger('api:machines');

const CONFIG_KEY = 'machines';

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
  }

  if (shouldUpdate) {
    log.debug(`update sanitized records: ${JSON.stringify(records)}`);

    // Pass `{ silent changes }` will suppress the change event
    userStore.set(CONFIG_KEY, records, { silent: true });
  }

  return records;
};

const ensureMachineProfile = (payload) => {
  const { id, name, limits } = { ...payload };
  const { xmin = 0, xmax = 0, ymin = 0, ymax = 0, zmin = 0, zmax = 0 } = { ...limits };

  return {
    id,
    name: ensureString(name),
    limits: {
      xmin: ensureFiniteNumber(xmin),
      xmax: ensureFiniteNumber(xmax),
      ymin: ensureFiniteNumber(ymin),
      ymax: ensureFiniteNumber(ymax),
      zmin: ensureFiniteNumber(zmin),
      zmax: ensureFiniteNumber(zmax),
    }
  };
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
        records: pagedRecords.map(record => ensureMachineProfile(record))
      });
    } else {
      res.send({
        records: records.map(record => ensureMachineProfile(record))
      });
    }
  },
  create: (req, res) => {
    const record = { ...req.body };

    if (!record.name) {
      res.status(ERR_BAD_REQUEST).send({
        msg: 'The "name" parameter must not be empty'
      });
      return;
    }

    try {
      const records = getSanitizedRecords();
      records.push(ensureMachineProfile(record));
      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id });
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

    res.send(ensureMachineProfile(record));
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

    try {
      const nextRecord = req.body;

      [ // [key, ensureType]
        ['name', ensureString],
        ['limits.xmin', ensureFiniteNumber],
        ['limits.xmax', ensureFiniteNumber],
        ['limits.ymin', ensureFiniteNumber],
        ['limits.ymax', ensureFiniteNumber],
        ['limits.zmin', ensureFiniteNumber],
        ['limits.zmax', ensureFiniteNumber],
      ].forEach(it => {
        const [key, ensureType] = it;
        const defaultValue = _get(record, key);
        const value = _get(nextRecord, key, defaultValue);

        _set(record, key, (typeof ensureType === 'function') ? ensureType(value) : value);
      });

      userStore.set(CONFIG_KEY, records);

      res.send({ id: record.id });
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

      res.send({ id: record.id });
    } catch (err) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to update ${x(settings.rcfile)}`,
      });
    }
  },
};

export default api;
