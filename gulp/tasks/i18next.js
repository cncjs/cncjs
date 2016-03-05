import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import gutil from 'gulp-util';
import i18nextScanner from 'i18next-scanner';
import hash from 'sha1';
import table from 'text-table';

const i18nextConfig = {
    src: [
        'src/web/**/*.html',
        'src/web/**/*.hbs',
        'src/web/**/*.js',
        'src/web/**/*.jsx',
        // Use ! to filter out files or directories
        '!src/web/{vendor,i18n}/**',
        '!test/**',
        '!**/node_modules/**'
    ],
    dest: './',
    options: {
        debug: true,
        sort: true,
        lngs: ['en'],
        defaultValue: '__L10N__', // to indicate that a default value has not been defined for the key
        resGetPath: 'src/web/i18n/{{lng}}/{{ns}}.json',
        resSetPath: 'src/web/i18n/{{lng}}/{{ns}}.json', // or 'src/web/i18n/${lng}/${ns}.saveAll.json'
        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator
        interpolationPrefix: '{{',
        interpolationSuffix: '}}',
        ns: {
            namespaces: [
                'locale', // locale: language, timezone, ...
                'resource' // default
            ],
            defaultNs: 'resource'
        }
    }
};

function customTransform(file, enc, done) {
    let extname = path.extname(file.path);
    let content = fs.readFileSync(file.path, enc);
    let tableData = [
        ['Key', 'Value']
    ];

    gutil.log('parsing ' + JSON.stringify(file.relative) + ':');

    { // Using i18next-text
        let results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, (result) => {
            let key, value;
            let r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);

            if (r) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');

                key = hash(value); // returns a hash value as its default key

                this.parse(key, value);
                tableData.push([key, value]);
            }
        });
    }

    { // i18n function helper
        let results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
        _.each(results, (result) => {
            let key, value;
            let r = result.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/m) || [];

            if ( ! _.isUndefined(r[1])) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');
            }

            let params = this.parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params['defaultKey'];
            }

            if (_.isUndefined(key) && _.isUndefined(value)) {
                return;
            }

            if (_.isUndefined(key)) {
                key = hash(value); // returns a hash value as its default key
            }

            this.parse(key, value);
            tableData.push([key, value]);
        });
    }

    { // i18n block helper
        let results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
        _.each(results, (result) => {
            let key, value;
            let r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

            if ( ! _.isUndefined(r[2])) {
                value = _.trim(r[2], '\'"');
            }

            if (_.isUndefined(value)) {
                return;
            }

            key = hash(value); // returns a hash value as its default key

            this.parse(key, value);
            tableData.push([key, value]);
        });
    }

    if (_.size(tableData) > 1) {
        let text = table(tableData, {
            'hsep': ' | '
        });
        gutil.log('result of %s:\n%s', JSON.stringify(file.relative), text);
    }

    done();
}

export default (options) => {
    gulp.task('i18next', () => {
        return gulp.src(i18nextConfig.src)
            .pipe(i18nextScanner(i18nextConfig.options, function(file, enc, done) {
                let parser = this.parser;
                customTransform.call(parser, file, enc, done);
            }))
            .pipe(gulp.dest(i18nextConfig.dest));
    });
};
