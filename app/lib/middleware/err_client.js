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

module.exports = function err_client(options) {
    options = options || {};

    var error = options.error || '';

    return function(err, req, res, next) {
        if (req.xhr) {
            res.send(500, {
                error: error
            });
        } else {
            next(err);
        }
    };
};
