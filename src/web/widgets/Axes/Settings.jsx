import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import AxesSettings from './AxesSettings';
import ShuttleSettings from './ShuttleSettings';

class Settings extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    saveChanges() {
        const { actions } = this.props;
        const { axes } = this.axesSettings.state;
        const { feedrateMin, feedrateMax, hertz, overshoot } = this.shuttleSettings.state;

        actions.saveConfig({
            axes,
            feedrateMin,
            feedrateMax,
            hertz,
            overshoot
        });
    }
    render() {
        const { state, actions } = this.props;
        const { axes, feedrateMin, feedrateMax, hertz, overshoot } = state.modal.params;

        return (
            <Modal size="sm" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>{i18n._('Axes Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AxesSettings
                        ref={node => {
                            this.axesSettings = node;
                        }}
                        axes={axes}
                    />
                    <ShuttleSettings
                        ref={node => {
                            this.shuttleSettings = node;
                        }}
                        feedrateMin={feedrateMin}
                        feedrateMax={feedrateMax}
                        hertz={hertz}
                        overshoot={overshoot}
                    />
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
                            this.saveChanges();
                        }}
                    >
                        {i18n._('Save Changes')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Settings;
