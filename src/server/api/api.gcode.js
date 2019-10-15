import get from 'lodash/get';
import controllers from '../store/controllers';
import {
    ERR_BAD_REQUEST,
    ERR_INTERNAL_SERVER_ERROR,
} from '../constants';

export const upload = (req, res) => {
    const { ident, meta, context = {} } = req.body;

    if (!ident) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The connection ident is not specified.',
        });
        return;
    }

    if (!meta) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'Malformed metadata.',
        });
        return;
    }

    const controller = controllers[ident];
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No controller available.',
        });
        return;
    }

    // Load G-code
    controller.command('sender:load', meta, context, (err, state) => {
        if (err) {
            res.status(ERR_INTERNAL_SERVER_ERROR).send({
                msg: 'Failed to load the file: ' + err
            });
            return;
        }

        res.send({ ...state });
    });
};

export const fetch = (req, res) => {
    const ident = req.query.ident;

    if (!ident) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The connection ident is not specified.',
        });
        return;
    }

    const controller = controllers[ident];
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No controller available.',
        });
        return;
    }

    const { sender } = controller;
    const content = sender.state.content || '';
    const data = {
        ...sender.toJSON(),
        content,
    };

    res.send(data);
};

export const download = (req, res) => {
    const ident = get(req, 'query.ident') || get(req, 'body.ident');

    if (!ident) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'The connection ident is not specified.',
        });
        return;
    }

    const controller = controllers[ident];
    if (!controller) {
        res.status(ERR_BAD_REQUEST).send({
            msg: 'No controller available.',
        });
        return;
    }

    const { sender } = controller;

    const filename = sender.state.name || 'noname.txt';
    const content = sender.state.content || '';

    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(filename));
    res.setHeader('Connection', 'close');

    res.write(content);
    res.end();
};
