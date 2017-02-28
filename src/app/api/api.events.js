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
    const events = _.orderBy(config.get('events', []), ['event'], ['asc']);
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
            enabled: evt.enabled,
            event: evt.event,
            trigger: evt.trigger,
            command: evt.command
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
        enabled: evt.enabled,
        event: evt.event,
        trigger: evt.trigger,
        command: evt.command
    });
};

export const addEvent = (req, res) => {
    const {
        enabled = false,
        event = '',
        trigger = '',
        command = ''
    } = { ...req.body };

    if (!event) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'event\' must not be empty'
        });
        return;
    }

    if (!trigger) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'trigger\' must not be empty'
        });
        return;
    }

    if (!command) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'command\' must not be empty'
        });
        return;
    }

    try {
        const events = config.get('events', []);
        const evt = {
            id: uuid.v4(),
            enabled: !!enabled,
            event: event,
            trigger: trigger,
            command: command
        };

        if (_.isArray(events)) {
            events.push(evt);
            config.set('events', events);
        } else {
            config.set('events', [evt]);
        }

        res.send({ id: evt.id });
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
        command = evt.command
    } = { ...req.body };

    if (typeof enabled !== 'boolean') {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'enabled\' must be a boolean value'
        });
        return;
    }

    if (!event) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'event\' must not be empty'
        });
        return;
    }

    if (!trigger) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'trigger\' must not be empty'
        });
        return;
    }

    if (!command) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'command\' must not be empty'
        });
        return;
    }

    try {
        evt.enabled = enabled;
        evt.event = event;
        evt.trigger = trigger;
        evt.command = command;
        config.set('events', events);

        res.send({ id: evt.id });
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
