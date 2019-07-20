import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import FormGroup from 'app/components/FormGroup';
import Modal from 'app/components/Modal';
import PrismCode from 'app/components/PrismCode';
import ToggleSwitch from 'app/components/ToggleSwitch';
import i18n from 'app/lib/i18n';

class RunProbeModal extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { useTLO } = state;
        const probeCommands = actions.populateProbeCommands();
        const content = probeCommands.join('\n');

        return (
            <Modal size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>{i18n._('Probe')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FormGroup>
                        <ToggleSwitch
                            checked={useTLO}
                            size="sm"
                            onChange={actions.toggleUseTLO}
                        />
                        {i18n._('Apply tool length offset')}
                    </FormGroup>
                    <PrismCode
                        content={content}
                        language="gcode"
                        style={{
                            padding: '8px 12px',
                        }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        btnSize="sm"
                        btnStyle="default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </Button>
                    <Button
                        btnSize="sm"
                        btnStyle="primary"
                        onClick={() => {
                            actions.closeModal();
                            actions.runProbeCommands(probeCommands);
                        }}
                    >
                        {i18n._('Run Probe')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default RunProbeModal;
