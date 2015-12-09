import _ from 'lodash';
import path from 'path';
import fse from 'fs-extra';
import pkg from '../package.json';
import gutil from 'gulp-util';

const build = './build/';
const dist = './dist/';
const bundleDependencies = {
    'vendor': [
        //'i18next',
        'react',
        'react-dom',
        'react-addons-update',
        'lodash'
    ]
};

export default {
    clean: {
        styles: [
            'web/components/**/*.css',
            'web/styles/**/*.css'
        ],
        scripts: [
        ],
        templates: [
        ],
        vendor: [
            'web/vendor/**'
        ]
    },
    autoprefixer: {
        options: {
            browsers: [
                'last 2 versions',
                'safari 5',
                'ie 8',
                'ie 9',
                'opera 12.1',
                'ios 6',
                'android 4'
            ],
            cascade: true
        }
    },
    uglify: {
        options: {
        }
    },
    browserify: {
        'vendor': {
            dest: dist + 'assets/',
            options: {
                debug: true // Sourcemapping
            },
            require: bundleDependencies['vendor']
        },
        'app': {
            src: [
                './web/main.js'
            ],
            dest: dist + 'assets/',
            options: {
                paths: [],
                extensions: ['.jsx'], // default: .js and .json
                debug: true, // Sourcemapping

                // watchify requires these options
                cache: {},
                packageCache: {},
                fullPaths: true
            },
            external: _.union(
                bundleDependencies['vendor']
            ),
            transform: {
                'babelify': {
                    presets: ['es2015', 'stage-0', 'react']
                },
                'browserify-css': {
                    autoInject: true,
                    autoInjectOptions: {
                        'verbose': true
                    },
                    rootDir: 'web/',
                    minify: true,
                    // Example:
                    //   source={webroot}/../node_modules/bootstrap/**/*
                    //   target={webroot}/vendor/bootstrap/**/*
                    processRelativeUrl: (relativeUrl) => {
                        const stripQueryStringAndHashFromPath = (url) => {
                            return url.split('?')[0].split('#')[0];
                        };
                        let rootDir = path.resolve(process.cwd(), 'web');
                        let relativePath = stripQueryStringAndHashFromPath(relativeUrl);
                        let queryStringAndHash = relativeUrl.substring(relativePath.length);

                        let prefix = '../node_modules/';
                        if (_.startsWith(relativePath, prefix)) {
                            let vendorPath = 'vendor/' + relativePath.substring(prefix.length);
                            let source = path.join(rootDir, relativePath);
                            let target = path.join(rootDir, vendorPath);

                            gutil.log('Copying file from ' + JSON.stringify(source) + ' to ' + JSON.stringify(target));
                            fse.copySync(source, target);

                            // Returns a new path string with original query string and hash fragments
                            return vendorPath + queryStringAndHash;
                        }

                        return relativeUrl;

                    }
                }
            }
        }
    },
    csslint: {
        src: [
            'web/components/**/*.css',
            'web/styles/**/*.css'
            // exclusion
        ],
        options: require('../config/csslint')
    },
    handlebars: {
        common: {
            src: 'web/components/common/**/*.hbs',
            dest: 'web/components/common/'
        },
        portal: {
            src: 'web/components/portal/**/*.hbs',
            dest: 'web/components/portal/'
        }
    },
    jscs: {
        src: [
            'gulp/**/*.js',
            '*.js',
            '*.jsx',
            '{app,web,test}/**/*.js',

            // exclusion
            '!web/**/handlebars-templates.js', // exclude handlebars-templates.js:w!
            '!web/{vendor,test}/**',
            '!**/node_modules/**'
        ],
        options: require('../config/jscs')
    },
    eslint: {
        src: [
            'gulp/**/*.js',
            '*.js',
            '*.jsx',
            '{app,web}/**/*.js',
            '{app,web}/**/*.jsx',

            // exclusion
            '!web/**/handlebars-templates.js', // exclude handlebars-templates.js:w!
            '!web/{vendor,test}/**',
            '!**/node_modules/**'
        ],
        options: require('../config/eslint')
    },
    jshint: {
        src: [
            '*.json',
            '{app,web,test}/**/*.json',

            // exclusion
            '!web/{vendor,test}/**',
            '!**/node_modules/**'
        ],
        options: require('../config/jshint')
    },
    mainBowerFiles: {
        base: 'bower_components/',
        dest: 'web/vendor/',
        options: {
            checkExistence: true,
            debugging: true,
            paths: {
                bowerDirectory: 'bower_components',
                bowerrc: '.bowerrc',
                bowerJson: 'bower.json'
            }
        }
    },
    stylus: {
        src: ['web/**/*.styl'],
        dest: 'web/',
        options: {
            compress: true
        }
    },
    i18next: {
        src: [
            'web/**/*.html',
            'web/**/*.hbs',
            'web/**/*.js',
            'web/**/*.jsx',
            // Use ! to filter out files or directories
            '!web/{vendor,test,i18n}/**'
        ],
        dest: './',
        options: {
            debug: true,
            sort: true,
            lngs: ['en'],
            defaultValue: '__L10N__', // to indicate that a default value has not been defined for the key
            resGetPath: 'web/i18n/{{lng}}/{{ns}}.json',
            resSetPath: 'web/i18n/{{lng}}/{{ns}}.json', // or 'web/i18n/${lng}/${ns}.saveAll.json'
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
    }
};
