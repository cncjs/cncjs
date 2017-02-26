import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import Toggle from 'react-toggle';
import api from '../../../api';
import Modal from '../../../components/Modal';
import Notifications from '../../../components/Notifications';
import i18n from '../../../lib/i18n';
import Validation from '../../../lib/react-validation';
import styles from '../form.styl';
import {
    ERR_CONFLICT
} from '../../../api/constants';

class AddAccount extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        name: null,
        password: null
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    get value() {
        return {
            enabled: !!_.get(this.fields.enabled, 'checked'),
            name: _.get(this.fields.name, 'state.value'),
            password: _.get(this.fields.password, 'state.value')
        };
    }
    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const { alertMessage } = modal.params;

        return (
            <Modal
                onClose={actions.closeModal}
                size="sm"
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Add New Account')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertMessage &&
                    <Notifications
                        bsStyle="danger"
                        onDismiss={() => {
                            actions.updateModalParams({ alertMessage: '' });
                        }}
                    >
                        {alertMessage}
                    </Notifications>
                    }
                    <Validation.components.Form
                        ref={node => {
                            this.form = node;
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <div className={styles.formFields}>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Account status')}</label>
                                <div>
                                    <Toggle
                                        ref={node => {
                                            this.fields.enabled = node ? ReactDOM.findDOMNode(node).querySelector('input') : null;
                                        }}
                                        defaultChecked={true}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Name')}</label>
                                <Validation.components.Input
                                    ref={node => {
                                        this.fields.name = node;
                                    }}
                                    type="text"
                                    name="name"
                                    value=""
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={['required']}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Password')}</label>
                                <Validation.components.Input
                                    ref={node => {
                                        this.fields.password = node;
                                    }}
                                    type="password"
                                    name="password"
                                    value=""
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={['required', 'password']}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Confirm Password')}</label>
                                <Validation.components.Input
                                    type="password"
                                    name="passwordConfirm"
                                    value=""
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={['required']}
                                />
                            </div>
                        </div>
                    </Validation.components.Form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={(event) => {
                            this.form.validateAll();

                            if (Object.keys(this.form.state.errors).length > 0) {
                                return;
                            }

                            const { enabled, name, password } = this.value;
                            api.addUser({ enabled, name, password })
                                .then((res) => {
                                    actions.closeModal();
                                    actions.fetchData();
                                })
                                .catch((res) => {
                                    const fallbackMsg = i18n._('An unexpected error has occurred.');
                                    const msg = {
                                        [ERR_CONFLICT]: i18n._('The account name is already being used. Choose another name.')
                                    }[res.status] || fallbackMsg;

                                    actions.updateModalParams({ alertMessage: msg });
                                });
                        }}
                    >
                        {i18n._('OK')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default AddAccount;
