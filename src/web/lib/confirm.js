/* eslint react/no-set-state: 0 */
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
                {...this.props}
                confirmText={i18n._('OK')}
                cancelText={i18n._('Cancel')}
                onConfirm={::this.handleConfirm}
                onCancel={::this.handleCancel}
            />
        );
    }
}

export default (options) => new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const props = {
        ...options,
        container: container
    };

    props.onConfirm = () => {
        resolve();
    };

    ReactDOM.render(<ConfirmHOC {...props} />, container);
});
