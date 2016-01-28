import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import store from '../../store';

class AddWidgets extends React.Component {
    static propTypes = {
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
    handleSave() {
        this.setState({ show: false });
    }
    handleCancel() {
        this.setState({ show: false });
    }
    render() {
        return (
            <Modal
                dialogClassName="modal-vertical-center"
                show={this.state.show}
                onHide={::this.handleCancel}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Add Widgets')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Add Widgets
                </Modal.Body>
                <Modal.Footer>
                    <Button bsStyle="primary" onClick={::this.handleSave}>{i18n._('Save')}</Button>
                    <Button onClick={::this.handleCancel}>{i18n._('Cancel')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export const show = () => {
    const el = document.body.appendChild(document.createElement('div'));  
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<AddWidgets onClose={handleClose} />, el);
};

export default AddWidgets;
