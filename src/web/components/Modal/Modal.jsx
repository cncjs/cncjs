import React, { Component, PropTypes } from 'react';
import ModalOverlay from 'react-modal';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

const noop = () => {};

// https://github.com/reactjs/react-modal
// Styles are passed as an object with 2 keys, 'overlay' and 'content' like so
const customStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(51, 51, 51, .55)',
        zIndex: 100
    },
    content: {
        backgroundColor: '#333333',
        backgroundClip: 'padding-box',
        boxShadow: '0 2px 8px rgba(0, 0, 0, .3)',
        border: 'none',
        borderRadius: 0,
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        padding: '0 1px 1px',
        transform: 'translate(-50%, -50%)'
    }
};

@CSSModules(styles)
class Modal extends Component {
    static childContextTypes = {
        onHide: PropTypes.func
    };
    static propTypes = {
        ...ModalOverlay.propTypes,

        // When 'true' the modal will show itself.
        show: PropTypes.bool,

        // Specify 'static' for a backdrop that doesn't trigger an "onHide" when clicked.
        backdrop: PropTypes.oneOf(['static', true, false]),

        // A callback fired when the header closeButton or non-static backdrop is clicked.
        onHide: PropTypes.func
    };
    static defaultProps = {
        ...ModalOverlay.defaultProps,
        show: true,
        backdrop: 'static',
        onHide: noop
    };

    getChildContext() {
        return {
            onHide: this.props.onHide
        };
    }
    render() {
        const {
            show,
            backdrop,
            ...props
        } = this.props;

        return (
            <ModalOverlay
                isOpen={show}
                onRequestClose={::this.props.onHide}
                shouldCloseOnOverlayClick={backdrop === true}
                style={customStyles}
            >
                <div
                    {...props}
                    styleName="modal"
                />
            </ModalOverlay>
        );
    }
}

export default Modal;
