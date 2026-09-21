// This file is ESM in an otherwise CommonJS project, on purpose: the CommonJS
// build of eslint-config-trendmicro reaches for a `default` export that
// eslint-plugin-import does not have, and hands ESLint an undefined plugin.
// Loaded as ESM, the same config resolves the plugin correctly.
import path from 'path';
import globals from 'globals';
import trendmicro from 'eslint-config-trendmicro';

const dirname = import.meta.dirname;

/**
 * The component directories that predate the MUI migration: the @trendmicro
 * facade and the bootstrap-era helpers. They break every rule below — Stylus
 * imports, inline styles, files past 250 lines — and they are not being fixed,
 * they are being deleted. Until then they are excluded by name, so the rules
 * can apply to `src/app/components/**` by default and cover anything new
 * without a second edit here. This list only ever shrinks.
 */
const legacyComponents = [
  'Anchor', 'Blink', 'Breadcrumbs', 'Buttons', 'Center', 'Checkbox',
  'DatePicker', 'Dropdown', 'Ellipsis', 'FormControl', 'FormGroup', 'Forms',
  'GridSystem', 'Hoverable', 'I18n', 'Image', 'InlineError', 'Interpolate',
  'Loader', 'Margin', 'Modal', 'ModalTemplate', 'Navs', 'Notifications',
  'Paginations', 'Panel', 'Portal', 'Progress', 'ProtectedRoute', 'Radio',
  'RepeatButton', 'SectionGroup', 'SectionTitle', 'Space', 'Table',
  'TabularForm', 'ToggleSwitch', 'Toggler', 'Tooltip', 'Validation', 'Webcam',
  'Widget',
].map(name => `src/app/components/${name}/**`);

/**
 * Mateusz's rules for the rebuilt UI, as rules rather than as intentions.
 *
 * A convention only a reviewer checks is a convention that drifts, and the
 * codebase this replaces is the proof: 75 Stylus files and bootstrap classes
 * hand-written into 60 JSX files, which is what made the frontend
 * un-upgradable for years.
 */
const newUiRules = {
  // One component, one file, one directory. The repo being replaced has eight
  // files over 800 lines.
  'max-lines': ['error', {
    max: 250,
    skipBlankLines: true,
    skipComments: true,
  }],
  // No inline styles and no `sx`. A visual decision lives in `styles.js` next
  // to its component, where it has a name and can be found twice.
  'react/forbid-dom-props': ['error', {
    forbid: ['style'],
  }],
  'react/forbid-component-props': ['error', {
    forbid: ['style', 'sx'],
  }],
  'no-restricted-imports': ['error', {
    patterns: [{
      group: ['*.styl', '**/*.styl'],
      message: 'Migrated code takes its styling from the theme, not from Stylus.',
    }],
  }],
  // Colours come from the token file or they are not a decision anyone made.
  'no-restricted-syntax': ['error', {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]',
    message: 'Colour literals belong in src/app/theme/tokens.js.',
  }],
};


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
      // @stylistic/jsx-indent is deprecated in favour of `indent`, which is
      // switched off above on purpose — so enforcing it for JSX alone was
      // both inconsistent and a deprecation banner on every lint run.
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
  // ---------------------------------------------------------------------
  // The new UI.
  //
  // These rules are the ones that keep "shared components, one consistent
  // system" true after the third screen rather than only after the first, so
  // they are on from the first file. They are scoped by exclusion: everything
  // under `src/app/components/` is covered except the directories listed in
  // `legacyComponents`, which are the @trendmicro and bootstrap facade and are
  // deleted at the end of the migration. A component added tomorrow is
  // therefore covered without anyone remembering to add it here.
  // ---------------------------------------------------------------------
  {
    files: ['src/app/components/**/*.js', 'src/app/components/**/*.jsx', 'src/app/theme/**/*.js', 'src/app/theme/**/*.jsx'],
    ignores: legacyComponents,
    rules: newUiRules,
  },
  {
    // The token file is the one place a colour may be written down.
    files: ['src/app/theme/tokens.js'],
    rules: {
      'no-restricted-syntax': 0,
    },
  },
  {
    // Everything that is not the component library or the theme. Widgets and
    // screens consume `app/components`; if they reach for MUI directly, two of
    // them have their own button by the end of the month.
    files: ['src/app/**/*.js', 'src/app/**/*.jsx'],
    ignores: ['src/app/components/**', 'src/app/theme/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@mui/*', '@emotion/*'],
          message: 'Import from app/components instead: MUI belongs behind the shared component library.',
        }],
      }],
    },
  },
  {
    // Screens that have been migrated. This list grows by one entry per screen
    // and is what stops a rebuilt screen from quietly reintroducing Stylus or
    // an inline style.
    files: ['src/app/containers/Login/**/*.js', 'src/app/containers/Login/**/*.jsx', 'src/app/features/**/*.js', 'src/app/features/**/*.jsx'],
    rules: {
      ...newUiRules,
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@mui/*', '@emotion/*'],
            message: 'Import from app/components instead: MUI belongs behind the shared component library.',
          },
          {
            group: ['*.styl', '**/*.styl'],
            message: 'Migrated code takes its styling from the theme, not from Stylus.',
          },
        ],
      }],
    },
  },
  // ---------------------------------------------------------------------
  // The panel.
  //
  // A second application in the same repository, built from the design mockup
  // rather than migrated out of the old one. It runs React 19 through a
  // per-compiler alias, which is why the two rules below differ from
  // everything else here: the automatic JSX runtime needs no `React` in scope,
  // and saying it does would be describing the other application.
  //
  // The rest of the discipline is the same as `src/app/components`: nothing
  // oversized, no inline styles, and no colour written anywhere but the token
  // sheet — which here is CSS custom properties rather than a JS module,
  // because this application has no CSS-in-JS.
  // ---------------------------------------------------------------------
  {
    files: ['src/panel/**/*.js', 'src/panel/**/*.jsx'],
    rules: {
      'react/react-in-jsx-scope': 0,
      'react/jsx-uses-react': 0,
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'react/forbid-component-props': ['error', { forbid: ['style'] }],
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@mui/*', '@emotion/*', 'styled-components'],
            message: 'The panel has no CSS-in-JS. Styles live in a *.module.css beside the component.',
          },
          {
            group: ['app/**', '!app/lib/controller', '!app/lib/controller/**'],
            message: 'The panel takes only the controller client from the old application.',
          },
        ],
      }],
    },
  },
];
