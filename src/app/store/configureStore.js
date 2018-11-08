import env from 'app/config/env';

// Use DefinePlugin (Webpack) or loose-envify (Browserify)
// together with Uglify to strip the dev branch in prod build.
if (env.NODE_ENV === 'production') {
    module.exports = require('./configureStore.production');
} else {
    module.exports = require('./configureStore.development');
}
