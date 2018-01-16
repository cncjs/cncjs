import '@trendmicro/react-modal/dist/react-modal.css';
import Modal from '@trendmicro/react-modal';
import chainedFunction from 'chained-function';
import React, { PureComponent } from 'react';

class ModalWrapper extends PureComponent {
    static propTypes = {
        ...Modal.propTypes
    };
    static defaultProps = {
        ...Modal.defaultProps
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.show !== this.props.show) {
            if (nextProps.show) {
                this.blockScrolling();
            } else {
                this.unblockScrolling();
            }
        }
    }
    componentDidMount() {
        this.blockScrolling();
    }
    componentWillUnmount() {
        this.unblockScrolling();
    }
    blockScrolling() {
        const body = document.querySelector('body');
        body.style.overflowY = 'hidden';
    }
    unblockScrolling() {
        const body = document.querySelector('body');
        body.style.overflowY = 'auto';
    }
    render() {
        const { onClose, ...props } = this.props;

        return (
            <Modal
                {...props}
                onClose={chainedFunction(onClose, this.unblockScrolling)}
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
