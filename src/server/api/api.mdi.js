import { ensureArray } from 'ensure-type';
import find from 'lodash/find';
import isPlainObject from 'lodash/isPlainObject';
import uuid from 'uuid';
import settings from '../config/settings';
import logger from '../lib/logger';
import config from '../services/configstore';
import { getPagingRange } from './paging';
import {
  ERR_BAD_REQUEST,
  ERR_NOT_FOUND,
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const log = logger('api:mdi');
const CONFIG_KEY = 'mdi';

const getSanitizedRecords = () => {
  const records = ensureArray(config.get(CONFIG_KEY, []));

  let shouldUpdate = false;
  for (let i = 0; i < records.length; ++i) {
    if (!isPlainObject(records[i])) {
      records[i] = {};
    }

    const record = records[i];

    if (!record.id) {
      record.id = uuid.v4();
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    log.debug(`update sanitized records: ${JSON.stringify(records)}`);

    // Pass `{ silent changes }` will suppress the change event
    config.set(CONFIG_KEY, records, { silent: true });
  }

  return records;
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
        page: Number(page),
        pageLength: Number(pageLength),
        totalRecords: Number(totalRecords)
      },
      records: pagedRecords.map(record => {
        const { id, name, command, grid = {} } = { ...record };
        return { id, name, command, grid };
      })
    });
  } else {
    res.send({
      records: records.map(record => {
        const { id, name, command, grid = {} } = { ...record };
        return { id, name, command, grid };
      })
    });
  }
};

export const create = (req, res) => {
  const { name, command, grid = {} } = { ...req.body };

  if (!name) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'The "name" parameter must not be empty'
    });
    return;
  }

  if (!command) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'The "command" parameter must not be empty'
    });
    return;
  }

  try {
    const records = getSanitizedRecords();
    const record = {
      id: uuid.v4(),
      name: name,
      command: command,
      grid: grid
    };

    records.push(record);
    config.set(CONFIG_KEY, records);

    res.send({ err: null });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
    });
  }
};

export const read = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = find(records, { id: id });

  if (!record) {
    res.status(ERR_NOT_FOUND).send({
      msg: 'Not found'
    });
    return;
  }

  const { name, command, grid = {} } = { ...record };
  res.send({ id, name, command, grid });
};

export const update = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = find(records, { id: id });

  if (!record) {
    res.status(ERR_NOT_FOUND).send({
      msg: 'Not found'
    });
    return;
  }

  const {
    name = record.name,
    command = record.command,
    grid = record.grid
  } = { ...req.body };

  /*
    if (!name) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "name" parameter must not be empty'
        });
        return;
    }

    if (!command) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "command" parameter must not be empty'
        });
        return;
    }
    */

  try {
    record.name = String(name || '');
    record.command = String(command || '');
    record.grid = isPlainObject(grid) ? grid : {};

    config.set(CONFIG_KEY, records);

    res.send({ err: null });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
    });
  }
};

export const bulkUpdate = (req, res) => {
  const { records } = { ...req.body };

  if (!records) {
    res.status(ERR_BAD_REQUEST).send({
      msg: 'The "records" parameter must not be empty'
    });
    return;
  }

  const filteredRecords = ensureArray(records)
    .filter(record => isPlainObject(record));

  for (let i = 0; i < filteredRecords.length; ++i) {
    const record = filteredRecords[i];
    const { id, name, command, grid = {} } = { ...record };

    if (!id) {
      record.id = uuid.v4();
    }
    record.name = String(name || '');
    record.command = String(command || '');
    record.grid = isPlainObject(grid) ? grid : {};
  }

  try {
    config.set(CONFIG_KEY, filteredRecords);
    res.send({ err: null });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
    });
  }
};

export const __delete = (req, res) => {
  const id = req.params.id;
  const records = getSanitizedRecords();
  const record = find(records, { id: id });

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
    config.set(CONFIG_KEY, filteredRecords);

    res.send({ err: null });
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
    });
  }
};
