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
            alias: {
              '@app': path.resolve(__dirname, 'src/app'),
            },
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
    'max-lines-per-function': ['warn', {
      max: 1024,
      skipBlankLines: true,
      skipComments: true,
    }],
    'no-unused-vars': ['error', {
      // https://eslint.org/docs/latest/rules/no-unused-vars#args
      args: 'none', // do not check arguments
    }],
    'react/jsx-curly-newline': 'warn',
    'react/jsx-no-bind': ['warn', {
      allowArrowFunctions: true,
    }],
    'react/jsx-no-leaked-render': 0, // TODO
    'react/no-access-state-in-setstate': 0,
    'react/prefer-stateless-function': 0,
    'react/prop-types': 0,
    'react/jsx-curly-brace-presence': ['error', {
      'props': 'never',
      'children': 'ignore',
    }],
    'react/static-property-placement': 0,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
  }
};
