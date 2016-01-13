/**
 * err_notfound:
 *
 * Examples:
 *
 *     app.use(middleware.err_notfound({ view: '404', error: 'Not found' }))
 *
 * Options:
 *
 *   - view     view
 *   - error    error message
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function err_notfound(options) {
    options = options || {};

    var view = options.view || '404',
        error = options.error || '';

    return function(req, res, next) {
        res.status(404);

        // respond with html page
        if (req.accepts('html')) {
            res.render(view, { url: req.url });
            return;
        }

        // respond with json
        if (req.accepts('json')) {
            res.send({ error: error });
            return;
        }

        // default to plain-text. send()
        res.type('txt').send(error);
    };
};
