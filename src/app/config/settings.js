import mapKeys from 'lodash/mapKeys';
import sha1 from 'sha1';
import log from 'app/lib/log';
import pkg from '../../package.json';

const webroot = '/';

const settings = {
  error: {
    // The flag is set to true if the workspace settings have become corrupted or invalid.
    // @see store/index.js
    corruptedWorkspaceSettings: false
  },
  name: pkg.name,
  productName: pkg.productName,
  version: pkg.version,
  webroot: webroot,
  log: {
    level: 'warn' // trace, debug, info, warn, error
  },
  analytics: {
    trackingId: process.env.TRACKING_ID,
  },
  i18next: {
    compatibilityJSON: 'v4',

    lowerCaseLng: true,

    // logs out more info (console)
    debug: false,

    // language to lookup key if not found on set language
    fallbackLng: 'en',

    // string or array of namespaces
    ns: [
      'controller', // Grbl|Smoothie|TinyG
      'gcode', // G-code
      'resource' // default
    ],
    // default namespace used if not passed to translation function
    defaultNS: 'resource',

    // @see webpack.webconfig.xxx.js
    supportedLngs: process.env.LANGUAGES,

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

    // options for language detection
    // https://github.com/i18next/i18next-browser-languageDetector
    detection: {
      // order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage'],

      // keys or params to lookup language from
      lookupQuerystring: 'lang',
      lookupCookie: 'lang',
      lookupLocalStorage: 'lang',

      // cache user language on
      caches: ['localStorage', 'cookie']
    },
    // options for backend
    // https://github.com/i18next/i18next-http-backend
    backend: {
      // path where resources get loaded from
      loadPath: webroot + 'i18n/{{lng}}/{{ns}}.json',

      // path to post missing resources
      addPath: 'api/i18n/sendMissing/{{lng}}/{{ns}}',

      // parse data after it has been fetched
      // i18next-http-backend passes (data, languages, namespaces)
      parse: function(data, languages, namespaces) {
        log.debug(`Loading resource: lng="${languages}", ns="${namespaces}"`);

        // SHA1-hash keys for 'gcode' and 'resource' namespaces
        if (namespaces === 'gcode' || namespaces === 'resource') {
          return mapKeys(JSON.parse(data), (value, key) => sha1(key));
        }

        return JSON.parse(data);
      },

      // allow cross domain requests
      crossDomain: false
    }
  }
};

export default settings;
