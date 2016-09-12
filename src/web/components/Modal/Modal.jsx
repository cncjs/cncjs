import classNames from 'classnames';
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
        backgroundColor: 'rgba(51, 51, 51, .55)'
    },
    content: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, .5)',
        border: '1px solid #ccc',
        borderRadius: 0,
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        padding: 0,
        transform: 'translate(-50%, -50%)'
    }
};

@CSSModules(styles, { allowMultiple: true })
class Modal extends Component {
    static propTypes = {
        ...ModalOverlay.propTypes,

        bsSize: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),

        // When 'true' the modal will show itself.
        show: PropTypes.bool,

        // Specify 'static' for a backdrop that doesn't trigger an "onHide" when clicked.
        backdrop: PropTypes.oneOf(['static', true, false]),

        // Specify whether the Component should contain a close button
        closeButton: PropTypes.bool,

        // A callback fired when the header closeButton or non-static backdrop is clicked.
        onHide: PropTypes.func
    };
    static defaultProps = {
        ...ModalOverlay.defaultProps,
        bsSize: 'xs',
        show: true,
        backdrop: 'static',
        closeButton: true,
        onHide: noop
    };

    onHide(event) {
        this.props.onHide && this.props.onHide(event);
    }
    render() {
        const {
            children,
            bsSize,
            show,
            backdrop,
            closeButton,
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
                    styleName={classNames(
                        'modal',
                        bsSize
                    )}
                >
                    {children}
                {closeButton &&
                    <button
                        type="button"
                        styleName="close"
                        onClick={::this.onHide}
                    >
                        &times;
                    </button>
                }
                </div>
            </ModalOverlay>
        );
    }
}

export default Modal;
