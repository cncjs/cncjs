import crypto from 'crypto';
import os from 'os';
import path from 'path';
import urljoin from '../lib/urljoin';
import pkg from '../../package.json';

// hashedVersion
const hashedVersion = ((version) => {
    const algorithm = 'sha1';
    const buf = String(version);
    const hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return hash.substr(0, 8); // 8 digits
})(pkg.version);

const maxAge = (365 * 24 * 60 * 60 * 1000); // one year

export default {
    hashedVersion: hashedVersion,
    assets: {
        // web
        web: {
            routes: [ // with trailing slash
                urljoin(hashedVersion, '/'), // hashed route
                '/' // fallback
            ],
            path: path.resolve(__dirname, '..', '..', 'web'),
            maxAge: maxAge
        }
    },
    backend: {
        enable: false, // disable backend service in production
        host: 'localhost',
        port: 80,
        route: 'api/'
    },
    cluster: {
        // note. node-inspector cannot debug child (forked) process
        enable: false,
        maxWorkers: os.cpus().length || 1
    },
    winston: {
        level: 'info',
        colorize: true,
        timestamp: true, // or function()
        json: false,
        handleExceptions: true
    }
};
