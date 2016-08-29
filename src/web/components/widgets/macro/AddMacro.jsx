import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import Modal from '../../common/Modal';

class AddMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { actions } = this.props;

        return (
            <Modal
                backdrop
                onHide={actions.closeModal}
            >
                <Modal.Header
                    closeButton
                >
                    <Modal.Title>
                        {i18n._('Add Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form>
                        <div className="form-group">
                            <label>{i18n._('Name')}</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder={i18n._('Name')}
                            />
                        </div>
                        <div className="form-group">
                            <label>{i18n._('G-code')}</label>
                            <textarea
                                className="form-control"
                                rows="10"
                                placeholder={i18n._('G-code')}
                            />
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            actions.addMacro();
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Add')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default AddMacro;
