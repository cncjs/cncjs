import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';

class RunMacro extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { id, name, content } = { ...state.modal.params };

        return (
            <Modal disableOverlay size="md" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Run Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ marginBottom: 10 }}>
                        <label><strong>{name}</strong></label>
                        <textarea
                            readOnly
                            rows="10"
                            className="form-control"
                            value={content}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </Button>
                    <Button
                        btnStyle="primary"
                        onClick={() => {
                            actions.runMacro(id, { name });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Run')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default RunMacro;
