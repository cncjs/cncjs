var pubsub = require('pubsub-js');

module.exports.uploadFile = function(req, res) {
    var meta = req.body.meta;
    var contents = req.body.contents;

    pubsub.publish('file:upload', {
        meta: meta,
        contents: contents
    });

    res.send({ ok: true });
};
