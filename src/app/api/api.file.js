import pubsub from 'pubsub-js';

export const uploadFile = (req, res) => {
    let meta = req.body.meta;
    let contents = req.body.contents;

    pubsub.publish('file:upload', {
        meta: meta,
        contents: contents
    });

    res.send({ ok: true });
};
