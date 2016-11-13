import fs from 'fs';
import _ from 'lodash';
import uuid from 'node-uuid';
import settings from '../config/settings';
import log from '../lib/log';

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
    const accounts = _.map(config.accounts, (account) => {
        const { id, enabled, name, password } = { ...account };
        return { id, enabled, name, password };
    });

    res.send(accounts);
};

export const getAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const account = _.find(config.accounts, { id: req.params.id });
    const { id, enabled, name, password } = { ...account };

    if (!account) {
        res.status(404).send('Account not found');
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
        res.status(400).send('The parameter \'name\' must not be empty');
        return;
    }

    if (!password) {
        res.status(400).send('The parameter \'password\' must not be empty');
        return;
    }

    if (_.find(config.accounts, { name: name })) {
        res.status(400).send('The specified account already exists');
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
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};

export const updateAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const account = _.find(config.accounts, { id: req.params.id });
    const {
        enabled = false,
        name = '',
        oldPassword = '',
        newPassword = ''
    } = { ...req.body };

    if (!account) {
        res.status(404).send('Account not found');
        return;
    }

    if (!name) {
        res.status(400).send('The parameter \'name\' must not be empty');
        return;
    }

    if (oldPassword && newPassword && (oldPassword !== account.password)) {
        res.status(400).send('Incorrect password');
        return;
    }

    if (_.find(config.accounts, { name: name })) {
        res.status(400).send('The specified account already exists');
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
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};

export const deleteAccount = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const account = _.find(config.accounts, { id: req.params.id });

    if (!account) {
        res.status(400).send('The specified account does not exist');
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
        res.status(500).send('Failed to save ' + JSON.stringify(settings.cncrc));
    }
};
