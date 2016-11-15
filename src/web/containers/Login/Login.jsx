import classNames from 'classnames';
import React, { Component } from 'react';
import { withRouter } from 'react-router';
import Notifications from '../../components/Notifications';
import user from '../../lib/user';
import i18n from '../../lib/i18n';
import store from '../../store';
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
                    const { location, router } = this.props;
                    const msg = authenticated ? '' : i18n._('Authentication failed.');

                    this.setState({
                        alertMessage: msg,
                        authenticating: false
                    });

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
        const name = store.get('session.name');

        return (
            <div className={styles.container}>
                <div className={styles.login}>
                    <div className={styles.logo}>
                        <img src="logo.png" alt="" />
                    </div>
                    <div className={styles.title}>
                        {i18n._('Sign in to cnc')}
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
                                placeholder={i18n._('Name')}
                                defaultValue={name}
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
                    </form>
                </div>
            </div>
        );
    }
}

export default withRouter(Login);
