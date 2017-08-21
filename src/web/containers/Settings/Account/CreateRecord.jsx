import _ from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from '../../../components/Modal';
import Notifications from '../../../components/Notifications';
import ToggleSwitch from '../../../components/ToggleSwitch';
import i18n from '../../../lib/i18n';
import Validation from '../../../lib/react-validation';
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
        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
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
                    <Modal.Title>
                        {i18n._('Account')}
                        <span className="space" />
                        &rsaquo;
                        <span className="space" />
                        {i18n._('New')}
                    </Modal.Title>
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

                            actions.createRecord({ enabled, name, password });
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
