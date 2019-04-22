import os from 'os';
import path from 'path';
import urljoin from '../lib/urljoin';

const publicPath = global.PUBLIC_PATH || ''; // see gulp/task/app.js
const maxAge = (365 * 24 * 60 * 60 * 1000); // one year

export default {
    route: '/', // with trailing slash
    assets: {
        app: {
            routes: [ // with trailing slash
                urljoin(publicPath, '/'),
                '/' // fallback
            ],
            path: path.resolve(__dirname, '..', '..', 'app'),
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
        // https://github.com/winstonjs/winston#logging-levels
        level: 'info'
    }
};
