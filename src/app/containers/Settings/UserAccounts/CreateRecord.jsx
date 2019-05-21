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

class CreateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        name: null,
        password: null
    };

    get value() {
        const {
            name,
            password
        } = this.form.getValues();

        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
            name: name,
            password: password
        };
    }

    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const { alertMessage } = modal.params;

        return (
            <Modal disableOverlay size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('New Account')}
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
                                        checked={true}
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
                                    value=""
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={[validations.required]}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Password')}</label>
                                <Input
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
                                    validations={[validations.required, validations.password]}
                                />
                            </div>
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

                                const { enabled, name, password } = this.value;

                                actions.createRecord({ enabled, name, password });
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

export default CreateRecord;
