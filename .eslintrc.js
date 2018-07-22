const path = require('path');

module.exports = {
    'extends': 'trendmicro',
    'parser': 'babel-eslint',
    'env': {
        'browser': true,
        'node': true
    },
    'settings': {
        'import/resolver': {
            'webpack': {
                'config': path.resolve(__dirname, 'webpack.webconfig.base.js')
            }
        }
    },
    'rules': {
        'react/jsx-no-bind': [1, {
            allowArrowFunctions: true
        }],
        'react/prefer-stateless-function': 0,
        'react/no-access-state-in-setstate': 0
    }
};
