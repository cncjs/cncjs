import React, { PureComponent } from 'react';
import Modal from '@trendmicro/react-modal';
import '@trendmicro/react-modal/dist/react-modal.css';

class ModalWrapper extends PureComponent {
    static propTypes = {
        ...Modal.propTypes
    };
    static defaultProps = {
        ...Modal.defaultProps
    };

    bodyStyle = null;

    componentWillReceiveProps(nextProps) {
        if (nextProps.show !== this.props.show) {
            if (nextProps.show) {
                this.changeBodyStyle();
            } else {
                this.restoreBodyStyle();
            }
        }
    }
    componentWillUnmount() {
        this.restoreBodyStyle();
    }
    changeBodyStyle() {
        if (this.bodyStyle) {
            return;
        }
        // Prevent body from scrolling when a modal is opened
        const body = document.querySelector('body');
        this.bodyStyle = {
            overflowY: body.style.overflowY
        };
        body.style.overflowY = 'hidden';
    }
    restoreBodyStyle() {
        if (this.bodyStyle) {
            const body = document.querySelector('body');
            body.style.overflowY = this.bodyStyle.overflowY;
            this.bodyStyle = null;
        }
    }
    render() {
        const { onOpen, onClose, ...props } = this.props;

        return (
            <Modal
                {...props}
                onOpen={() => {
                    this.changeBodyStyle();
                    onOpen();
                }}
                onClose={() => {
                    this.restoreBodyStyle();
                    onClose();
                }}
            />
        );
    }
}

ModalWrapper.Overlay = Modal.Overlay;
ModalWrapper.Content = Modal.Content;
ModalWrapper.Header = Modal.Header;
ModalWrapper.Title = Modal.Title;
ModalWrapper.Body = Modal.Body;
ModalWrapper.Footer = Modal.Footer;

export default ModalWrapper;
