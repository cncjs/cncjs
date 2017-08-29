/* eslint react/no-set-state: 0 */
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '../components/Buttons';
import Modal from '../components/Modal';
import i18n from './i18n';

class Alert extends PureComponent {
    static propTypes = {
        onClose: PropTypes.func,
        message: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
        button: PropTypes.func
    };

    render() {
        let DismissButton = this.props.button;
        if (!DismissButton) {
            DismissButton = (props) => (
                <Button {...props}>{i18n._('OK')}</Button>
            );
        }

        return (
            <Modal
                closeOnOverlayClick={false}
                showCloseButton={false}
                onClose={() => {
                    setTimeout(() => {
                        this.props.onClose && this.props.onClose();
                    }, 0);
                }}
            >
                <Modal.Body>
                    {this.props.message}
                </Modal.Body>
                <Modal.Footer>
                    <DismissButton
                        onClick={(event) => {
                            setTimeout(() => {
                                this.props.onClose && this.props.onClose();
                            }, 0);
                        }}
                    />
                </Modal.Footer>
            </Modal>
        );
    }
}

export default (message, props) => new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    props = {
        message: message,
        ...props,
        onClose: () => {
            ReactDOM.unmountComponentAtNode(container);
            container.remove();

            resolve();
        }
    };

    ReactDOM.render(<Alert {...props} />, container);
});
