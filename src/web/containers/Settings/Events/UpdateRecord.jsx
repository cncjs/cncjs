import get from 'lodash/get';
import includes from 'lodash/includes';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from '../../../components/Modal';
import Notifications from '../../../components/Notifications';
import ToggleSwitch from '../../../components/ToggleSwitch';
import i18n from '../../../lib/i18n';
import Validation from '../../../lib/react-validation';
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
        return {
            enabled: !!get(this.fields.enabled, 'state.checked'),
            event: get(this.fields.event, 'state.value'),
            trigger: get(this.fields.trigger, 'state.value'),
            commands: get(this.fields.commands, 'state.value')
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
            <Modal
                onClose={actions.closeModal}
                size="sm"
            >
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Events')}
                        <span className="space" />
                        &rsaquo;
                        <span className="space" />
                        {i18n._('Update')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modal.params.alertMessage &&
                    <Notifications
                        bsStyle="danger"
                        onDismiss={() => {
                            actions.updateModalParams({ alertMessage: '' });
                        }}
                    >
                        {modal.params.alertMessage}
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
                                        checked={modal.params.enabled}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Event')}</label>
                                <Validation.components.Select
                                    ref={node => {
                                        this.fields.event = node;
                                    }}
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
                                    validations={['required']}
                                >
                                    <option value="">{i18n._('Choose an event')}</option>
                                    <option value="startup">{i18n._('Startup (System only)')}</option>
                                    <option value="port:open">{i18n._('Open a serial port (System only)')}</option>
                                    <option value="port:close">{i18n._('Close a serial port (System only)')}</option>
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
                                </Validation.components.Select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Trigger')}</label>
                                <Validation.components.Select
                                    ref={node => {
                                        this.fields.trigger = node;
                                    }}
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
                                    validations={['required']}
                                >
                                    <option value="">{i18n._('Choose an trigger')}</option>
                                    <option value="system">{i18n._('System')}</option>
                                    <option value="gcode">{i18n._('G-code')}</option>
                                </Validation.components.Select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Commands')}</label>
                                <Validation.components.Textarea
                                    ref={node => {
                                        this.fields.commands = node;
                                    }}
                                    name="commands"
                                    value={modal.params.commands}
                                    rows="5"
                                    className={classNames(
                                        'form-control',
                                        styles.formControl,
                                        styles.long
                                    )}
                                    placeholder={sampleCommands}
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
                            const { enabled, event, trigger, commands } = this.value;
                            const forceReload = true;

                            actions.updateRecord(id, { enabled, event, trigger, commands }, forceReload);
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
