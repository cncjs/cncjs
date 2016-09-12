import React from 'react';
import ReactDOM from 'react-dom';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import AxesSettings from './AxesSettings';
import ShuttleSettings from './ShuttleSettings';

const noop = () => {};

class Settings extends React.Component {
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
        this.refs.axesSettings.save();
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
                bsSize="sm"
                onHide={::this.handleCancel}
                show={show}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Axes Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AxesSettings ref="axesSettings" />
                    <ShuttleSettings ref="shuttleSettings" />
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={::this.handleCancel}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={::this.handleSave}
                    >
                        {i18n._('Save Changes')}
                    </button>
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
