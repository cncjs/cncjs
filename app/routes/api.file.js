var pubsub = require('pubsub-js');

module.exports.uploadFile = function(req, res) {
    var meta = req.body.meta;
    var contents = req.body.contents;

    pubsub.publish('file:upload', {
        meta: meta,
        contents: contents
    });

    /*
    var result = {
        ok: true,
        message: 'OK',
        data: {}
    };

    _.each(req.files, function(files, field) {

        result.data[field] = [];

        if ( ! _.isArray(files)) { // the files is an object when using single file upload
            files = [ files ];
        }

        _.each(files, function(file, index) {
            log.debug('api:upload: %s[%d]:', file.fieldName, index, {
                originalFilename: file.originalFilename,
                path: file.path, // DO NOT expose file path information in the result
                name: file.name,
                size: file.size,
                type: file.type
            });

            if ( ! fs.existsSync(file.path)) {
                result.ok = false;
                result.message = 'File not exists: ' + file.fieldName;
                return;
            }

            result.data[field].push({
                fieldName: file.fieldName,
                originalFilename: file.originalFilename,
                name: file.name,
                size: file.size,
                type: file.type
            });

            // http://andrewkelley.me/post/do-not-use-bodyparser-with-express-js.html
            // Always delete the temp files when you use bodyParser or multipart middleware
            log.debug('Delete the temp file: ' + file.path);
            fs.unlinkSync(file.path);
        });
    });
    */

    res.send({ ok: true });
};
