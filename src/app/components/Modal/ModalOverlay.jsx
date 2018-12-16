import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Portal from 'app/components/Portal';
import styles from './index.styl';

const isModifiedEvent = (event) => {
    return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
};

const isLeftClickEvent = (event) => {
    return event.button === 0;
};

class ModalOverlay extends PureComponent {
    static propTypes = {
        disableOverlay: PropTypes.bool,
        onClose: PropTypes.func
    };

    portalNode = null;

    handleClick = (event) => {
        const { disableOverlay, onClose } = this.props;

        if (disableOverlay) {
            return;
        }

        const isOverlayTarget = (event.target.parentNode === this.portalNode);
        const canClose = !isModifiedEvent(event) && isLeftClickEvent(event) && isOverlayTarget;

        if (canClose && (typeof onClose === 'function')) {
            onClose(event);
        }
    };

    render() {
        const {
            disableOverlay, // eslint-disable-line
            onClose, // eslint-disable-line
            className,
            ...props
        } = this.props;

        return (
            <Portal
                ref={node => {
                    if (!node) {
                        this.portalNode = null;
                        return;
                    }

                    this.portalNode = ReactDOM.findDOMNode(node.node);
                }}
                {...props}
                className={cx(className, styles.modalOverlay, styles.centered)}
                onClick={this.handleClick}
            >
                {this.props.children}
            </Portal>
        );
    }
}

export default ModalOverlay;
