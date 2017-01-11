import store from '../store';

export const set = (req, res) => {
    const { port, meta, gcode } = req.body;

    if (!port) {
        res.status(400).send({
            err: 'No port specified'
        });
        return;
    }
    if (!gcode) {
        res.status(400).send({
            err: 'Empty G-code'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(400).send({
            err: 'Controller not found'
        });
        return;
    }

    // Load G-code
    const { name = '' } = meta;
    controller.command(null, 'load', name, gcode, (err) => {
        if (err) {
            res.status(500).send({
                err: 'Failed to load G-code: ' + err
            });
            return;
        }

        res.send({ err: null });
    });
};

export const get = (req, res) => {
    const port = req.query.port;

    if (!port) {
        res.status(400).send({
            err: 'No port specified'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(400).send({
            err: 'Controller not found'
        });
        return;
    }

    const { sender } = controller;

    res.send({
        name: sender.state.name,
        data: sender.state.gcode,
        size: sender.state.gcode.length,
        total: sender.state.total,
        sent: sender.state.sent,
        received: sender.state.received,
        createdTime: sender.state.createdTime,
        startedTime: sender.state.startedTime,
        finishedTime: sender.state.finishedTime
    });
};

export const download = (req, res) => {
    const port = req.query.port;

    if (!port) {
        res.status(400).send({
            err: 'No port specified'
        });
        return;
    }

    const controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(400).send({
            err: 'Controller not found'
        });
        return;
    }

    const { sender } = controller;
    const filename = (function(req) {
        const headers = req.headers || {};
        const ua = headers['user-agent'] || '';
        const isIE = (function(ua) {
            return (/MSIE \d/).test(ua);
        }(ua));
        const isEdge = (function(ua) {
            return (/Trident\/\d/).test(ua) && (!(/MSIE \d/).test(ua));
        }(ua));

        const name = sender.state.name || 'noname.txt';
        return (isIE || isEdge) ? encodeURIComponent(name) : name;
    }(req));
    const content = sender.state.gcode || '';

    res.setHeader('Content-Disposition', 'attachment; filename=' + JSON.stringify(filename));
    res.setHeader('Connection', 'close');

    res.write(content);
    res.end();
};
