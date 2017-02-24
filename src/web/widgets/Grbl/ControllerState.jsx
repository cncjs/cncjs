import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import {
    MODAL_CONTROLLER_STATE
} from './constants';
//import styles from './index.styl';

class ControllerState extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const show = (modal.name === MODAL_CONTROLLER_STATE);
        const maxHeight = Math.max(window.innerHeight / 2, 200);

        return (
            <Modal
                onClose={actions.closeModal}
                show={show}
                size="lg"
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Current State')}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: maxHeight }}>
                    <pre><code>{JSON.stringify(state.controller.state, null, 2)}</code></pre>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Close')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default ControllerState;
