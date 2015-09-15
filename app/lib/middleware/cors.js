/**
 * Cross Origin Resource Sharing:
 * 
 * Examples:
 *
 *   app.use(middleware.cors({ allowedOrigin: '*' }))
 *
 * Options:
 *
 *   - allowedOrigin    Specify a URI that may access the resource.
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function cors(options) {
    options = options || {};

    var allowedOrigin = options.allowedOrigin || '*';

    return function(req, res, next) {
        // Specify origin from which requests are allowed
        res.header('Access-Control-Allow-Origin', allowedOrigin);
        // When responding to a credentialed request, server must specify a domain, and cannot use wild carding. 
        res.header('Access-Control-Allow-Credentials', (allowedOrigin !== '*') ? true : false);
        // Specify which request methods are allowed
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        // Additional headers which may be sent along with the CORS request
        // The X-Requested-With header allows jQuery requests to go through
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');

        if ('OPTIONS' === req.method) {
            res.send(200);
        } else {
            next();
        }
    };
};
