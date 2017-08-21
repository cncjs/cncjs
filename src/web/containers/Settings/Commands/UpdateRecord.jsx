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

class UpdateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        title: null,
        commands: null
    };

    get value() {
        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
            title: _.get(this.fields.title, 'state.value'),
            commands: _.get(this.fields.commands, 'state.value')
        };
    }
    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const {
            alertMessage,
            enabled,
            title,
            commands
        } = modal.params;

        return (
            <Modal
                onClose={actions.closeModal}
                size="sm"
            >
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Commands')}
                        <span className="space" />
                        &rsaquo;
                        <span className="space" />
                        {i18n._('Update')}
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
                                <label>{i18n._('Enabled')}</label>
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
                                <label>{i18n._('Title')}</label>
                                <Validation.components.Input
                                    ref={node => {
                                        this.fields.title = node;
                                    }}
                                    type="text"
                                    name="title"
                                    value={title}
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={['required']}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Commands')}</label>
                                <Validation.components.Textarea
                                    ref={node => {
                                        this.fields.commands = node;
                                    }}
                                    name="commands"
                                    value={commands}
                                    rows="5"
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.long
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
                        onClick={() => {
                            this.form.validateAll();

                            if (Object.keys(this.form.state.errors).length > 0) {
                                return;
                            }

                            const { id } = modal.params;
                            const { enabled, title, commands } = this.value;
                            const forceReload = true;

                            actions.updateRecord(id, { enabled, title, commands }, forceReload);
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
