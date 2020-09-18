import os from 'os';
import path from 'path';

const maxAge = 0;

export default {
  route: '/', // with trailing slash
  assets: {
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
