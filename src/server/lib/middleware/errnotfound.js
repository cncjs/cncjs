/**
 * errnotfound:
 *
 * Examples:
 *
 *     app.use(middleware.errnotfound({ view: '404', error: 'Not found' }))
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

const errnotfound = (options) => {
    options = options || {};

    let view = options.view || '404',
        error = options.error || '';

    return (req, res, next) => {
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

module.exports = errnotfound;
