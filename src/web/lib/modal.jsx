/* eslint react/no-set-state: 0 */
import pick from 'lodash/pick';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import i18n from './i18n';
import Modal from '../components/Modal';

class ModalHOC extends PureComponent {
    static propTypes = {
        ...Modal.propTypes,
        container: PropTypes.object,
        title: PropTypes.node,
        body: PropTypes.node,
        footer: PropTypes.node
    };
    static defaultProps = {
        ...Modal.defaultProps
    };

    state = {
        show: true
    };

    removeContainer() {
        const { container } = this.props;
        ReactDOM.unmountComponentAtNode(container);
        container.remove();
    }
    handleClose() {
        this.setState({ show: false });
        setTimeout(() => {
            this.removeContainer();
            this.props.onClose();
        });
    }
    render() {
        const { title, body } = this.props;
        const { show } = this.state;
        const props = pick(this.props, Object.keys(Modal.propTypes));

        return (
            <Modal
                {...props}
                show={show}
                onClose={::this.handleClose}
            >
                {title &&
                <Modal.Header>
                    <Modal.Title>
                        {title}
                    </Modal.Title>
                </Modal.Header>
                }
                <Modal.Body>
                    {body}
                </Modal.Body>
                <Modal.Footer>
                    <button type="button" className="btn btn-default" onClick={::this.handleClose}>
                        {i18n._('Close')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default (options) => new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const props = {
        ...options,
        onClose: () => {
            resolve();
        },
        container: container
    };

    ReactDOM.render(<ModalHOC {...props} />, container);
});
