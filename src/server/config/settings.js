import merge from 'lodash/merge';
import base from './settings.base';
import development from './settings.development';
import production from './settings.production';

const env = process.env.NODE_ENV || 'production'; // Ensure production environment if empty
const settings = {};

if (env === 'development') {
    merge(settings, base, development, { env: env });
} else {
    merge(settings, base, production, { env: env });
}

export default settings;
