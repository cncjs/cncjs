/* eslint no-console: 0 */
const fs = require('fs');
const chalk = require('chalk');
const vfs = require('vinyl-fs');
const sort = require('gulp-sort');
const scanner = require('i18next-scanner');

const config = {
    src: [
        'src/app/**/*.html',
        'src/app/**/*.hbs',
        'src/app/**/*.js',
        'src/app/**/*.jsx',
        // Use ! to filter out files or directories
        '!src/app/i18n/**',
        '!**/node_modules/**'
    ],
    dest: './',
    options: {
        debug: false,
        sort: false,
        lngs: ['en'],
        defaultValue: '__L10N__', // to indicate that a default value has not been defined for the key
        ns: [
            'config',
            'resource' // default
        ],
        defaultNs: 'resource',
        resource: {
            loadPath: 'src/app/i18n/{{lng}}/{{ns}}.json',
            savePath: 'src/app/i18n/{{lng}}/{{ns}}.json', // or 'src/app/i18n/${lng}/${ns}.saveAll.json'
            jsonIndent: 4
        },
        nsSeparator: ':', // namespace separator
        keySeparator: '.', // key separator
        pluralSeparator: '_', // plural separator
        contextSeparator: '_', // context separator
        interpolation: {
            prefix: '{{',
            suffix: '}}'
        }
    }
};

function customTransform(file, enc, done) {
    "use strict";
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
        console.log(`i18next-scanner: count=${chalk.cyan(count)}, file=${chalk.yellow(JSON.stringify(file.relative))}`);
    }

    done();
}

vfs.src(config.src)
    .pipe(sort()) // Sort files in stream by path
    .pipe(scanner(config.options, customTransform))
    .pipe(vfs.dest(config.dest));
