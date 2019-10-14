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
    plugins: [
        'react-hooks',
    ],
    rules: {
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': 'error', // Checks effect dependencies
        'max-lines-per-function': ['warn', {
            max: 1024,
            skipBlankLines: true,
            skipComments: true
        }],
        'react/jsx-no-bind': ['warn', {
            allowArrowFunctions: true
        }],
        'react/prefer-stateless-function': 0,
        'react/no-access-state-in-setstate': 0,
        'react/prop-types': 0,
        "react/jsx-curly-brace-presence": ['error', {
            'props': 'never',
            'children': 'ignore',
        }],
    }
};
