import _ from 'lodash';
import fs from 'fs';
import gulp from 'gulp';
import gutil from 'gulp-util';
import sort from 'gulp-sort';
import i18nextScanner from 'i18next-scanner';
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

const webConfig = {
    src: [
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
        sort: false,
        removeUnusedKeys: true,
        lngs: [
            'en', // English (default)
            'cs', // Czech
            'de', // German
            'es', // Spanish
            'fr', // French
            'it', // Italian
            'ja', // Japanese
            'pt-br', // Portuguese (Brazil)
            'ru', // Russian
            'zh-cn', // Simplified Chinese
            'zh-tw' // Traditional Chinese
        ],
        defaultValue: (lng, ns, key) => {
            if (lng === 'en') {
                return key; // Use key as value for base language
            }
            return ''; // Return empty string for other languages
        },
        ns: [
            'controller', // Grbl, TinyG2
            'gcode', // G-code
            'resource' // default
        ],
        defaultNs: 'resource',
        resource: {
            loadPath: 'src/web/i18n/{{lng}}/{{ns}}.json',
            savePath: 'src/web/i18n/{{lng}}/{{ns}}.json', // or 'src/web/i18n/${lng}/${ns}.saveAll.json'
            jsonIndent: 4
        },
        nsSeparator: ':', // namespace separator
        keySeparator: '.', // key separator
        interpolation: {
            prefix: '{{',
            suffix: '}}'
        }
    }
};

function customTransform(file, enc, done) {
    const parser = this.parser;
    const content = fs.readFileSync(file.path, enc);
    let tableData = [
        ['Key', 'Value']
    ];

    { // Using i18next-text
        parser.parseFuncFromString(content, { list: ['i18n._'] }, (key, options) => {
            parser.set(key, {
                ...options,
                nsSeparator: false,
                keySeparator: false
            });
            tableData.push([key, key]);
        });
    }

    if (_.size(tableData) > 1) {
        const text = table(tableData, { 'hsep': ' | ' });
        gutil.log('i18next-scanner:', file.relative + '\n' + text);
    } else {
        gutil.log('i18next-scanner:', file.relative);
    }

    done();
}

export default (options) => {
    gulp.task('i18next:app', () => {
        return gulp.src(appConfig.src)
            .pipe(i18nextScanner(appConfig.options, customTransform))
            .pipe(gulp.dest(appConfig.dest));
    });
    gulp.task('i18next:web', () => {
        return gulp.src(webConfig.src)
            .pipe(sort()) // Sort files in stream by path
            .pipe(i18nextScanner(webConfig.options, customTransform))
            .pipe(gulp.dest(webConfig.dest));
    });
};
