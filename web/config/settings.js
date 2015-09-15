var root = window.root;

console.assert(typeof root.app.config === 'object', 'root.app.config is not an object');

var settings = {
    version: root.app.config.version,
    webroot: root.app.config.webroot,
    cdn: root.app.config.cdn,
    name: 'CNC.js',
    log: {
        level: 'debug', // trace, debug, info, warn, error
        logger: 'console', // console
        prefix: ''
    },
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
    i18next: {
        // Resources will be resolved in this order:
        // 1) try languageCode plus countryCode, eg. 'en-US'
        // 2) alternative look it up in languageCode only, eg. 'en'
        // 3) finally look it up in definded fallback language, default: 'dev'
        // If language is not set explicitly i18next tries to detect the user language by:
        // 1) querystring parameter (?setLng=en-US)
        // 2) cookie (i18next)
        // 3) language set in navigator
        //lng: lng,

        // Preload additional languages on init:
        preload: [],

        // To lowercase countryCode in requests, eg. to 'en-us' set option lowerCaseLng = true
        lowerCaseLng: true,

        // The current locale to set will be looked up in the new parameter: ?lang=en-US
        // default would be ?setLng=en-US
        detectLngQS: 'lang',

        // Enable cookie usage
        useCookie: true,

        // Change the cookie name to lookup lng
        cookieName: 'lang', // default: 'i18next'

        // As the fallbackLng will default to 'dev' you can turn it off by setting the option value to false. This will prevent loading the fallbacks resource file and any futher look up of missing value inside a fallback file.
        fallbackLng: 'en', //false,

        // Specify which locales to load:
        // If load option is set to current i18next will load the current set language (this could be a specific (en-US) or unspecific (en) resource file).
        // If set to unspecific i18next will always load the unspecific resource file (eg. en instead of en-US).
        load: 'current', // all, current, unspecific

        // Caching is turned off by default. You might want to turn it on for production.
        //useLocalStorage: has('production') ? true : false,
        useLocalStorage: false, // TODO: monitor the stability
        localStorageExpirationTime: 7*24*60*60*1000, // in ms, default 1 week

        // Debug output
        debug: false,

        // Path in resource store
        //resStore: resStore,

        // Set static route to load resources from
        // e.g. 'i18n/en-US/translation.json
        resGetPath: root.app.config.webroot + 'i18n/{{lng}}/{{ns}}.json',

        // Load resource synchron
        getAsync: false,

        // Send missing resources to server
        sendMissing: false,
        sendMissingTo: 'all', // fallback|current|all
        resPostPath: 'api/i18n/sendMissing/{{lng}}/{{ns}}',
        sendType: 'POST', // POST|GET
        postAsync: true, // true|false

        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator

        interpolationPrefix: '{{',
        interpolationSuffix: '}}',

        // Multiple namespace
        ns: {
            namespaces: [
                'locale', // locale: language, timezone, ...
                'resource' // default
            ],
            defaultNs: 'resource'
        }
    }
};

export default settings;
