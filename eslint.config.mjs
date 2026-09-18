// This file is ESM in an otherwise CommonJS project, on purpose: the CommonJS
// build of eslint-config-trendmicro reaches for a `default` export that
// eslint-plugin-import does not have, and hands ESLint an undefined plugin.
// Loaded as ESM, the same config resolves the plugin correctly.
import path from 'path';
import globals from 'globals';
import trendmicro from 'eslint-config-trendmicro';

const dirname = import.meta.dirname;

export default [
  {
    ignores: [
      'dist/',
      'output/',
      'test-results/',
      'playwright-report/',
    ],
  },
  ...trendmicro,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        // Pinned rather than detected: eslint-plugin-react 7.37 detects the
        // version through `context.getFilename()`, which ESLint 10 removed.
        version: '15.6',
      },

      'import/resolver': {
        // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/node
        node: {},

        // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/webpack
        webpack: {
          config: {
            resolve: {
              alias: {
                '@app': path.resolve(dirname, 'src/app'),
              },
              modules: [
                path.resolve(dirname, 'src'),
                'node_modules',
              ],
              extensions: ['.js', '.jsx'],
            }
          }
        }
      }
    },
    rules: {
      'import/no-relative-packages': 0,
      // The formatting rules moved to @stylistic, so the long-standing
      // decision not to enforce indentation now has to be spelled there.
      // indent-binary-ops is part of the same family and did not exist before.
      '@stylistic/indent': 0,
      '@stylistic/indent-binary-ops': 0,
      'max-lines-per-function': ['warn', {
        max: 1024,
        skipBlankLines: true,
        skipComments: true,
      }],
      'no-console': 0,
      'no-unused-vars': ['error', {
        // https://eslint.org/docs/latest/rules/no-unused-vars#args
        args: 'none', // do not check arguments
        caughtErrors: 'none', // ESLint 9 flipped this default to 'all'
      }],
      'prefer-exponentiation-operator': 1,
      // This is React 15: JSX compiles to React.createElement, so the React
      // import every component carries is used even though nothing names it.
      // The shared config assumes the React 17 transform and turns both off.
      'react/jsx-uses-react': 'error',
      'react/react-in-jsx-scope': 'error',
      'react/forbid-foreign-prop-types': 0,
      '@stylistic/jsx-curly-newline': 'warn',
      '@stylistic/jsx-indent': ['warn', 2],
      '@stylistic/jsx-indent-props': ['error', 2],
      'react/jsx-no-bind': ['warn', {
        allowArrowFunctions: true,
      }],
      'react/jsx-no-leaked-render': 0,
      'react/static-property-placement': 0,
      'react/no-access-state-in-setstate': 0,
      'react/prefer-stateless-function': 0,
      'react/prop-types': 0,
      //'react-hooks/rules-of-hooks': 'error',
      //'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // `/* eslint-env jest */` stopped being read in ESLint 9, so the test
    // globals are declared here instead.
    files: ['**/__tests__/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['e2e/**/*.js'],
    rules: {
      // End-to-end steps are deliberately sequential: the point of walking
      // three axes or eight settings sections one at a time is that each
      // step observes the state the previous one left behind. Running them
      // concurrently would not be faster in any useful sense — it would test
      // something else.
      'no-await-in-loop': 'off',
    },
  },
];
