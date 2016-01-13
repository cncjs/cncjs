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

module.exports = function err_log() {
    return function(err, req, res, next) {
        console.error(err.stack);
        next(err);
    };
};
