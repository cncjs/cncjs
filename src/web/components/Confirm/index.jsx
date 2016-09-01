/* eslint react/no-set-state: 0 */
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import Modal from '../Modal';

const noop = () => {};

class Confirm extends Component {
    static propTypes = {
        show: PropTypes.bool,
        header: PropTypes.oneOfType([
            PropTypes.element,
            PropTypes.string
        ]),
        body: PropTypes.oneOfType([
            PropTypes.element,
            PropTypes.string
        ]),
        txtOK: PropTypes.string,
        txtCancel: PropTypes.string,
        btnOKClass: PropTypes.string,
        btnCancelClass: PropTypes.string,
        onOK: PropTypes.func,
        onCancel: PropTypes.func
    };
    static defaultProps = {
        show: true,
        txtOK: 'OK',
        txtCancel: 'Cancel',
        btnOKClass: 'btn-default',
        btnCancelClass: 'btn-default',
        onOK: noop,
        onCancel: noop
    };

    handleOK() {
        const { onOK = noop } = this.props;
        onOK();
    }
    handleCancel() {
        const { onCancel = noop } = this.props;
        onCancel();
    }
    render() {
        const {
            show,
            header,
            body,
            txtOK,
            txtCancel,
            btnOKClass,
            btnCancelClass
        } = this.props;

        return (
            <Modal
                backdrop="static"
                show={show}
                onHide={::this.handleCancel}
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {header}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {body}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className={classNames(
                            'btn',
                            btnCancelClass
                        )}
                        onClick={::this.handleCancel}
                    >
                        {txtCancel}
                    </button>
                    <button
                        type="button"
                        className={classNames(
                            'btn',
                            btnOKClass
                        )}
                        onClick={::this.handleOK}
                    >
                        {txtOK}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Confirm;
