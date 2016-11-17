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
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED
} from '../../../api/constants';

class EditAccount extends Component {
    static propTypes = {
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        name: null,
        oldPassword: null,
        newPassword: null
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    get value() {
        return {
            enabled: !!_.get(this.fields.enabled, 'checked'),
            name: _.get(this.fields.name, 'state.value'),
            oldPassword: _.get(this.fields.oldPassword, 'state.value'),
            newPassword: _.get(this.fields.newPassword, 'state.value')
        };
    }
    render() {
        const { state, actions } = this.props;
        const { modalParams } = state;
        const { alertMessage, changePassword = false, enabled, name, password } = modalParams;

        return (
            <Modal
                backdrop
                bsSize="sm"
                onHide={actions.closeModal}
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Edit Account')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertMessage &&
                    <Notifications bsStyle="danger" onDismiss={actions.clearModalAlert}>
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
                                        defaultChecked={enabled}
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
                                    value={name}
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={['required']}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{changePassword ? i18n._('Old Password') : i18n._('Password')}</label>
                                <div className="clearfix">
                                    <Validation.components.Input
                                        ref={node => {
                                            this.fields.oldPassword = node;
                                        }}
                                        type="password"
                                        name="oldPassword"
                                        value={changePassword ? '' : password}
                                        className={classNames(
                                            'form-control',
                                            styles.formControl,
                                            styles.short
                                        )}
                                        containerClassName="pull-left"
                                        validations={changePassword ? ['required'] : []}
                                        disabled={!changePassword}
                                    />
                                    {!changePassword &&
                                    <button
                                        type="button"
                                        className="btn btn-default pull-left"
                                        onClick={() => {
                                            actions.updateModalParams({ changePassword: true });
                                        }}
                                    >
                                        {i18n._('Change Password')}
                                    </button>
                                    }
                                </div>
                            </div>
                            {changePassword &&
                            <div className={styles.formGroup}>
                                <label>{i18n._('New Password')}</label>
                                <Validation.components.Input
                                    ref={node => {
                                        this.fields.newPassword = node;
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
                            }
                            {changePassword &&
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
                            }
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

                            const id = modalParams.id;
                            const { enabled, name, oldPassword, newPassword } = this.value;

                            api.editUser({ id, enabled, name, oldPassword, newPassword })
                                .then((res) => {
                                    actions.closeModal();
                                    actions.fetchData();
                                })
                                .catch((res) => {
                                    const fallbackMsg = i18n._('An unexpected error has occurred.');
                                    const msg = {
                                        [ERR_CONFLICT]: i18n._('The account name is already being used. Choose another name.'),
                                        [ERR_PRECONDITION_FAILED]: i18n._('Passwords do not match.')
                                    }[res.status] || fallbackMsg;

                                    actions.showModalAlert(msg);
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

export default EditAccount;
