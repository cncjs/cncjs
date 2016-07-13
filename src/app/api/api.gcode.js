import store from '../store';

export const upload = (req, res) => {
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

    res.send({ gcode: controller.sender.gcode });
};
