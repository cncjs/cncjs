import fs from 'fs';
import _ from 'lodash';
import uuid from 'node-uuid';
import settings from '../config/settings';
import log from '../lib/log';
import {
    ERR_BAD_REQUEST,
    ERR_NOT_FOUND,
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED,
    ERR_INTERNAL_SERVER_ERROR
} from './constants';

const loadConfigFile = (file) => {
    let config;
    try {
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        config = {};
    }
    if (!_.isArray(config.accounts)) {
        config.accounts = [];
    }
    return config;
};

export const listAccounts = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const accounts = config.accounts;
    const totalRecords = accounts.length;
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

    res.send({
        pagination: {
            page: page,
            pageLength: pageLength,
            totalRecords: totalRecords
        },
        records: accounts.slice(begin, end)
    });
};

export const getAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const account = _.find(config.accounts, { id: req.params.id });
    const { id, enabled, name, password } = { ...account };

    if (!account) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Account not found'
        });
        return;
    }
    res.send({ id, enabled, name, password });
};

export const newAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const {
        enabled = false,
        name = '',
        password = ''
    } = { ...req.body };

    if (!name) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'name\' must not be empty'
        });
        return;
    }

    if (!password) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'password\' must not be empty'
        });
        return;
    }

    if (_.find(config.accounts, { name: name })) {
        res.status(ERR_CONFLICT).send({
            msg: 'The specified account already exists'
        });
        return;
    }

    try {
        const account = {
            id: uuid.v4(),
            enabled: enabled,
            name: name,
            password: password
        };

        if (!_.isArray(config.accounts)) {
            config.accounts = [];
        }
        config.accounts.push(account);

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const updateAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const id = req.params.id;
    const {
        enabled = false,
        name = '',
        oldPassword = '',
        newPassword = ''
    } = { ...req.body };
    const account = _.find(config.accounts, { id: id });

    if (!account) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Account not found'
        });
        return;
    }

    if (!name) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'name\' must not be empty'
        });
        return;
    }

    if (oldPassword && newPassword && (oldPassword !== account.password)) {
        res.status(ERR_PRECONDITION_FAILED).send({
            msg: 'Incorrect password'
        });
        return;
    }

    const inuse = (account) => {
        return account.id !== id && account.name === name;
    };
    if (_.some(config.accounts, inuse)) {
        res.status(ERR_CONFLICT).send({
            msg: 'The specified account already exists'
        });
        return;
    }

    try {
        account.enabled = !!enabled;
        account.name = name;

        if (oldPassword && newPassword) {
            account.password = newPassword;
        }

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const deleteAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const account = _.find(config.accounts, { id: req.params.id });

    if (!account) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'The specified account does not exist'
        });
        return;
    }

    try {
        const start = config.accounts.indexOf(account);
        if (start >= 0) {
            const deleteCount = 1;
            config.accounts.splice(start, deleteCount);
        }

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                log.error(err);
                res.send({ err: true });
            } else {
                res.send({ err: null });
            }
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};
