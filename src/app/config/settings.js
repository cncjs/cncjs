import _ from 'lodash';
import base from './settings.base';
import development from './settings.development';
import production from './settings.production';

const env = process.env.NODE_ENV || 'production'; // Ensure production environment if empty

let settings = {};

if (env === 'development') {
    settings = _.merge({}, base, development, { env: env });
} else {
    settings = _.merge({}, base, production, { env: env });
}

export default settings;
