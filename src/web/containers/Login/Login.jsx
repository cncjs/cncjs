import classNames from 'classnames';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { withRouter } from 'react-router';
import Anchor from '../../components/Anchor';
import Notifications from '../../components/Notifications';
import settings from '../../config/settings';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import user from '../../lib/user';
import styles from './index.styl';

class Login extends Component {
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
                authenticating: true
            });

            const name = this.fields.name.value;
            const password = this.fields.password.value;

            user.signin({ name, password })
                .then(({ authenticated }) => {
                    if (!authenticated) {
                        this.setState({
                            alertMessage: i18n._('Authentication failed.'),
                            authenticating: false
                        });
                        return;
                    }

                    this.setState({
                        alertMessage: '',
                        authenticating: false
                    });

                    log.debug('Create and establish a WebSocket connection');
                    controller.connect(); // @see "src/web/index.jsx"

                    const { location, router } = this.props;
                    if (location.state && location.state.nextPathname) {
                        router.replace(location.state.nextPathname);
                    } else {
                        router.replace('/');
                    }
                });
        }
    };
    fields = {
        name: null,
        password: null
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    getDefaultState() {
        return {
            alertMessage: '',
            authenticating: false
        };
    }
    render() {
        const state = { ...this.state };
        const actions = { ...this.actions };
        const { alertMessage, authenticating } = state;
        const forgotPasswordLink = 'https://cnc.js.org/docs/faq/#forgot-your-password';

        return (
            <div className={styles.container}>
                <div className={styles.login}>
                    <div className={styles.logo}>
                        <img src="images/logo-square-256x256.png" role="presentation" />
                    </div>
                    <div className={styles.title}>
                        {i18n._('Sign in to {{name}}', { name: settings.name })}
                    </div>
                    {alertMessage &&
                    <Notifications bsStyle="danger" onDismiss={actions.clearAlertMessage}>
                        {alertMessage}
                    </Notifications>
                    }
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
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-spin': authenticating },
                                        { 'fa-circle-o-notch': authenticating },
                                        { 'fa-sign-in': !authenticating }
                                    )}
                                />
                                <span className="space" />
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
