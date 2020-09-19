/**
 * 'lower-case', // default
 * 'upper-case', // UPPERCASE
 * 'camel-case', // camelCase
 * 'kebab-case', // kebab-case
 * 'pascal-case', // PascalCase
 * 'sentence-case', // Sentence case
 * 'snake-case', // snake_case
 * 'start-case', // Start Case
 */

module.exports = {
  extends: [
    '@commitlint/config-conventional',
  ],
  rules: {
    'header-max-length': [2, 'always', 128],
    'scope-case': [0],
    'subject-case': [0],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'cd',
        'docs',
        'feat',
        'fix',
        'i18n',
        'l10n',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
};
