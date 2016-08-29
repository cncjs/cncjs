import React from 'react';
import Modal from '../Modal';
import i18n from '../../../lib/i18n';

class Confirm extends React.Component {
    static propTypes = {
        message: React.PropTypes.string,
        description: React.PropTypes.string,
        confirmLabel: React.PropTypes.string,
        cancelLabel: React.PropTypes.string,
        onConfirm: React.PropTypes.func.isRequired,
        onCancel: React.PropTypes.func.isRequired,
        onClose: React.PropTypes.func.isRequired
    };
    state = {
        show: true
    };

    componentDidUpdate() {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    handleConfirm() {
        this.props.onConfirm();
        this.setState({ show: false });
    }
    handleCancel() {
        this.props.onCancel();
        this.setState({ show: false });
    }
    render() {
        const {
            message,
            description,
            confirmLabel = i18n._('Restore Defaults'),
            cancelLabel = i18n._('Cancel')
        } = this.props;

        return (
            <Modal
                backdrop="static"
                show={this.state.show}
                onHide={::this.handleCancel}
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {message}
                    </Modal.Title>
                </Modal.Header>
            {description &&
                <Modal.Body>
                    <div style={{ lineHeight: '40px' }}>
                        {description}
                    </div>
                </Modal.Body>
            }
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={::this.handleConfirm}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={::this.handleCancel}
                    >
                        {cancelLabel}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Confirm;
