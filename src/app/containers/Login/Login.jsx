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
      clearFieldError: (field) => {
        // Only ever clears, and only the field being typed into. Re-validating
        // on every keystroke would tell someone their username is missing
        // while they are still typing its first letter.
        this.setState(state => (state.fieldErrors[field]
          ? { fieldErrors: { ...state.fieldErrors, [field]: '' } }
          : null));
      },
      handleSignIn: (event) => {
        event.preventDefault();

        const name = this.fields.name.value;
        const password = this.fields.password.value;

        const fieldErrors = {
          name: name ? '' : i18n._('Username is required'),
          password: password ? '' : i18n._('Password is required')
        };

        if (fieldErrors.name || fieldErrors.password) {
          // Nothing worth asking the server. It would answer "Authentication
          // failed", which is true and useless: it cannot say which field was
          // left blank, and that is the only thing wrong here.
          this.setState({ alertMessage: '', fieldErrors });
          return;
        }

        this.setState({
          fieldErrors,
          authenticating: true,
          redirectToReferrer: false
        });

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
        fieldErrors: {
          name: '',
          password: ''
        },
        authenticating: false,
        redirectToReferrer: false
      };
    }

    render() {
      const { from } = this.props.location.state || { from: { pathname: '/' } };
      const state = { ...this.state };
      const actions = { ...this.actions };
      const { alertMessage, authenticating, fieldErrors } = state;
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
          <Tile title={i18n._('Sign in to {{name}}', { name: settings.productName })}>
            <Form onSubmit={actions.handleSignIn}>
              {alertMessage && (
                <Alert
                  title={i18n._('Error')}
                  onDismiss={actions.clearAlertMessage}
                  dismissLabel={i18n._('Dismiss')}
                >
                  {alertMessage}
                </Alert>
              )}
              <TextField
                id="login-name"
                label={i18n._('Username')}
                type="text"
                autoComplete="username"
                error={!!fieldErrors.name || !!alertMessage}
                helperText={fieldErrors.name}
                onChange={() => actions.clearFieldError('name')}
                inputRef={node => {
                  this.fields.name = node;
                }}
              />
              <TextField
                id="login-password"
                label={i18n._('Password')}
                type="password"
                autoComplete="current-password"
                error={!!fieldErrors.password || !!alertMessage}
                helperText={fieldErrors.password}
                onChange={() => actions.clearFieldError('password')}
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
