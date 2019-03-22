import _ from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from '../../../components/Modal';
import { ToastNotification } from '../../../components/Notifications';
import Space from '../../../components/Space';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { Form, Input } from '../../../components/Validation';
import i18n from '../../../lib/i18n';
import * as validations from '../../../lib/validations';
import styles from '../form.styl';

const Axis = ({ value, sub }) => (
    <div>{value}<sub style={{ marginLeft: 2 }}>{sub}</sub></div>
);

class UpdateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
    };

    get value() {
        const {
            name,
            xmin,
            xmax,
            ymin,
            ymax,
            zmin,
            zmax,
        } = this.form.getValues();

        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
            name,
            xmin,
            xmax,
            ymin,
            ymax,
            zmin,
            zmax,
        };
    }
    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const {
            alertMessage,
            enabled,
            name,
            xmin,
            xmax,
            ymin,
            ymax,
            zmin,
            zmax,
        } = modal.params;

        return (
            <Modal size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Machine Profiles')}
                        <Space width="8" />
                        &rsaquo;
                        <Space width="8" />
                        {i18n._('Update')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertMessage &&
                    <ToastNotification
                        style={{ margin: '-16px -24px 10px -24px' }}
                        type="error"
                        onDismiss={() => {
                            actions.updateModalParams({ alertMessage: '' });
                        }}
                    >
                        {alertMessage}
                    </ToastNotification>
                    }
                    <Form
                        ref={node => {
                            this.form = node;
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
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
                            <label>{i18n._('Name')}</label>
                            <Input
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
                            <label><Axis value="X" sub="min" /></label>
                            <Input
                                type="number"
                                name="xmin"
                                value={String(xmin)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Axis value="X" sub="max" /></label>
                            <Input
                                type="number"
                                name="xmax"
                                value={String(xmax)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Axis value="Y" sub="min" /></label>
                            <Input
                                type="number"
                                name="ymin"
                                value={String(ymin)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Axis value="Y" sub="max" /></label>
                            <Input
                                type="number"
                                name="ymax"
                                value={String(ymax)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Axis value="Z" sub="min" /></label>
                            <Input
                                type="number"
                                name="zmin"
                                value={String(zmin)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label><Axis value="Z" sub="max" /></label>
                            <Input
                                type="number"
                                name="zmax"
                                value={String(zmax)}
                                className={classNames(
                                    'form-control',
                                    styles.formControl,
                                    styles.short
                                )}
                            />
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
                        onClick={() => {
                            this.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                const { id } = modal.params;
                                const { enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = this.value;
                                const forceReload = true;

                                actions.updateRecord(id, {
                                    enabled,
                                    name,
                                    xmin: Number(xmin) || 0,
                                    xmax: Number(xmax) || 0,
                                    ymin: Number(ymin) || 0,
                                    ymax: Number(ymax) || 0,
                                    zmin: Number(zmin) || 0,
                                    zmax: Number(zmax) || 0,
                                }, forceReload);
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
