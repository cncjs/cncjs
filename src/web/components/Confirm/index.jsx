/* eslint react/no-set-state: 0 */
import classNames from 'classnames';
import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import Modal from '../Modal';

const defaultButtonOrder = [
    'cancel',
    'confirm'
];

class Confirm extends Component {
    static propTypes = {
        show: PropTypes.bool,
        title: PropTypes.node,
        body: PropTypes.node,
        buttonOrder: PropTypes.array,
        confirmBSStyle: PropTypes.oneOf([
            'default',
            'primary',
            'info',
            'warning',
            'danger',
            'link'
        ]),
        confirmText: PropTypes.node,
        cancelText: PropTypes.node,
        confirmButton: PropTypes.node,
        cancelButton: PropTypes.node,
        onConfirm: PropTypes.func,
        onCancel: PropTypes.func
    };
    static defaultProps = {
        show: true,
        buttonOrder: defaultButtonOrder,
        confirmBSStyle: 'primary',
        confirmText: 'OK',
        cancelText: 'Cancel',
        confirmButton: null,
        cancelButton: null,
        onConfirm: _.noop,
        onCancel: _.noop
    };

    handleConfirm() {
        this.props.onConfirm();
    }
    handleCancel() {
        this.props.onCancel();
    }
    render() {
        const {
            className,
            style,
            show,
            title,
            body,
            confirmBSStyle,
            confirmButton,
            cancelButton
        } = this.props;
        const btnConfirm = confirmButton || (
            <button
                key="confirm"
                type="button"
                className={classNames(
                    'btn',
                    'btn-' + confirmBSStyle
                )}
                style={{ minWidth: 80 }}
                onClick={::this.handleConfirm}
            >
                {this.props.confirmText}
            </button>
        );
        const btnCancel = cancelButton || (
            <button
                key="cancel"
                type="button"
                className="btn btn-default"
                style={{ minWidth: 80 }}
                onClick={::this.handleCancel}
            >
                {this.props.cancelText}
            </button>
        );
        const buttons = _(this.props.buttonOrder)
            .union(defaultButtonOrder)
            .uniq()
            .map(button => {
                const btn = {
                    'confirm': btnConfirm,
                    'cancel': btnCancel
                }[button];
                return btn;
            })
            .value();

        return (
            <Modal
                className={className}
                style={style}
                backdrop="static"
                show={show}
                onHide={::this.handleCancel}
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
                    {buttons}
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Confirm;
