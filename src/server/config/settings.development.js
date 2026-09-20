import os from 'os';
import path from 'path';

const maxAge = 0;

export default {
  route: '/', // with trailing slash
  assets: {
    // The panel is registered before the application, which serves from the
    // site root. Express matches mounts in order, and a root mount that
    // cannot find a file falls through — but relying on that is relying on a
    // detail of serve-static rather than saying what is meant.
    panel: {
      routes: [
        '/panel'
      ],
      path: path.resolve(__dirname, '..', '..', 'panel'),
      maxAge: maxAge
    },
    app: {
      routes: [
        '' // empty path
      ],
      path: path.resolve(__dirname, '..', '..', 'app'),
      maxAge: maxAge
    }
  },
  backend: {
    enable: true,
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
    level: 'debug'
  }
};
