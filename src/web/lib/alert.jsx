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
        onClick: PropTypes.func,
        btnStyle: PropTypes.string,
        btnText: PropTypes.string
    };

    render() {
        const {
            title,
            message,
            onClick,
            btnStyle,
            btnText = i18n._('OK')
        } = this.props;

        return (
            <Modal
                closeOnOverlayClick={false}
                showCloseButton={false}
                onClose={() => {
                    setTimeout(() => {
                        this.props.onClose();
                    }, 0);
                }}
            >
                {title &&
                <Modal.Header>
                    <Modal.Title>
                        {title}
                    </Modal.Title>
                </Modal.Header>
                }
                <Modal.Body>
                    {message}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        btnStyle={btnStyle}
                        onClick={event => {
                            onClick && onClick(event);
                            setTimeout(() => {
                                this.props.onClose();
                            }, 0);
                        }}
                    >
                        {btnText}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default (options) => new Promise((resolve, reject) => {
    if (typeof options === 'string') {
        options = {
            message: options
        };
    }
    const container = document.createElement('div');
    document.body.appendChild(container);

    const props = {
        ...options,
        onClose: () => {
            ReactDOM.unmountComponentAtNode(container);
            container.remove();

            resolve();
        }
    };

    ReactDOM.render(<Alert {...props} />, container);
});
