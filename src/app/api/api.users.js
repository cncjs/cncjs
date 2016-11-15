import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt-nodejs';
import _ from 'lodash';
import uuid from 'node-uuid';
import settings from '../config/settings';
import {
    ERR_BAD_REQUEST,
    ERR_UNAUTHORIZED,
    ERR_NOT_FOUND,
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED,
    ERR_INTERNAL_SERVER_ERROR
} from './constants';

const SECRET = 'SECRET'; // FIXME

// Generate session token
// Note. Do not use password and other sensitive fields in the payload
const generateToken = (payload, secret = SECRET) => {
    const token = jwt.sign(payload, secret, {
        expiresIn: 60 * 60 * 24 // expires in 24 hours
    });

    return token;
};

const loadConfigFile = (file) => {
    let config;
    try {
        config = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        config = {};
    }
    if (!_.isArray(config.users)) {
        config.users = [];
    }
    return config;
};

export const signin = (req, res) => {
    const { token = '', name = '', password = '' } = { ...req.body };
    const config = loadConfigFile(settings.cncrc);
    const enabledUsers = _.filter(config.users, { enabled: true });

    if (enabledUsers.length === 0) {
        res.send({ token: '', name: '' }); // clear token and signed in name
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
        const token = generateToken(payload, SECRET); // generate new token
        res.send({ token: token, name: user.name });
        return;
    }

    jwt.verify(token, SECRET, (err, user) => {
        if (err) {
            res.status(ERR_INTERNAL_SERVER_ERROR).send({
                msg: 'Internal server error'
            });
            return;
        }

        user = _.find(enabledUsers, { id: user.id, name: user.name });
        if (!user) {
            res.status(ERR_UNAUTHORIZED).send({
                msg: 'Authentication failed'
            });
            return;
        }

        res.send({ token: token, name: user.name }); // reuse old token
    });
};

export const listUsers = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const users = _.orderBy(config.users, ['name'], ['asc']);
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
    const config = loadConfigFile(settings.cncrc);
    const user = _.find(config.users, { id: req.params.id });
    const { id, enabled, name } = { ...user };

    if (!user) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'User not found'
        });
        return;
    }

    res.send({ id, enabled, name });
};

export const newUser = (req, res) => {
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

    if (_.find(config.users, { name: name })) {
        res.status(ERR_CONFLICT).send({
            msg: 'The specified user already exists'
        });
        return;
    }

    try {
        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password.trim(), salt);
        const user = {
            id: uuid.v4(),
            enabled: enabled,
            name: name,
            password: hash
        };

        if (!_.isArray(config.users)) {
            config.users = [];
        }
        config.users.push(user);

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                throw err;
            }

            res.send({ id: user.id });
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const updateUser = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const id = req.params.id;
    const {
        enabled = false,
        name = '',
        oldPassword = '',
        newPassword = ''
    } = { ...req.body };
    const user = _.find(config.users, { id: id });
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
    if (_.some(config.users, inuse)) {
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

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                throw err;
            }

            res.send({ id: user.id });
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};

export const deleteUser = (req, res) => {
    const config = loadConfigFile(settings.cncrc);
    const user = _.find(config.users, { id: req.params.id });

    if (!user) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'The specified user does not exist'
        });
        return;
    }

    try {
        const start = config.users.indexOf(user);
        if (start >= 0) {
            const deleteCount = 1;
            config.users.splice(start, deleteCount);
        }

        const text = JSON.stringify(config, null, 4);
        fs.writeFile(settings.cncrc, text, (err) => {
            if (err) {
                throw err;
            }

            res.send({ id: user.id });
        });
    } catch (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
            msg: 'Failed to save ' + JSON.stringify(settings.cncrc)
        });
    }
};
