/* eslint import/no-dynamic-require: 0 */
import moment from 'moment';
import pubsub from 'pubsub-js';
import qs from 'qs';
import { all, call } from 'redux-saga/effects';
import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import configStore from 'app/store/config';

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
  i18next
    .init(settings.i18next, (err, t) => {
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
  const token = configStore.get('session.token');
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
    if (token !== configStore.get('session.token')) {
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
