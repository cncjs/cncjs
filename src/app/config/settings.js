import env from 'app/config/env';
import pkg from '../../package.json';

const webroot = '/';

const settings = {
  name: pkg.name,
  productName: pkg.productName,
  version: pkg.version,
  webroot: webroot,
  url: {
    issues: 'https://github.com/cncjs/cncjs/issues',
    releases: 'https://github.com/cncjs/cncjs/releases',
    wiki: 'https://github.com/cncjs/cncjs/wiki',
  },
  log: {
    level: 'warn' // trace, debug, info, warn, error
  },
  analytics: {
    trackingId: env.TRACKING_ID
  },
};

export default settings;
