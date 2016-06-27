import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import store from '../../../store';

const noop = () => {};

class Settings extends React.Component {
    static propTypes = {
        onSave: React.PropTypes.func,
        onClose: React.PropTypes.func.isRequired
    };
    state = {
        show: true,
        url: store.get('widgets.webcam.url')
    };

    componentDidUpdate(prevProps, prevState) {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    handleChangeURL(event) {
        const url = event.target.value;
        this.setState({ url });
    }
    handleSave() {
        store.set('widgets.webcam.url', this.state.url);
        this.setState({ show: false });
        this.props.onSave();
    }
    handleCancel() {
        this.setState({ show: false });
    }
    render() {
        const { show, url } = this.state;

        return (
            <Modal
                backdrop="static"
                dialogClassName="modal-vertical-center"
                onHide={::this.handleCancel}
                show={show}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Webcam Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={event => event.preventDefault()}>
                        <div className="form-group">
                            <label>{i18n._('URL')}</label>
                            <input
                                type="url"
                                className="form-control"
                                placeholder="http://raspberrypi:8080/?action=stream"
                                defaultValue={url}
                                onChange={::this.handleChangeURL}
                            />
                        </div>
                    </form>
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

    ReactDOM.render(<Settings onSave={callback} onClose={handleClose} />, el);
};

export default Settings;
