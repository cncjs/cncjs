import _ from 'lodash';
import base from './settings.base';
import development from './settings.development';
import production from './settings.production';

const env = process.env.NODE_ENV || 'production'; // Ensure production environment if empty
const settings = {};

if (env === 'development') {
    _.merge(settings, base, development, { env: env });
} else {
    _.merge(settings, base, production, { env: env });
}

export default settings;
