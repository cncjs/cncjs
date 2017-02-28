import _ from 'lodash';
import uuid from 'uuid';
import settings from '../config/settings';
import config from '../services/configstore';
import {
    ERR_BAD_REQUEST,
    ERR_NOT_FOUND,
    ERR_INTERNAL_SERVER_ERROR
} from '../constants';

export const fetchEvents = (req, res) => {
    // Sort by `mtime` in descending order and by `event` in ascending order.
    const events = _.orderBy(config.get('events', []), ['mtime', 'event'], ['desc', 'asc']);
    const totalRecords = events.length;
    let { page = 1, pageLength = 10 } = req.query;

    page = Number(page);
    pageLength = Number(pageLength);

    if (!page || page < 1) {
        page = 1;
    }
    if (!pageLength || pageLength < 1) {
        pageLength = 10;
    }
    if (((page - 1) * pageLength) >= totalRecords) {
        page = Math.ceil(totalRecords / pageLength);
    }

    const begin = (page - 1) * pageLength;
    const end = Math.min((page - 1) * pageLength + pageLength, totalRecords);
    const records = events.slice(begin, end).map((evt) => {
        if (evt.id !== 0 && !evt.id) {
            // Generate event id
            evt.id = uuid.v4();
        }
        return {
            id: evt.id,
            mtime: evt.mtime,
            enabled: evt.enabled,
            event: evt.event,
            trigger: evt.trigger,
            // WARNING: The "command" parameter is deprecated and will be removed in a future release.
            commands: (evt.commands || evt.command || '')
        };
    });

    res.send({
        pagination: {
            page: page,
            pageLength: pageLength,
            totalRecords: totalRecords
        },
        records: records
    });
};

export const getEvent = (req, res) => {
    const evt = _.find(config.get('events', []), { id: req.params.id });

    if (!evt) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Event not found'
        });
        return;
    }

    if (evt.id !== 0 && !evt.id) {
        // Generate event id
        evt.id = uuid.v4();
    }

    res.send({
        id: evt.id,
        mtime: evt.mtime,
        enabled: evt.enabled,
        event: evt.event,
        trigger: evt.trigger,
        // WARNING: The "command" parameter is deprecated and will be removed in a future release.
        commands: (evt.commands || evt.command || '')
    });
};

export const createEvent = (req, res) => {
    const {
        enabled = false,
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
        const events = config.get('events', []);
        const evt = {
            id: uuid.v4(),
            mtime: new Date().getTime(),
            enabled: !!enabled,
            event: event,
            trigger: trigger,
            commands: commands
        };

        if (_.isArray(events)) {
            events.push(evt);
            config.set('events', events);
        } else {
            config.set('events', [evt]);
        }

        res.send({ id: evt.id, mtime: evt.mtime });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const updateEvent = (req, res) => {
    const id = req.params.id;
    const events = config.get('events', []);
    const evt = _.find(events, { id: id });

    if (!evt) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Event not found'
        });
        return;
    }

    const {
        enabled = evt.enabled,
        event = evt.event,
        trigger = evt.trigger,
        // WARNING: The "command" parameter is deprecated and will be removed in a future release.
        commands = (evt.commands || evt.command || '')
    } = { ...req.body };

    if (typeof enabled !== 'boolean') {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The "enabled" parameter must be a boolean value'
        });
        return;
    }

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

    // Skip checking whether the commands parameter is empty or not

    try {
        evt.mtime = new Date().getTime();
        evt.enabled = enabled;
        evt.event = event;
        evt.trigger = trigger;
        evt.commands = commands;
        if (evt.command !== undefined) {
            // WARNING: The "command" parameter is deprecated and will be removed in a future release.
            delete evt.command;
        }
        config.set('events', events);

        res.send({ id: evt.id, mtime: evt.mtime });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const deleteEvent = (req, res) => {
    const id = req.params.id;
    const evt = _.find(config.get('events', []), { id: id });
    if (!evt) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Event not found'
        });
        return;
    }

    try {
        const events = _.filter(config.get('events', []), (evt) => {
            return evt.id !== id;
        });
        config.set('events', events);

        res.send({ id: evt.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};
