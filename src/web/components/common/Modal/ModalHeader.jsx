import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class ModalHeader extends Component {
    static contextTypes = {
        onHide: PropTypes.func
    };
    static propTypes = {
        // Specify whether the Component should contain a close button
        closeButton: PropTypes.bool,

        // A Callback fired when the close button is clicked. If used directly inside
        // a Modal component, the onHide will automatically be propagated up to the
        // parent Modal `onHide`.
        onHide: PropTypes.func
    };
    static defaultProps = {
        closeButton: false
    };

    onHide(e) {
        this.props.onHide && this.props.onHide(e);
        this.context.onHide && this.context.onHide(e);
    }
    render() {
        const {
            children,
            closeButton,
            ...props
        } = this.props;

        return (
            <div
                {...props}
                styleName="modal-header"
            >
            {closeButton &&
                <button
                    type="button"
                    styleName="close"
                    onClick={::this.onHide}
                >
                    &times;
                </button>
            }
            {children}
            </div>
        );
    }
}

export default ModalHeader;
