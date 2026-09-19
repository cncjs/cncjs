import qs from 'qs';
import React, { PureComponent } from 'react';
import GoogleAnalytics4 from 'react-ga4';
import { withRouter, Redirect } from 'react-router-dom';
import api from 'app/api';
import Alert from 'app/components/Alert';
import Button from 'app/components/Button';
import Form from 'app/components/Form';
import Link from 'app/components/Link';
import Screen from 'app/components/Screen';
import TextField from 'app/components/TextField';
import Tile from 'app/components/Tile';
import settings from 'app/config/settings';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import store from 'app/store';

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
              auth: { token }
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
        <Screen>
          {alertMessage && (
            <Alert
              title={i18n._('Error')}
              onDismiss={actions.clearAlertMessage}
              dismissLabel={i18n._('Dismiss')}
            >
              {alertMessage}
            </Alert>
          )}
          <Tile title={i18n._('Sign in to {{name}}', { name: settings.productName })}>
            <Form onSubmit={actions.handleSignIn}>
              <TextField
                id="login-name"
                label={i18n._('Username')}
                type="text"
                autoComplete="username"
                inputRef={node => {
                  this.fields.name = node;
                }}
              />
              <TextField
                id="login-password"
                label={i18n._('Password')}
                type="password"
                autoComplete="current-password"
                inputRef={node => {
                  this.fields.password = node;
                }}
              />
              <Button type="submit" fullWidth loading={authenticating}>
                {i18n._('Sign In')}
              </Button>
              <Link href={forgotPasswordLink}>
                {i18n._('Forgot your password?')}
              </Link>
            </Form>
          </Tile>
        </Screen>
      );
    }
}

export default withRouter(Login);
