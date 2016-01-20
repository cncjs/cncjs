import pubsub from 'pubsub-js';

export const upload = (req, res) => {
    const { port, meta, gcode } = req.body;

    if (!port) {
        res.send({ ok: false, msg: 'No port specified' });
        return;
    }
    if (!gcode) {
        res.send({ ok: false, msg: 'Empty G-code' });
        return;
    }

    pubsub.publish('gcode:upload', {
        port: port,
        meta: meta,
        gcode: gcode
    });

    res.send({ ok: true });
};
