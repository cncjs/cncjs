/**
 * err_log:
 *
 *   Write request and error information to stderr, loggly, or similar services.
 * 
 * Examples:
 *
 *   app.use(middleware.err_log())
 *
 * @return {Function}
 * @api public
 */

const err_log = () => {
    return (err, req, res, next) => {
        console.error(err.stack);
        next(err);
    };
};

module.exports = err_log;
