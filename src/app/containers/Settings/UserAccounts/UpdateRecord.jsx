import _ from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
import ToggleSwitch from 'app/components/ToggleSwitch';
import { Form, Input } from 'app/components/Validation';
import i18n from 'app/lib/i18n';
import * as validations from 'app/lib/validations';
import styles from '../form.styl';

class UpdateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        name: null,
        oldPassword: null,
        newPassword: null
    };

    get value() {
        const {
            name,
            oldPassword,
            password: newPassword
        } = this.form.getValues();

        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
            name: name,
            oldPassword: oldPassword,
            newPassword: newPassword
        };
    }

    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const { alertMessage, changePassword = false, enabled, name } = modal.params;

        return (
            <Modal disableOverlay size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Edit Account')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertMessage && (
                        <ToastNotification
                            style={{ margin: '-16px -24px 10px -24px' }}
                            type="error"
                            onDismiss={() => {
                                actions.updateModalParams({ alertMessage: '' });
                            }}
                        >
                            {alertMessage}
                        </ToastNotification>
                    )}
                    <Form
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
                                    <ToggleSwitch
                                        ref={node => {
                                            this.fields.enabled = node;
                                        }}
                                        size="sm"
                                        checked={enabled}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Username')}</label>
                                <Input
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
                                    validations={[validations.required]}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{changePassword ? i18n._('Old Password') : i18n._('Password')}</label>
                                <div className="clearfix">
                                    <Input
                                        ref={node => {
                                            this.fields.oldPassword = node;
                                        }}
                                        type="password"
                                        name="oldPassword"
                                        className={classNames(
                                            'form-control',
                                            { 'pull-left': !changePassword },
                                            styles.formControl,
                                            styles.short
                                        )}
                                        validations={changePassword ? [validations.required] : []}
                                        disabled={!changePassword}
                                    />
                                    {!changePassword && (
                                        <button
                                            type="button"
                                            className="btn btn-default pull-left"
                                            onClick={() => {
                                                actions.updateModalParams({ changePassword: true });
                                            }}
                                        >
                                            {i18n._('Change Password')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {changePassword && (
                                <div className={styles.formGroup}>
                                    <label>{i18n._('New Password')}</label>
                                    <Input
                                        ref={node => {
                                            this.fields.newPassword = node;
                                        }}
                                        type="password"
                                        name="password"
                                        className={classNames(
                                            'form-control',
                                            styles.formControl,
                                            styles.short
                                        )}
                                        validations={[validations.required, validations.password]}
                                    />
                                </div>
                            )}
                            {changePassword && (
                                <div className={styles.formGroup}>
                                    <label>{i18n._('Confirm Password')}</label>
                                    <Input
                                        type="password"
                                        name="confirm"
                                        value=""
                                        className={classNames(
                                            'form-control',
                                            styles.formControl,
                                            styles.short
                                        )}
                                        validations={[validations.required]}
                                    />
                                </div>
                            )}
                        </div>
                    </Form>
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
                            this.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                const { id } = modal.params;
                                const { enabled, name, oldPassword, newPassword } = this.value;
                                const forceReload = true;

                                actions.updateRecord(id, { enabled, name, oldPassword, newPassword }, forceReload);
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

export default UpdateRecord;
