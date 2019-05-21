import _get from 'lodash/get';
import qs from 'qs';
import React, { Fragment, PureComponent } from 'react';
import { Form, Field } from 'react-final-form';
import { withRouter, Redirect } from 'react-router-dom';
import Anchor from 'app/components/Anchor';
import { Button } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import Input from 'app/components/FormControl/Input';
import { Notification } from 'app/components/Notifications';
import Space from 'app/components/Space';
import settings from 'app/config/settings';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import config from 'app/store/config';
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
        }
    };

    handleFormSubmit = (values, form) => {
        this.setState({
            alertMessage: '',
            authenticating: true,
            redirectToReferrer: false
        });

        const name = _get(values, 'name');
        const password = _get(values, 'password');

        user.signin({ name, password })
            .then(({ authenticated }) => {
                if (!authenticated) {
                    this.setState({
                        alertMessage: i18n._('Authentication failed.'),
                        authenticating: false,
                        redirectToReferrer: false
                    });
                    return;
                }

                log.debug('Create and establish a WebSocket connection');

                const token = config.get('session.token');
                const host = '';
                const options = {
                    query: 'token=' + token
                };
                controller.connect(host, options, () => {
                    // @see "app/index.jsx"
                    this.setState({
                        alertMessage: '',
                        authenticating: false,
                        redirectToReferrer: true
                    });
                });
            });
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
            <div
                style={{
                    backgroundColor: '#fff',
                    height: '100vh',
                }}
            >
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
                <Container
                    style={{
                        width: 300,
                        margin: '0 auto',
                        paddingTop: 40,
                    }}
                >
                    <div className={styles.logo}>
                        <img src="images/logo-square-256x256.png" alt="" />
                    </div>
                    <div className={styles.title}>
                        {i18n._('Sign in to {{name}}', { name: settings.productName })}
                    </div>
                    <Form
                        onSubmit={this.handleFormSubmit}
                        render={({ handleSubmit, values }) => (
                            <Fragment>
                                <FormGroup>
                                    <Field name="name">
                                        {({ input, meta }) => (
                                            <Fragment>
                                                <Input
                                                    {...input}
                                                    type="text"
                                                    placeholder={i18n._('Username')}
                                                />
                                                {meta.touched && meta.error && <div>{meta.error}</div>}
                                            </Fragment>
                                        )}
                                    </Field>
                                </FormGroup>
                                <FormGroup>
                                    <Field name="password">
                                        {({ input, meta }) => (
                                            <Fragment>
                                                <Input
                                                    {...input}
                                                    type="password"
                                                    placeholder={i18n._('Password')}
                                                />
                                                {meta.touched && meta.error && <div>{meta.error}</div>}
                                            </Fragment>
                                        )}
                                    </Field>
                                </FormGroup>
                                <FormGroup>
                                    <Row
                                        style={{
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Col width="auto">
                                            <Anchor href={forgotPasswordLink}>
                                                {i18n._('Forgot your password?')}
                                            </Anchor>
                                        </Col>
                                        <Col width="auto">
                                            <Button
                                                btnStyle="primary"
                                                onClick={handleSubmit}
                                            >
                                                {authenticating &&
                                                <FontAwesomeIcon icon="circle-notch" spin />
                                                }
                                                {!authenticating &&
                                                <FontAwesomeIcon icon="sign-in-alt" />
                                                }
                                                <Space width={8} />
                                                {i18n._('Sign In')}
                                            </Button>
                                        </Col>
                                    </Row>
                                </FormGroup>
                            </Fragment>
                        )}
                    />
                </Container>
            </div>
        );
    }
}

export default withRouter(Login);
