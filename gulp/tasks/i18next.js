import _ from 'lodash';
import fs from 'fs';
import gulp from 'gulp';
import gutil from 'gulp-util';
import i18nextScanner from 'i18next-scanner';
import hash from 'sha1';
import table from 'text-table';

const appConfig = {
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
        sort: true,
        lngs: ['en'],
        defaultValue: '__L10N__', // to indicate that a default value has not been defined for the key
        resGetPath: 'src/app/i18n/{{lng}}/{{ns}}.json',
        resSetPath: 'src/app/i18n/{{lng}}/{{ns}}.json', // or 'src/app/i18n/${lng}/${ns}.saveAll.json'
        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator
        interpolationPrefix: '{{',
        interpolationSuffix: '}}',
        ns: {
            namespaces: [
                'config', // config
                'resource' // default
            ],
            defaultNs: 'resource'
        }
    }
};

const webConfig = {
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
        debug: false,
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

            if (!_.isUndefined(r[1])) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');
            }

            let params = this.parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params.defaultKey;
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

            if (!_.isUndefined(r[2])) {
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
    gulp.task('i18next:app', () => {
        return gulp.src(appConfig.src)
            .pipe(i18nextScanner(appConfig.options, function(file, enc, done) {
                const parser = this.parser;
                customTransform.call(parser, file, enc, done);
            }))
            .pipe(gulp.dest(appConfig.dest));
    });
    gulp.task('i18next:web', () => {
        return gulp.src(webConfig.src)
            .pipe(i18nextScanner(webConfig.options, function(file, enc, done) {
                const parser = this.parser;
                customTransform.call(parser, file, enc, done);
            }))
            .pipe(gulp.dest(webConfig.dest));
    });
};
