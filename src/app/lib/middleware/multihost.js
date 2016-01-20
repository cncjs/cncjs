/**
 * multihost:
 * 
 * Setup multi-host for the given `hosts`, `route` and `server`.
 * The `server` may be a Connect server or a regular Node `http.Server`.
 *
 * Examples:
 *
 *   app.use(middleware.multihost({
 *       hosts: 'foo.com',
 *       server: fooApp
 *   }));
 *   app.use(middleware.multihost({
 *       hosts: 'bar.com',
 *       server: barApp
 *   }));
 *   app.use(middleware.multihost({
 *       hosts: '*.com',
 *       route: '/foo',
 *       server: fooApp
 *   }));
 *   app.use(middleware.multihost({
 *       hosts: '*.com',
 *       route: '/bar',
 *       server: barApp
 *   }));
 *   app.use(middleware.multihost({
 *       hosts: [
 *           '*.com',
 *           'localhost'
 *       ],
 *       server: mainApp
 *   }));
 *
 * Options:
 *
 *   - hosts   A virtual host string or an array of virtual host strings
 *   - route   A route string containing the URI to be matched
 *   - server  The `server` may be a Connect server or a regular Node `http.Server`
 *
 * @param {Object} options
 * @return {Function}
 */

const multihost = (options) => {
    let { hosts, route, server } = options;
    let regexps = [];

    if (route && typeof(route) !== 'string') {
        throw new Error('multihost: route is not a string');
    }
    if (!server) {
        throw new Error('multihost: server required');
    }
    // hosts
    if (hosts) {
        if (typeof hosts === 'string') {
            hosts = [hosts];
        }
        for (let i = 0; i < hosts.length; ++i) {
            regexps.push(new RegExp('^' + hosts[i].replace(/[*]/g, '(.*?)') + '$', 'i'));
        }
    }
    return (req, res, next) => {
        // hosts
        if (regexps.length > 0) {
            if ( ! req.headers.host) {
                return next();
            }
            let hostname = req.headers.host.split(':')[0]; // e.g. localhost:8000
            let i;
            for (i = 0; i < regexps.length; ++i) {
                let regexp = regexps[i];
                if (regexp.test(hostname)) {
                    break;
                }
            }
            if (i === regexps.length) {
                return next();
            }
        }
        // route
        if (route && req.url.indexOf(route) !== 0)  {
            return next();
        }
        // server
        if (typeof(server) === 'function') {
            return server(req, res, next);
        }
        server.emit('request', req, res);
    };
};

module.exports = multihost;
