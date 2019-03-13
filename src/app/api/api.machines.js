import find from 'lodash/find';
import castArray from 'lodash/castArray';
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

const log = logger('api:machines');
const CONFIG_KEY = 'machines';

const getSanitizedRecords = () => {
    const records = castArray(config.get(CONFIG_KEY, []));

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

        // Defaults to true
        if (record.enabled === undefined) {
            record.enabled = true;
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
                const { id, enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = { ...record };
                return { id, enabled, name, xmin, xmax, ymin, ymax, zmin, zmax };
            })
        });
    } else {
        res.send({
            records: records.map(record => {
                const { id, enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = { ...record };
                return { id, enabled, name, xmin, xmax, ymin, ymax, zmin, zmax };
            })
        });
    }
};

export const create = (req, res) => {
    const {
        enabled = true,
        name = '',
        xmin = 0,
        xmax = 0,
        ymin = 0,
        ymax = 0,
        zmin = 0,
        zmax = 0
    } = { ...req.body };

    if (!name) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "name" parameter must not be empty'
        });
        return;
    }

    try {
        const records = getSanitizedRecords();
        const record = {
            id: uuid.v4(),
            enabled: !!enabled,
            name: name,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            zmin: zmin,
            zmax: zmax
        };

        records.push(record);
        config.set(CONFIG_KEY, records);

        res.send({ id: record.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
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

    const { enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = { ...record };
    res.send({ id, enabled, name, xmin, xmax, ymin, ymax, zmin, zmax });
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
        enabled = record.enabled,
        name = record.name,
        xmin = record.xmin,
        xmax = record.xmax,
        ymin = record.ymin,
        ymax = record.ymax,
        zmin = record.zmin,
        zmax = record.zmax
    } = { ...req.body };

    try {
        record.enabled = Boolean(enabled);
        record.name = String(name || '');
        record.xmin = Number(xmin) || 0;
        record.xmax = Number(xmax) || 0;
        record.ymin = Number(ymin) || 0;
        record.ymax = Number(ymax) || 0;
        record.zmin = Number(zmin) || 0;
        record.zmax = Number(zmax) || 0;

        config.set(CONFIG_KEY, records);

        res.send({ id: record.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
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

        res.send({ id: record.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.rcfile)
        });
    }
};
