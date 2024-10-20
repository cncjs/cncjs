/* eslint no-console: 0 */
/* eslint strict: 0 */
const fs = require('fs');
const chalk = require('chalk');
const languages = require('./build.config').languages;

module.exports = {
  src: [
    'src/app/**/*.{html,hbs,js,jsx}',
    // Use ! to filter out files or directories
    '!src/app/{vendor,i18n}/**',
    '!test/**',
    '!**/node_modules/**'
  ],
  dest: './',
  options: {
    debug: false,
    // Available since 4.6.0
    // @param {string} lng The language of the unused translation key.
    // @param {string} ns The namespace of the unused translation key.
    // @param {array} key The translation key in its array form.
    // @return {boolean} Returns true if the unused translation key should be removed.
    removeUnusedKeys: function(lng, ns, key) {
      if (ns === 'resource') {
        return true;
      }
      return false;
    },
    sort: false,
    func: {
      list: [], // Use an empty array to bypass the default list: i18n.t, i18next.t
      extensions: ['.js', '.jsx']
    },
    trans: {
      component: 'I18n',
      i18nKey: 'i18nKey',
      defaultsKey: 'defaults',
      extensions: ['.js', '.jsx'],
      fallbackKey: function(ns, value) {
        return value;
      }
    },
    lngs: languages,
    ns: [
      'gcode',
      'resource' // default
    ],
    defaultNs: 'resource',
    defaultValue: (lng, ns, key) => {
      if (lng === 'en') {
        return key; // Use key as value for base language
      }
      return ''; // Return empty string for other languages
    },
    resource: {
      loadPath: 'src/app/i18n/{{lng}}/{{ns}}.json',
      savePath: 'src/app/i18n/{{lng}}/{{ns}}.json', // or 'src/app/i18n/${lng}/${ns}.saveAll.json'
      jsonIndent: 2,
    },
    nsSeparator: ':', // namespace separator
    keySeparator: '.', // key separator
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    }
  },
  transform: function(file, enc, done) {
    'use strict';

    const parser = this.parser;
    const content = fs.readFileSync(file.path, enc);
    let count = 0;

    parser.parseFuncFromString(content, { list: ['i18n._', 'i18n.__'] }, (key, options) => {
      parser.set(key, Object.assign({}, options, {
        nsSeparator: false,
        keySeparator: false
      }));
      ++count;
    });

    if (count > 0) {
      console.log(`[i18next-scanner] transform: count=${chalk.cyan(count)}, file=${chalk.yellow(JSON.stringify(file.relative))}`);
    }

    done();
  }
};
