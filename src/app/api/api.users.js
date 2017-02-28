import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt-nodejs';
import _ from 'lodash';
import uuid from 'uuid';
import settings from '../config/settings';
import log from '../lib/log';
import config from '../services/configstore';
import {
    ERR_BAD_REQUEST,
    ERR_UNAUTHORIZED,
    ERR_NOT_FOUND,
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED,
    ERR_INTERNAL_SERVER_ERROR
} from '../constants';

// Generate access token
// https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback
// Note. Do not use password and other sensitive fields in the payload
const generateAccessToken = (payload, secret = settings.secret) => {
    const token = jwt.sign(payload, secret, {
        expiresIn: settings.accessTokenLifetime
    });

    return token;
};

export const signin = (req, res) => {
    const { token = '', name = '', password = '' } = { ...req.body };
    const enabledUsers = _.filter(config.get('users', []), { enabled: true });

    if (enabledUsers.length === 0) {
        const user = { id: '', name: '' };
        const payload = { ...user };
        const token = generateAccessToken(payload, settings.secret); // generate access token
        res.send({
            enabled: false, // session is disabled
            token: token,
            name: user.name // empty name
        });
        return;
    }

    if (!token) {
        const user = _.find(enabledUsers, { name: name });
        const valid = user && bcrypt.compareSync(password, user.password);

        if (!valid) {
            res.status(ERR_UNAUTHORIZED).send({
                msg: 'Authentication failed'
            });
            return;
        }

        const payload = {
            id: user.id,
            name: user.name
        };
        const token = generateAccessToken(payload, settings.secret); // generate access token
        res.send({
            enabled: true, // session is enabled
            token: token, // new token
            name: user.name
        });
        return;
    }

    jwt.verify(token, settings.secret, (err, user) => {
        if (err) {
            res.status(ERR_INTERNAL_SERVER_ERROR).send({
                msg: 'Internal server error'
            });
            return;
        }

        log.debug(`jwt.verify: id=${user.id}, name="${user.name}", iat=${new Date(user.iat * 1000).toISOString()}, exp=${new Date(user.exp * 1000).toISOString()}`);

        user = _.find(enabledUsers, { id: user.id, name: user.name });
        if (!user) {
            res.status(ERR_UNAUTHORIZED).send({
                msg: 'Authentication failed'
            });
            return;
        }

        res.send({
            enabled: true, // session is enabled
            token: token, // old token
            name: user.name
        });
    });
};

export const fetchUsers = (req, res) => {
    const users = _.orderBy(config.get('users', []), ['name'], ['asc']);
    const totalRecords = users.length;
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
    const records = users.slice(begin, end).map((user) => {
        return {
            id: user.id,
            enabled: user.enabled,
            name: user.name
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

export const getUser = (req, res) => {
    const user = _.find(config.get('users', []), { id: req.params.id });
    const { id, enabled, name } = { ...user };

    if (!user) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'User not found'
        });
        return;
    }

    res.send({ id, enabled, name });
};

export const addUser = (req, res) => {
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

    if (_.find(config.get('users', []), { name: name })) {
        res.status(ERR_CONFLICT).send({
            msg: 'The specified user already exists'
        });
        return;
    }

    try {
        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password.trim(), salt);
        const users = config.get('users', []);
        const user = {
            id: uuid.v4(),
            enabled: enabled,
            name: name,
            password: hash
        };

        if (_.isArray(users)) {
            users.push(user);
            config.set('users', users);
        } else {
            config.set('users', [user]);
        }

        res.send({ id: user.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const updateUser = (req, res) => {
    const id = req.params.id;
    const {
        enabled = false,
        name = '',
        oldPassword = '',
        newPassword = ''
    } = { ...req.body };
    const users = config.get('users', []);
    const user = _.find(users, { id: id });
    const changePassword = oldPassword && newPassword;

    if (!user) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'User not found'
        });
        return;
    }

    if (!name) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The parameter \'name\' must not be empty'
        });
        return;
    }

    if (changePassword && !bcrypt.compareSync(oldPassword, user.password)) {
        res.status(ERR_PRECONDITION_FAILED).send({
            msg: 'Incorrect password'
        });
        return;
    }

    const inuse = (user) => {
        return user.id !== id && user.name === name;
    };
    if (_.some(users, inuse)) {
        res.status(ERR_CONFLICT).send({
            msg: 'The specified user already exists'
        });
        return;
    }

    try {
        user.enabled = !!enabled;
        user.name = name;

        if (changePassword) {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(newPassword.trim(), salt);
            user.password = hash;
        }

        config.set('users', users);

        res.send({ id: user.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const deleteUser = (req, res) => {
    const id = req.params.id;
    const user = _.find(config.get('users', []), { id: id });
    if (!user) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'User not found'
        });
        return;
    }

    try {
        const users = _.filter(config.get('users', []), (user) => {
            return user.id !== id;
        });
        config.set('users', users);

        res.send({ id: user.id });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};
