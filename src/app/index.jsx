/* eslint import/no-dynamic-require: 0 */
import chainedFunction from 'chained-function';
import GoogleAnalytics4 from 'react-ga4';
import moment from 'moment';
import pubsub from 'pubsub-js';
import qs from 'qs';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  HashRouter as Router,
  Route
} from 'react-router-dom';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import XHR from 'i18next-xhr-backend';
import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import { Provider as GridSystemProvider } from 'app/components/GridSystem';
import api from 'app/api';
import settings from './config/settings';
import portal from './lib/portal';
import controller from './lib/controller';
import i18n from './lib/i18n';
import log from './lib/log';
import series from './lib/promise-series';
import promisify from './lib/promisify';
import * as user from './lib/user';
import store from './store';
import defaultState from './store/defaultState';
import App from './containers/App';
import Login from './containers/Login';
import Anchor from './components/Anchor';
import { Button } from './components/Buttons';
import ModalTemplate from './components/ModalTemplate';
import Modal from './components/Modal';
import ProtectedRoute from './components/ProtectedRoute';
import Space from './components/Space';
import './styles/vendor.styl';
import './styles/app.styl';

const renderPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  ReactDOM.render(
    <GridSystemProvider
      breakpoints={[576, 768, 992, 1200]}
      containerWidths={[540, 720, 960, 1140]}
      columns={12}
      gutterWidth={0}
      layout="floats"
    >
      <Router>
        <div>
          <Route path="/login" component={Login} />
          <ProtectedRoute path="/" component={App} />
        </div>
      </Router>
    </GridSystemProvider>,
    container
  );
};

series([
  () => {
    const obj = qs.parse(window.location.search.slice(1));
    const level = {
      trace: TRACE,
      debug: DEBUG,
      info: INFO,
      warn: WARN,
      error: ERROR
    }[obj.log_level || settings.log.level];
    log.setLevel(level);
  },
  () => promisify(next => {
    i18next
      .use(XHR)
      .use(LanguageDetector)
      .init(settings.i18next, (t) => {
        next();
      });
  })(),
  () => promisify(next => {
    const locale = i18next.language;
    if (locale === 'en') {
      next();
      return;
    }

    require('bundle-loader!moment/locale/' + locale)(() => {
      log.debug(`moment: locale=${locale}`);
      moment().locale(locale);
      next();
    });
  })(),
  () => promisify(next => {
    const token = store.get('session.token');
    user.signin({ token: token })
      .then(async ({ authenticated, token }) => {
        if (authenticated) {
          try {
            const res = await api.getState();
            const { allowAnonymousUsageDataCollection } = res.body || {};
            if (allowAnonymousUsageDataCollection && !GoogleAnalytics4.isInitialized) {
              GoogleAnalytics4.initialize([
                {
                  trackingId: settings.analytics.trackingId,
                  gaOptions: {
                    cookieDomain: 'none'
                  }
                },
              ]);
            }
          } catch (error) {
            log.error('Error initializing Google Analytics:', error);
          }

          log.debug('Create and establish a WebSocket connection');

          const host = '';
          const options = {
            query: 'token=' + token
          };
          controller.connect(host, options, () => {
            // @see "src/web/containers/Login/Login.jsx"
            next();
          });
          return;
        }
        next();
      });
  })(),
]).then(async () => {
  log.info(`${settings.productName} ${settings.version}`);

  // Cross-origin communication
  window.addEventListener('message', (event) => {
    // TODO: event.origin

    const { token = '', action } = { ...event.data };

    // Token authentication
    if (token !== store.get('session.token')) {
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

  { // Prevent browser from loading a drag-and-dropped file
    // @see http://stackoverflow.com/questions/6756583/prevent-browser-from-loading-a-drag-and-dropped-file
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    }, false);

    window.addEventListener('drop', (e) => {
      e.preventDefault();
    }, false);
  }

  { // Hide loading
    const loading = document.getElementById('loading');
    loading && loading.remove();
  }

  { // Change backgrond color after loading complete
    const body = document.querySelector('body');
    body.style.backgroundColor = '#222'; // sidebar background color
  }

  if (settings.error.corruptedWorkspaceSettings) {
    const text = await store.getConfig(); // async
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const filename = `${settings.name}-${settings.version}.json`;

    await portal(({ onClose }) => (
      <Modal
        onClose={onClose}
        disableOverlay={true}
        showCloseButton={false}
      >
        <Modal.Body>
          <ModalTemplate type="error">
            <h5>{i18n._('Corrupted workspace settings')}</h5>
            <p>{i18n._('The workspace settings have become corrupted or invalid. Click Restore Defaults to restore default settings and continue.')}</p>
            <div>
              <Anchor
                href={url}
                download={filename}
              >
                <i className="fa fa-download" />
                <Space width="4" />
                {i18n._('Download workspace settings')}
              </Anchor>
            </div>
          </ModalTemplate>
        </Modal.Body>
        <Modal.Footer>
          <Button
            btnStyle="danger"
            onClick={chainedFunction(
              async () => {
                // Reset to default state
                store.state = defaultState;

                // Persist data locally
                await store.persist(); // async
              },
              onClose
            )}
          >
            {i18n._('Restore Defaults')}
          </Button>
        </Modal.Footer>
      </Modal>
    ));
  }

  renderPage();
}).catch(err => {
  log.error(err);
});
