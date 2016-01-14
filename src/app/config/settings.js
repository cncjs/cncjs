import _ from 'lodash';
import crypto from 'crypto';
import path from 'path';
import pkg from '../../../package.json';
import urljoin from '../lib/urljoin';

// env
const env = process.env.NODE_ENV || 'development';
const debug = ('development' === env);

// RCFile
const RCFILE = '.cncrc';

// hashed_version
const hashed_version = ((version) => {
    let algorithm = 'sha1';
    let buf = String(version);
    let hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return hash.substr(0, 8); // 8 digits
})(pkg.version);

const getUserHome = () => (process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']);

const maxAge = debug ? 0 : (365 * 24 * 60 * 60 * 1000); // one year

let defaults = {
    debug: debug,
    cnc: {}, // override this settings using `cnc -c ~/.cncrc`
    cncrc: path.resolve(getUserHome(), RCFILE),

    // version from package.json
    version: pkg.version,
    // hashed version
    hashed_version: hashed_version,

    // for server.listen(port[, host][, backlog][, callback])
    // host and backlog are omitted by default
    port: process.env.PORT || 8000,

    route: '/', // with trailing slash
    cdn: {
        uri: ''
    },
    assets: {
        // web
        'web': {
            routes: [ // with trailing slash
                urljoin(hashed_version, '/'), // hashed route
                '/' // fallback
            ],
            path: path.resolve(__dirname, '..', '..', 'web'),
            maxAge: maxAge
        }
    },
    // Express view engine
    view: {
        // Set html (w/o dot) as the default extension
        defaultExtension: 'html',
        
        // Format: <extension>: <template>
        engines: [
            { // Hogan template with .html extension
                extension: 'html',
                template: 'hogan'
            },
            { // Hogan template with .hbs extension
                extension: 'hbs',
                template: 'hogan'
            },
            { // Hogan template with .hogan extension
                extension: 'hogan',
                template: 'hogan'
            },
            { // Jade template with .jade extension
                extension: 'jade',
                template: 'jade'
            }
        ]
    },
    // Middleware (https://github.com/senchalabs/connect)
    middleware: {
        // https://github.com/expressjs/body-parser
        'body-parser': {
            'json': {
                // maximum request body size. (default: <100kb>)
                limit: '10mb'
            },
            'urlencoded': {
                extended: true,
                // maximum request body size. (default: <100kb>)
                limit: '10mb'
            }
        },
        // https://github.com/mscdex/connect-busboy
        'busboy': {
            highWaterMark: 2 * 1024 * 1024,
            limits: {
                fileSize: 20 * 1024 * 1024 // 20MB
            },
            // immediate
            //   false: no immediate parsing
            //   true: immediately start reading from the request stream and parsing
            immediate: false
        },
        // https://github.com/andrewrk/node-multiparty/
        'multiparty': {
            // Limits the amount of memory a field (not a file) can allocate in bytes. If this value is exceeded, an error event is emitted. The default size is 2MB.
            maxFieldsSize: 20 * 1024 * 1024, // 20MB

            // Limits the number of fields that will be parsed before emitting an error event. A file counts as a field in this case. Defaults to 1000.
            maxFields: 1000
        },
        // https://github.com/expressjs/morgan
        'morgan': {
            format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m \x1b[34m:status\x1b[0m :response-time ms'
        },
        // https://github.com/expressjs/compression
        'compression': {
            // response is only compressed if the byte size is at or above this threshold.
            threshold: 512
        }
    },
    // Supported languages
    supportedLngs: [
        'en', // default language
        'de',
        'es',
        'fr',
        'it',
        'ja',
        'zh-cn',
        'zh-tw'
    ],
    siofu: { // SocketIOFileUploader
        dir: './tmp/siofu'
    },
    i18next: {
        lowerCaseLng: true,

        // logs out more info (console)
        debug: debug,

        // language to use
        //lng: lng,

        // language to lookup key if not found on set language
        fallbackLng: 'en',

        // string or array of namespaces
        ns: [
            'config',
            'resource' // default
        ],

        // default namespace used if not passed to translation function
        defaultNS: 'resource',

        whitelist: [
            'en', // default language
            'de',
            'es',
            'fr',
            'it',
            'ja',
            'zh-cn',
            'zh-tw'
        ],

        // array of languages to preload
        preload: [],

        // language codes to lookup, given set language is 'en-US':
        // 'all' --> ['en-US', 'en', 'dev']
        // 'currentOnly' --> 'en-US'
        // 'languageOnly' --> 'en'
        load: 'currentOnly',

        // char to separate keys
        keySeparator: '.',

        // char to split namespace from key
        nsSeparator: ':',

        interpolation: {
            prefix: '{{',
            suffix: '}}'
        },

        detection: {
            // order and from where user language should be detected
            order: ['session', 'querystring', 'cookie', 'header'],

            // keys or params to lookup language from
            lookupQuerystring: 'lang',
            lookupCookie: 'lang',
            lookupSession: 'lang',

            // cache user language
            caches: ['cookie']
        },

        backend: {
            // path where resources get loaded from
            loadPath: path.resolve(__dirname, '..', 'i18n', '{{lng}}', '{{ns}}.json'),

            // path to post missing resources
            addPath: path.resolve(__dirname, '..', 'i18n', '{{lng}}', '{{ns}}.savedMissing.json'),

            // jsonIndent to use when storing json files
            jsonIndent: 4
        }
    }
};

let settings = {};

if (debug) {
    let source = require('./development');
    settings = _.merge({}, defaults, source);
} else {
    let source = require('./production');
    settings = _.merge({}, defaults, source);
}

export default settings;
