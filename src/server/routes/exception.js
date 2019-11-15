import path from 'path';
import express from 'express';

/**
 * errlog:
 *
 *   Write request and error information to stderr, loggly, or similar services.
 *
 * Examples:
 *
 *   app.use(middleware.errlog())
 *
 * @return {Function}
 * @api public
 */

const errlog = () => {
    return (err, req, res, next) => {
        console.error(err.stack);
        next(err);
    };
};

/**
 * errclient
 *
 * Examples:
 *
 *     app.use(middleware.errclient({ error: 'XHR error' }))
 *
 * Options:
 *
 *   - error    error message
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

const errclient = (options) => {
    options = options || {};

    let error = options.error || '';

    return (err, req, res, next) => {
        if (req.xhr) {
            res.send(500, {
                error: error
            });
            return;
        }

        next(err);
    };
};

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

/**
 * errserver:
 *
 * error-handling middleware, take the same form
 * as regular middleware, however they require an
 * arity of 4, aka the signature (err, req, res, next).
 * when connect has an error, it will invoke ONLY error-handling
 * middleware.
 *
 * If we were to next() here any remaining non-error-handling
 * middleware would then be executed, or if we next(err) to
 * continue passing the error, only error-handling middleware
 * would remain being executed, however here
 * we simply respond with an error page.
 *
 * Examples:
 *
 *     app.use(middleware.errserver({ view: '500', error: 'Internal server error' }))
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

const errserver = (options) => {
    options = options || {};

    let view = options.view || '500',
        error = options.error || '';

    return (err, req, res, next) => {
        // we may use properties of the error object
        // here and next(err) appropriately, or if
        // we possibly recovered from the error, simply next().
        res.status(err.status || 500);
        res.render(view, { error: error });
    };
};

const createExceptionRouter = () => {
    const router = express.Router();

    router.use(errlog());

    router.use(errclient({
        error: 'XHR error'
    }));

    router.use(errnotfound({
        view: path.join('common', '404.hogan'),
        error: 'Not found'
    }));

    router.use(errserver({
        view: path.join('common', '500.hogan'),
        error: 'Internal server error'
    }));

    return router;
};

export { createExceptionRouter };
