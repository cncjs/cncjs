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

    res.send({
        name: controller.sender.name,
        data: controller.sender.gcode,
        size: controller.sender.gcode.length,
        remain: controller.sender.remain.length,
        sent: controller.sender.sent.length,
        total: controller.sender.total,
        createdTime: controller.sender.createdTime,
        startedTime: controller.sender.startedTime,
        finishedTime: controller.sender.finishedTime
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

    const filename = (function(req) {
        const headers = req.headers || {};
        const ua = headers['user-agent'] || '';
        const isIE = (function(ua) {
            return (/MSIE \d/).test(ua);
        }(ua));
        const isEdge = (function(ua) {
            return (/Trident\/\d/).test(ua) && (!(/MSIE \d/).test(ua));
        }(ua));

        const name = controller.sender.name || 'noname.txt';
        return (isIE || isEdge) ? encodeURIComponent(name) : name;
    }(req));
    const content = controller.sender.gcode || '';

    res.setHeader('Content-Disposition', 'attachment; filename=' + JSON.stringify(filename));
    res.setHeader('Connection', 'close');

    res.write(content);
    res.end();
};
