/* eslint max-len: 0 */

// Defaults to 'production'
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import path from 'path';
import program from 'commander';
import pkg from './package.json';

const increaseVerbosityLevel = (val, total) => {
    return total + 1;
};

const parseMountPoint = (val) => {
    val = val || '';

    if (val.indexOf(':') >= 0) {
        let r = val.match(/(?:([^:]*)(?::(.*)))/);
        return {
            url: r[1] || '/static',
            path: r[2]
        };
    }

    return {
        url: '/static',
        path: val
    };
};

program
    .version(pkg.version)
    .usage('[options]')
    .option('-p, --port <port>', 'set listen port (default: 8000)', 8000)
    .option('-H, --host <host>', 'set listen address or hostname (default: 0.0.0.0)', '0.0.0.0')
    .option('-b, --backlog <backlog>', 'set listen backlog (default: 511)', 511)
    .option('-c, --config <filename>', 'set config file (default: ~/.cncrc)')
    .option('-v, --verbose', 'increase the verbosity level', increaseVerbosityLevel, 0)
    .option('-m, --mount [<url>:]<path>', 'set the mount point for serving static files (default: /static:static)', parseMountPoint, { url: '/static', path: 'static' })
    .parse(process.argv);

const createServer = (callback) => {
    // Change working directory to 'app' before require('./app')
    process.chdir(path.resolve(__dirname, 'app'));

    require('./app').createServer({
        port: program.port,
        host: program.host,
        backlog: program.backlog,
        config: program.config,
        verbose: program.verbose,
        mount: program.mount
    }, callback);
};

export default createServer;
