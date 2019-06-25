import get from 'lodash/get';
import includes from 'lodash/includes';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Form, Select, Textarea } from 'app/components/Validation';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
import ToggleSwitch from 'app/components/ToggleSwitch';
import i18n from 'app/lib/i18n';
import * as validations from 'app/lib/validations';
import styles from '../form.styl';

const SYSTEM_EVENTS = [
    // The following events are only available with system trigger (i.e. scripts)
    'startup',
    'port:open',
    'port:close'
];

class UpdateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
        event: null,
        trigger: null,
        commands: null
    };

    get value() {
        const {
            event,
            trigger,
            commands
        } = this.form.getValues();

        return {
            enabled: !!get(this.fields.enabled, 'state.checked'),
            event: event,
            trigger: trigger,
            commands: commands
        };
    }

    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const disableTriggerOptions = includes(SYSTEM_EVENTS, modal.params.event);
        let sampleCommands = '';
        if (modal.params.trigger === 'system') {
            sampleCommands = [
                'sleep 5'
            ].join('\n');
        } else if (modal.params.trigger === 'gcode') {
            sampleCommands = [
                'G21  ; Set units to mm',
                'G90  ; Absolute positioning',
                'G1 Z1 F500  ; Move to clearance level'
            ].join('\n');
        }

        return (
            <Modal disableOverlay size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Event')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modal.params.alertMessage && (
                        <ToastNotification
                            style={{ margin: '-16px -24px 10px -24px' }}
                            type="error"
                            onDismiss={() => {
                                actions.updateModalParams({ alertMessage: '' });
                            }}
                        >
                            {modal.params.alertMessage}
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
                                <label>{i18n._('Enabled')}</label>
                                <div>
                                    <ToggleSwitch
                                        ref={node => {
                                            this.fields.enabled = node;
                                        }}
                                        size="sm"
                                        checked={modal.params.enabled}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Event')}</label>
                                <Select
                                    name="event"
                                    value={modal.params.event}
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        let trigger = modal.params.trigger;
                                        if (includes(SYSTEM_EVENTS, value)) {
                                            trigger = 'system'; // system-only events
                                        }
                                        actions.updateModalParams({
                                            event: value,
                                            trigger: trigger
                                        });
                                    }}
                                    validations={[validations.required]}
                                >
                                    <option value="">{i18n._('Choose an event')}</option>
                                    <option value="startup">{i18n._('Startup (System only)')}</option>
                                    <option value="port:open">{i18n._('Open a serial port (System only)')}</option>
                                    <option value="port:close">{i18n._('Close a serial port (System only)')}</option>
                                    <option value="controller:ready">{i18n._('Ready to start')}</option>
                                    <option value="gcode:load">{i18n._('G-code: Load')}</option>
                                    <option value="gcode:unload">{i18n._('G-code: Unload')}</option>
                                    <option value="gcode:start">{i18n._('G-code: Start')}</option>
                                    <option value="gcode:stop">{i18n._('G-code: Stop')}</option>
                                    <option value="gcode:pause">{i18n._('G-code: Pause')}</option>
                                    <option value="gcode:resume">{i18n._('G-code: Resume')}</option>
                                    <option value="feedhold">{i18n._('Feed Hold')}</option>
                                    <option value="cyclestart">{i18n._('Cycle Start')}</option>
                                    <option value="homing">{i18n._('Homing')}</option>
                                    <option value="sleep">{i18n._('Sleep')}</option>
                                    <option value="macro:run">{i18n._('Run Macro')}</option>
                                    <option value="macro:load">{i18n._('Load Macro')}</option>
                                </Select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Trigger')}</label>
                                <Select
                                    name="trigger"
                                    value={modal.params.trigger}
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    disabled={disableTriggerOptions}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        actions.updateModalParams({
                                            trigger: value
                                        });
                                    }}
                                    validations={[validations.required]}
                                >
                                    <option value="">{i18n._('Choose an trigger')}</option>
                                    <option value="system">{i18n._('System')}</option>
                                    <option value="gcode">{i18n._('G-code')}</option>
                                </Select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Commands')}</label>
                                <Textarea
                                    name="commands"
                                    value={modal.params.commands}
                                    rows="5"
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.long
                                    )}
                                    placeholder={sampleCommands}
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
                        onClick={() => {
                            this.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                const { id } = modal.params;
                                const { enabled, event, trigger, commands } = this.value;
                                const forceReload = true;

                                actions.updateRecord(id, { enabled, event, trigger, commands }, forceReload);
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
