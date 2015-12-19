var pkg = require('../../package.json'),
    path = require('path'),
    urljoin = require('../lib/urljoin');

// env
var env = process.env.NODE_ENV || 'production';

// hashed_version
var hashed_version = (function(version) {
    var crypto = require('crypto');
    var algorithm = 'sha1';
    var buf = String(version);
    var hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return hash.substr(0, 8); // 8 digits
}(pkg.version));

var maxAge;
if ('development' === env) {
    maxAge = 0;
} else {
    maxAge = 365 * 24 * 60 * 60 * 1000; // one year
}

var settings = { // Default settings
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
        },
        // dist
        'dist': {
            routes: [ // with trailing slash
                urljoin(hashed_version, '/'), // hashed route
                '/' // fallback
            ],
            path: path.resolve(__dirname, '..', '..', 'dist'),
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
    cnc: { // override this settings using `cnc -c /path/to/your/config.js`
        ports: []
    },
    siofu: { // SocketIOFileUploader
        dir: './tmp/siofu'
    },
    i18next: {
        // To lowercase countryCode in requests, eg. to 'en-us' set option lowerCaseLng = true
        lowerCaseLng: true,

        // Set language from requested route: default false
        // Just set the value to the index where the language value is, eg.:
        // detectLngFromPath=0 --> /en-US/myPage
        // detectLngFromPath=1 --> /cms/en-US/myPage
        detectLngFromPath: false,

        // The current locale to set will be looked up in the new parameter: ?lang=en-US
        // default would be ?setLng=en-US
        detectLngQS: 'lang',

        // Enable cookie usage
        useCookie: true,

        // Change the cookie name to lookup lng
        cookieName: 'lang', // default: 'i18next'

        // Preload additional languages on init:
        preload: [],

        // As the fallbackLng will default to 'dev' you can turn it off by setting the option value to false. This will prevent loading the fallbacks resource file and any futher look up of missing value inside a fallback file.
        fallbackLng: 'en', //false,

        // Specify which locales to load:
        // If load option is set to current i18next will load the current set language (this could be a specific (en-US) or unspecific (en) resource file).
        // If set to unspecific i18next will always load the unspecific resource file (eg. en instead of en-US).
        load: 'current', // all, current, unspecific

        debug: true,

        resGetPath: path.resolve(__dirname, '..', 'i18n', '${lng}', '${ns}.json'),

        saveMissing: true,
        resSetPath: path.resolve(__dirname, '..', 'i18n', '${lng}', '${ns}.savedMissing.json'),

        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator

        interpolationPrefix: '${',
        interpolationSuffix: '}',

        ns: {
            namespaces: [
                'resource', // default
                'config'
            ],
            defaultNs: 'resource'
        }
    }
};

var _settings = {};
var _ = require('lodash');

if ('development' === env) {
    _settings = require('./development');
    settings = _.extend(settings, _settings);
} else {
    _settings = require('./production');
    settings = _.extend(settings, _settings);
}

module.exports = settings;
