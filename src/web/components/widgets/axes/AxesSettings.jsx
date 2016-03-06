import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import ShuttleSettings from './ShuttleSettings';

const noop = () => {};

class AxesSettings extends React.Component {
    static propTypes = {
        onSave: React.PropTypes.func,
        onClose: React.PropTypes.func.isRequired
    };
    state = {
        show: true
    };

    componentDidUpdate(prevProps, prevState) {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    handleSave() {
        this.refs.shuttleSettings.save();
        this.setState({ show: false });
        this.props.onSave();
    }
    handleCancel() {
        this.setState({ show: false });
    }
    render() {
        const { show } = this.state;

        return (
            <Modal
                backdrop="static"
                dialogClassName="modal-vertical-center"
                onHide={::this.handleCancel}
                show={show}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Axes Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ShuttleSettings ref="shuttleSettings" />
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={::this.handleSave}>{i18n._('Save')}</Button>
                    <Button onClick={::this.handleCancel}>{i18n._('Cancel')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export const show = (callback = noop) => {
    const el = document.body.appendChild(document.createElement('div'));
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<AxesSettings onSave={callback} onClose={handleClose} />, el);
};

export default AxesSettings;
