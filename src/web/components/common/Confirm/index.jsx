import React from 'react';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import i18n from '../../../lib/i18n';

class Confirm extends React.Component {
    static propTypes = {
        message: React.PropTypes.string,
        description: React.PropTypes.string,
        onConfirm: React.PropTypes.func,
        onCancel: React.PropTypes.func,
        confirmLabel: React.PropTypes.string,
        cancelLabel: React.PropTypes.string
    };
    state = {
        show: true
    };

    handleConfirm() {
        this.props.onConfirm && this.props.onConfirm();
        this.setState({ show: false });
    }
    handleCancel() {
        this.props.onCancel && this.props.onCancel();
        this.setState({ show: false });
    }
    render() {
        const {
            message = i18n._('Are you sure?'),
            description = '',
            confirmLabel = i18n._('OK'),
            cancelLabel = i18n._('Cancel')
        } = this.props;

        return (
            <Modal
                dialogClassName="modal-vertical-center"
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
                    {description}
                </Modal.Body>
                }
                <Modal.Footer>
                    <Button bsStyle='default' onClick={::this.handleCancel}>
                        {cancelLabel}
                    </Button>
                    <Button bsStyle='primary' onClick={::this.handleConfirm}>
                        {confirmLabel}
                    </Button>
                </Modal.Footer>
            </Modal>
        )
    }
}

export default Confirm;
