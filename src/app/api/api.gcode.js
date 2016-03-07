import store from '../store';

export const upload = (req, res) => {
    const { port, meta, gcode } = req.body;

    if (!port) {
        res.status(400).send({
            ok: false,
            msg: 'No port specified'
        });
        return;
    }
    if (!gcode) {
        res.status(400).send({
            ok: false,
            msg: 'Empty G-code'
        });
        return;
    }

    let controller = store.get('controllers["' + port + '"]');
    if (!controller) {
        res.status(400).send({
            ok: false,
            msg: 'Controller not found'
        });
        return;
    }

    // Load G-code
    const { name = '' } = meta;
    controller.command(null, 'load', name, gcode, (err) => {
        if (err) {
            res.status(500).send({
                ok: false,
                msg: 'Failed to load G-code: ' + err
            });
            return;
        }

        res.send({ ok: true });
    });
};
