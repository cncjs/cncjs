import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Modal from '../../components/Modal';
import ToggleSwitch from '../../components/ToggleSwitch';
import i18n from '../../lib/i18n';

class Preview extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { useTLO } = state;
        const probeCommands = actions.populateProbeCommands();
        const content = probeCommands.join('\n');

        return (
            <Modal onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>{i18n._('Probe')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        <ToggleSwitch
                            checked={useTLO}
                            size="sm"
                            onChange={actions.toggleUseTLO}
                        />
                        {i18n._('Apply the tool length offset for the Z-axis')}
                    </p>
                    <pre style={{ minHeight: 150 }}>
                        <code>{content}</code>
                    </pre>
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
                            actions.closeModal();
                            actions.runProbeCommands(probeCommands);
                        }}
                    >
                        {i18n._('Run Z-probe')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Preview;
