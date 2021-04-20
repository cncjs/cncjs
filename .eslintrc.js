const path = require('path');

module.exports = {
  extends: 'trendmicro',
  parser: '@babel/eslint-parser',
  env: {
    browser: true,
    node: true,
    'jest/globals': true,
  },
  settings: {
    'import/resolver': {
      // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/node
      node: {},

      // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/webpack
      webpack: {
        config: {
          resolve: {
            modules: [
              path.resolve(__dirname, 'src'),
              'node_modules',
            ],
            extensions: ['.js', '.jsx'],
          }
        }
      }
    }
  },
  plugins: [
    '@babel',
    'react-hooks',
    'jest',
  ],
  rules: {
    'indent': ['error', 2],
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 2],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'max-lines-per-function': ['warn', {
      max: 1024,
      skipBlankLines: true,
      skipComments: true,
    }],
    'react/jsx-no-bind': ['warn', {
      allowArrowFunctions: true,
    }],
    'react/prefer-stateless-function': 0,
    'react/no-access-state-in-setstate': 0,
    'react/prop-types': 0,
    'react/jsx-curly-brace-presence': ['error', {
      'props': 'never',
      'children': 'ignore',
    }],
  }
};
