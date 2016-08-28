import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import Modal from '../../common/Modal';

class EditMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { modalParams } = state;
        const { id } = { ...modalParams };

        return (
            <Modal
                backdrop
                onHide={() => {
                    actions.closeModal();
                }}
            >
                <Modal.Header
                    closeButton
                >
                    <Modal.Title>
                        {i18n._('Edit Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-danger pull-left"
                        onClick={() => {
                            actions.removeMacro(id);
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Delete')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Close')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Save')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default EditMacro;
