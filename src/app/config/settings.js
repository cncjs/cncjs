import _ from 'lodash';

const env = process.env.NODE_ENV || 'production'; // Ensure production environment if empty

let settings = {};

if (env === 'development') {
    settings = _.merge({}, require('./settings.base'), require('./settings.development'), { env: env });
} else {
    settings = _.merge({}, require('./settings.base'), require('./settings.production'), { env: env });
}

module.exports = settings; // use "module.exports" instead of "export default" for settings
