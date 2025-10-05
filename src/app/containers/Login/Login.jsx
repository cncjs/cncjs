import cx from 'classnames';
import qs from 'qs';
import React, { PureComponent } from 'react';
import GoogleAnalytics4 from 'react-ga4';
import { withRouter, Redirect } from 'react-router-dom';
import api from 'app/api';
import Anchor from 'app/components/Anchor';
import { Notification } from 'app/components/Notifications';
import Space from 'app/components/Space';
import settings from 'app/config/settings';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import store from 'app/store';
import styles from './index.styl';

class Login extends PureComponent {
    static propTypes = {
      ...withRouter.propTypes
    };

    state = this.getDefaultState();

    actions = {
      showAlertMessage: (msg) => {
        this.setState({ alertMessage: msg });
      },
      clearAlertMessage: () => {
        this.setState({ alertMessage: '' });
      },
      handleSignIn: (event) => {
        event.preventDefault();

        this.setState({
          alertMessage: '',
          authenticating: true,
          redirectToReferrer: false
        });

        const name = this.fields.name.value;
        const password = this.fields.password.value;

        user.signin({ name, password })
          .then(async ({ authenticated }) => {
            if (!authenticated) {
              this.setState({
                alertMessage: i18n._('Authentication failed.'),
                authenticating: false,
                redirectToReferrer: false
              });
              return;
            }

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

            const token = store.get('session.token');
            const host = '';
            const options = {
              query: 'token=' + token
            };
            controller.connect(host, options, () => {
              // @see "src/web/index.jsx"
              this.setState({
                alertMessage: '',
                authenticating: false,
                redirectToReferrer: true
              });
            });
          });
      }
    };

    fields = {
      name: null,
      password: null
    };

    getDefaultState() {
      return {
        alertMessage: '',
        authenticating: false,
        redirectToReferrer: false
      };
    }

    render() {
      const { from } = this.props.location.state || { from: { pathname: '/' } };
      const state = { ...this.state };
      const actions = { ...this.actions };
      const { alertMessage, authenticating } = state;
      const forgotPasswordLink = 'https://cnc.js.org/docs/faq/#forgot-your-password';

      if (state.redirectToReferrer) {
        const query = qs.parse(window.location.search, { ignoreQueryPrefix: true });
        if (query && query.continue) {
          log.debug(`Navigate to "${query.continue}"`);

          window.location = query.continue;

          return null;
        }

        log.debug(`Redirect from "/login" to "${from.pathname}"`);

        return (
          <Redirect to={from} />
        );
      }

      return (
        <div className={styles.container}>
          {alertMessage && (
            <Notification
              style={{ marginBottom: 10 }}
              type="error"
              onDismiss={actions.clearAlertMessage}
            >
              <div><strong>{i18n._('Error')}</strong></div>
              <div>{alertMessage}</div>
            </Notification>
          )}
          <div className={styles.login}>
            <div className={styles.logo}>
              <img src="images/logo-square-256x256.png" alt="" />
            </div>
            <div className={styles.title}>
              {i18n._('Sign in to {{name}}', { name: settings.productName })}
            </div>
            <form className={styles.form}>
              <div className="form-group">
                <input
                  ref={node => {
                    this.fields.name = node;
                  }}
                  type="text"
                  className="form-control"
                  placeholder={i18n._('Username')}
                />
              </div>
              <div className="form-group">
                <input
                  ref={node => {
                    this.fields.password = node;
                  }}
                  type="password"
                  className="form-control"
                  placeholder={i18n._('Password')}
                />
              </div>
              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-block btn-primary"
                  onClick={this.actions.handleSignIn}
                >
                  <i
                    className={cx(
                      'fa',
                      'fa-fw',
                      { 'fa-spin': authenticating },
                      { 'fa-circle-o-notch': authenticating },
                      { 'fa-sign-in': !authenticating }
                    )}
                  />
                  <Space width="8" />
                  {i18n._('Sign In')}
                </button>
              </div>
              <p>
                <Anchor href={forgotPasswordLink}>
                  {i18n._('Forgot your password?')}
                </Anchor>
              </p>
            </form>
          </div>
        </div>
      );
    }
}

export default withRouter(Login);
