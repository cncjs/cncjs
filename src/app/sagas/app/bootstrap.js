/* eslint import/no-dynamic-require: 0 */
import I18nextHTTPBackend from 'i18next-http-backend';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
import mapKeys from 'lodash/mapKeys';
import moment from 'moment';
import pubsub from 'pubsub-js';
import qs from 'qs';
import { initReactI18next } from 'react-i18next';
import { all, call } from 'redux-saga/effects';
import sha1 from 'sha1';
import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import env from 'app/config/env';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import controller from 'app/lib/controller';
import x from 'app/lib/json-stringify';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import config from 'app/store/config';

export function* init() {
  // sequential
  yield call(changeLogLevel);
  yield call(initI18next);

  // parallel
  yield all([
    call(initMomentLocale),
    call(authenticateSessionToken),
    call(enableCrossOriginCommunication),
  ]);
}

export function* process() {
  yield null;
}

const changeLogLevel = () => {
  const obj = qs.parse(window.location.search.slice(1));
  const level = {
    trace: TRACE,
    debug: DEBUG,
    info: INFO,
    warn: WARN,
    error: ERROR
  }[obj.log_level || settings.log.level];
  log.setLevel(level);
};

const initI18next = () => new Promise((resolve, reject) => {
  // https://www.i18next.com/overview/configuration-options
  const i18nextSettings = {
    compatibilityJSON: 'v3',

    /**
     * Logging
     */
    debug: false,

    /**
     * Languages, namespaces, and resources
     */
    //resources, // keep as is
    //lng, // keep as is
    fallbackLng: 'en',
    supportedLngs: JSON.parse(env.LANGUAGES), // @see webpack.webconfig.xxx.js
    //nonExplicitSupportedLngs, // keep as is
    load: 'currentOnly',
    preload: [],
    lowerCaseLng: true,
    //cleanCode // keep as is
    ns: [
      'controller', // Grbl|Marlin|Smoothie|TinyG
      'gcode', // G-code
      'resource' // default
    ],
    defaultNS: 'resource',
    fallbackNS: false,
    //partialBundledLanguages, // keep as is

    /**
     * Translation defaults
     */
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    },

    /**
     * Others
     */
    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',

    /**
     * Plugin options
     * https://www.i18next.com/overview/plugins-and-utils
     */
    detection: { // options for language detection
      // order and from where user language should be detected
      // 'config-store' is a custom plugin and should be placed at the start of the array
      order: ['config-store', 'querystring', 'cookie', 'localStorage'],

      // keys or params to lookup language from
      lookupQuerystring: 'lang',
      lookupCookie: 'lang',
      lookupLocalStorage: 'lang',

      // cache user language on
      caches: ['cookie', 'localStorage'],
    },
    backend: { // options for backend
      // path where resources get loaded from
      loadPath: settings.webroot + 'i18n/{{lng}}/{{ns}}.json',

      // path to post missing resources
      addPath: 'api/i18n/sendMissing/{{lng}}/{{ns}}',

      // your backend server supports multiloading
      // /locales/resources.json?lng=de+en&ns=ns1+ns2
      allowMultiLoading: false,

      // parse data after it has been fetched
      parse: function(data, language, namespace) {
        log.debug(`Loading resource: language=${x(language)}, namespace=${x(namespace)}`);

        if (namespace === 'gcode' || namespace === 'resource') {
          return mapKeys(JSON.parse(data), (value, key) => sha1(key));
        }

        return JSON.parse(data);
      },

      // allow cross domain requests
      crossDomain: false,
    },
    cache: { // options for a cache layer in backends
    },
  };

  const languageDetector = new I18nextBrowserLanguageDetector();
  languageDetector.addDetector({
    name: 'config-store',
    lookup(options) {
      const found = config.get('settings.language');
      return found;
    },
  });

  i18next
    .use(I18nextHTTPBackend)
    .use(languageDetector)
    .use(initReactI18next)
    .init(i18nextSettings, (err, t) => {
      if (err) {
        reject(err);
        return;
      }

      if (i18next.language) {
        // Update lang attribute
        const html = document.querySelector('html');
        html.setAttribute('lang', i18next.language);
      }

      resolve();
    });
});

const initMomentLocale = () => new Promise(resolve => {
  const lng = i18next.language;

  if (!lng || lng === 'en') {
    log.debug(`moment: lng=${lng}`);
    resolve();
    return;
  }

  const bundle = require('bundle-loader!moment/locale/' + lng);
  bundle(() => {
    log.debug(`moment: lng=${lng}`);
    moment().locale(lng);

    resolve();
  });
});

const authenticateSessionToken = () => new Promise(resolve => {
  const token = config.get('session.token');
  user.signin({ token: token })
    .then(({ authenticated, token }) => {
      if (authenticated) {
        log.debug('Create and establish a WebSocket connection');

        const host = '';
        const options = {
          query: 'token=' + token
        };
        controller.connect(host, options, () => {
          // @see "app/containers/Login/Login.jsx"
          resolve();
        });
        return;
      }
      resolve();
    });
});

const enableCrossOriginCommunication = () => {
  // Cross-origin communication
  window.addEventListener('message', (event) => {
    // TODO: event.origin

    const { token = '', action } = { ...event.data };

    // Token authentication
    if (token !== config.get('session.token')) {
      log.warn(`Received a message with an unauthorized token (${token}).`);
      return;
    }

    const { type, payload } = { ...action };
    if (type === 'connect') {
      pubsub.publish('message:connect', payload);
    } else if (type === 'resize') {
      pubsub.publish('message:resize', payload);
    } else {
      log.warn(`No valid action type (${type}) specified in the message.`);
    }
  }, false);
};
