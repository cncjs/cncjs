/* eslint max-len: 0 */
/* eslint no-console: 0 */
import path from 'path';
import program from 'commander';
import expandTilde from 'expand-tilde';
import pkg from './package.json';

// Defaults to 'production'
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const increaseVerbosityLevel = (val, total) => {
    return total + 1;
};

const parseMountPoint = (val, acc) => {
    val = val || '';

    const mount = {
        route: '/',
        directory: val
    };

    if (val.indexOf(':') >= 0) {
        const r = val.match(/(?:([^:]*)(?::(.*)))/);
        mount.route = r[1];
        mount.directory = r[2];
    }

    mount.route = path.join('/', mount.route || ''); // path.join('/', 'pendant') => '/pendant'
    mount.directory = expandTilde(mount.directory || ''); // expandTilde('~') => '/Users/<userhome>'

    acc.push(mount);

    return acc;
};

const parseController = (val) => {
    val = val ? (val + '').toLowerCase() : '';

    if (val === 'grbl' || val === 'smoothie' || val === 'tinyg' || val === 'g2core') {
        return val;
    } else {
        return '';
    }
};

program
    .version(pkg.version)
    .usage('[options]')
    .option('-p, --port <port>', 'Set listen port (default: 8000)', 8000)
    .option('-H, --host <host>', 'Set listen address or hostname (default: 0.0.0.0)', '0.0.0.0')
    .option('-b, --backlog <backlog>', 'Set listen backlog (default: 511)', 511)
    .option('-c, --config <filename>', 'Set config file (default: ~/.cncrc)')
    .option('-v, --verbose', 'Increase the verbosity level (-v, -vv, -vvv)', increaseVerbosityLevel, 0)
    .option('-m, --mount <route-path>:<directory-path>', 'Add a mount point for serving static files', parseMountPoint, [])
    .option('-w, --watch-directory <path>', 'Watch a directory for changes')
    .option('--access-token-lifetime <lifetime>', 'Access token lifetime in seconds or a time span string (default: 30d)')
    .option('--allow-remote-access', 'Allow remote access to the server (default: false)')
    .option('--controller <type>', 'Specify CNC controller: Grbl|Smoothie|TinyG|g2core (default: \'\')', parseController, '');

program.on('--help', () => {
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ cnc -vv');
    console.log('    $ cnc --mount /pendant:/home/pi/tinyweb');
    console.log('    $ cnc --mount /widgets:~/widgets --mount /pendant:~/pendant');
    console.log('    $ cnc --watch-directory /home/pi/watch');
    console.log('    $ cnc --access-token-lifetime 60d  # e.g. 3600, 30m, 12h, 30d');
    console.log('    $ cnc --allow-remote-access');
    console.log('    $ cnc --controller Grbl');
    console.log('');
});

// Commander assumes that the first two values in argv are 'node' and appname, and then followed by the args.
// This is not the case when running from a packaged Electron app. Here you have the first value appname and then args.
const normalizedArgv = ('' + process.argv[0]).indexOf(pkg.name) >= 0
    ? ['node', pkg.name, ...process.argv.slice(1)]
    : process.argv;
if (normalizedArgv.length > 1) {
    program.parse(normalizedArgv);
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
        mountPoints: program.mount,
        watchDirectory: program.watchDirectory,
        accessTokenLifetime: program.accessTokenLifetime,
        allowRemoteAccess: !!program.allowRemoteAccess,
        controller: program.controller,
        ...options // Override command-line options if specified
    }, callback);
};

export default cnc;
