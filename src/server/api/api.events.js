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

const log = logger('api:events');
const CONFIG_KEY = 'events';

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

        // Alias command
        if (!record.commands) {
            record.commands = record.command || '';
            delete record.command;
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
                const { id, mtime, enabled, event, trigger, commands } = { ...record };
                return { id, mtime, enabled, event, trigger, commands };
            })
        });
    } else {
        res.send({
            records: records.map(record => {
                const { id, mtime, enabled, event, trigger, commands } = { ...record };
                return { id, mtime, enabled, event, trigger, commands };
            })
        });
    }
};

export const create = (req, res) => {
    const {
        enabled = true,
        event = '',
        trigger = '',
        commands = ''
    } = { ...req.body };

    if (!event) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "event" parameter must not be empty'
        });
        return;
    }

    if (!trigger) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "trigger" parameter must not be empty'
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
            id: uuid.v4(),
            mtime: new Date().getTime(),
            enabled: !!enabled,
            event: event,
            trigger: trigger,
            commands: commands
        };

        records.push(record);
        config.set(CONFIG_KEY, records);

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
    const record = find(records, { id: id });

    if (!record) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    const { mtime, enabled, event, trigger, commands } = { ...record };
    res.send({ id, mtime, enabled, event, trigger, commands });
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
        event = record.event,
        trigger = record.trigger,
        commands = record.commands
    } = { ...req.body };

    // Skip validation for "enabled", "event", "trigger", and "commands"

    try {
        record.mtime = new Date().getTime();
        record.enabled = Boolean(enabled);
        record.event = String(event || '');
        record.trigger = String(trigger || '');
        record.commands = String(commands || '');

        // Remove deprecated parameter
        if (record.command !== undefined) {
            delete record.command;
        }

        config.set(CONFIG_KEY, records);

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
