import _ from 'lodash';
import path from 'path';
import fse from 'fs-extra';
import pkg from '../package.json';
import gutil from 'gulp-util';

const bundleDependencies = {
    'vendor': [
        'async',
        'classnames',
        'fbjs/lib/joinClasses',
        'fixed-data-table',
        'gcode-interpreter',
        'gcode-parser',
        'history',
        'i18next',
        'jsuri',
        'lodash',
        'moment',
        'pubsub-js',
        'rc-switch',
        'react',
        'react-dom',
        'react-addons-update',
        'react-bootstrap',
        'react-datagrid',
        'react-dom',
        'react-dropzone',
        'react-infinite',
        'react-router',
        'react-select',
        'request',
        'sha1',
        'sortablejs',
        'three',

        // Bower Components
        'stacktrace'
    ]
};

export default {
    'babel': {
        src: [
            'src/app/**/*.js',
            // exclusion
            '!src/app/test/**'
        ],
        dest: 'dist/app',
        options: {
            presets: ['es2015', 'stage-0', 'react']
        }
    },
    clean: {
        src: [
            'src/web/**/*.css',
            // exclusion
            '!src/web/vendor/**'
        ],
        dist: [
            'dist/**/*'
        ]
    },
    dist: {
        base: 'src',
        src: [
            // app
            'src/app/views/**/*',
            'src/app/i18n/**/*',
            // web
            'src/web/favicon.ico',
            'src/web/plugins.js',
            'src/web/**/{images,textures}/**/*',
            'src/web/vendor/**/*',
            'src/web/i18n/**/*'
        ],
        dest: 'dist'
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
            compress: true,
            mangle: false
        }
    },
    browserify: {
        'vendor': {
            dest: 'dist/web/',
            options: {
                debug: true // Sourcemapping
            },
            require: bundleDependencies['vendor']
        },
        'app': {
            src: [
                './src/web/index.jsx'
            ],
            dest: 'dist/web/',
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
                    rootDir: 'src/web/',
                    minify: true,
                    // Example:
                    //   source={webroot}/../node_modules/bootstrap/**/*
                    //   target={webroot}/vendor/bootstrap/**/*
                    processRelativeUrl: (relativeUrl) => {
                        const stripQueryStringAndHashFromPath = (url) => {
                            return url.split('?')[0].split('#')[0];
                        };
                        let sourceDir = path.resolve(process.cwd(), 'src', 'web');
                        let targetDir = path.resolve(process.cwd(), 'dist', 'web');
                        let relativePath = stripQueryStringAndHashFromPath(relativeUrl);
                        let queryStringAndHash = relativeUrl.substring(relativePath.length);

                        let prefix = '../../node_modules/';
                        if (_.startsWith(relativePath, prefix)) {
                            let vendorPath = 'vendor/' + relativePath.substring(prefix.length);
                            let source = path.join(sourceDir, relativePath);
                            let target = path.join(targetDir, vendorPath);

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
            'src/web/components/**/*.css',
            'src/web/styles/**/*.css'
            // exclusion
        ],
        options: require('../config/csslint')
    },
    jscs: {
        src: [
            'gulp/**/*.js',
            '*.js',
            '*.jsx',
            'src/{app,web}/**/*.js',
            'test/**/*.js',

            // exclusion
            '!src/web/vendor/**',
            '!test/**',
            '!**/node_modules/**'
        ]
    },
    eslint: {
        src: [
            'gulp/**/*.js',
            '*.js',
            '*.jsx',
            'src/{app,web}/**/*.js',
            'src/{app,web}/**/*.jsx',
            'test/**/*.js',

            // exclusion
            '!src/web/vendor/**',
            '!**/node_modules/**'
        ],
        options: require('../config/eslint')
    },
    jshint: {
        src: [
            '*.json',
            'src/{app,web}/**/*.json',
            'test/**/*.json',

            // exclusion
            '!src/web/vendor/**',
            '!**/node_modules/**'
        ],
        options: require('../config/jshint')
    },
    mainBowerFiles: {
        base: 'bower_components/',
        dest: 'src/web/vendor/',
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
        src: ['src/web/**/*.styl'],
        dest: 'src/web/',
        options: {
            compress: true
        }
    },
    i18next: {
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
    }
};
