/**
 * err_client
 * 
 * Examples:
 *
 *     app.use(middleware.err_client({ error: 'XHR error' }))
 *
 * Options:
 *
 *   - error    error message
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

const err_client = (options) => {
    options = options || {};

    let error = options.error || '';

    return (err, req, res, next) => {
        if (req.xhr) {
            res.send(500, {
                error: error
            });
        } else {
            next(err);
        }
    };
};

module.exports = err_client;
