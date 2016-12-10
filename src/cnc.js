/* eslint max-len: 0 */
import path from 'path';
import program from 'commander';
import pkg from './package.json';

// Defaults to 'production'
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

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
    .option('-w, --watch-directory <path>', 'watch a directory for changes')
    .option('--access-token-lifetime <lifetime>', 'access token lifetime in seconds or a time span string (default: 30d)')
    .option('--allow-remote-access', 'allow remote access to the server', false);

program.on('--help', () => {
    console.log('  Examples:');
    console.log('');
    console.log('    $ cnc -vv');
    console.log('    $ cnc --mount /pendant:/home/pi/tinyweb');
    console.log('    $ cnc --allow-remote-access');
    console.log('');
});

// https://github.com/tj/commander.js/issues/512
// Commander assumes that process.argv[0] is 'node' and argv[1] is script name
if (process.argv.length > 1) {
    program.parse(process.argv);
}

const cnc = (options = {}, callback) => {
    // Change working directory to 'app' before require('./app')
    process.chdir(path.resolve(__dirname, 'app'));

    require('./app').createServer({
        port: program.port,
        host: program.host,
        backlog: program.backlog,
        configFile: program.config,
        verbosity: program.verbose,
        mount: program.mount,
        watchDirectory: program.watchDirectory,
        accessTokenLifetime: program.accessTokenLifetime,
        allowRemoteAccess: program.allowRemoteAccess,
        ...options // Override command-line options if specified
    }, callback);
};

export default cnc;
