const path = require('path');

module.exports = {
    extends: 'trendmicro',
    parser: 'babel-eslint',
    env: {
        browser: true,
        node: true
    },
    settings: {
        'import/resolver': {
            webpack: {
                config: {
                    resolve: {
                        modules: [
                            path.resolve(__dirname, 'src'),
                            'node_modules'
                        ],
                        extensions: ['.js', '.jsx']
                    }
                }
            }
        }
    },
    rules: {
        'max-lines-per-function': [1, {
            max: 512,
            skipBlankLines: true,
            skipComments: true
        }],
        'react/jsx-no-bind': [1, {
            allowArrowFunctions: true
        }],
        'react/prefer-stateless-function': 0,
        'react/no-access-state-in-setstate': 0
    }
};
