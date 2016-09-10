import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Confirm from '../components/Confirm';
import i18n from './i18n';

class ConfirmHOC extends Component {
    static propTypes = {
        ...Confirm.propTypes,
        container: PropTypes.object
    };
    static defaultProps = {
        ...Confirm.defaultProps
    };

    state = {
        show: true
    };

    removeContainer() {
        const { container } = this.props;
        ReactDOM.unmountComponentAtNode(container);
        container.remove();
    }
    handleConfirm() {
        this.setState({ show: false });
        setTimeout(() => {
            this.removeContainer();
            this.props.onConfirm();
        });
    }
    handleCancel() {
        this.setState({ show: false });
        setTimeout(() => {
            this.removeContainer();
            this.props.onCancel();
        });
    }
    render() {
        return (
            <Confirm
                style={{
                    minWidth: 480
                }}
                confirmText={i18n._('OK')}
                cancelText={i18n._('Cancel')}
                {...this.props}
                onConfirm={::this.handleConfirm}
                onCancel={::this.handleCancel}
            />
        );
    }
}

export default (options, callback) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const props = {
        ...options,
        container: container
    };

    if (typeof callback === 'function') {
        props.onConfirm = callback;
    }

    ReactDOM.render(<ConfirmHOC {...props} />, container);
};
