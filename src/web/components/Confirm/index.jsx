import classNames from 'classnames';
import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import Modal from '../Modal';

const defaultOrder = [
    'cancel',
    'confirm'
];

const ConfirmButton = ({ btnStyle = 'primary', text = 'OK', onClick }) => (
    <button
        key="confirm"
        type="button"
        className={classNames(
            'btn',
            'btn-' + btnStyle
        )}
        style={{ minWidth: 80 }}
        onClick={onClick}
    >
        {text}
    </button>
);

const CancelButton = ({ btnStyle = 'default', text = 'Cancel', onClick }) => (
    <button
        key="cancel"
        type="button"
        className={classNames(
            'btn',
            'btn-' + btnStyle
        )}
        style={{ minWidth: 80 }}
        onClick={onClick}
    >
        {text}
    </button>
);

class Confirm extends Component {
    static propTypes = {
        show: PropTypes.bool,
        title: PropTypes.node,
        body: PropTypes.node,
        order: PropTypes.array,
        btnConfirm: PropTypes.shape({
            style: PropTypes.oneOf([
                'default',
                'primary',
                'info',
                'warning',
                'danger',
                'link'
            ]),
            text: PropTypes.node,
            onClick: PropTypes.func
        }),
        btnCancel: PropTypes.shape({
            style: PropTypes.oneOf([
                'default',
                'primary',
                'info',
                'warning',
                'danger',
                'link'
            ]),
            text: PropTypes.node,
            onClick: PropTypes.func
        })
    };
    static defaultProps = {
        show: true,
        order: defaultOrder
    };

    render() {
        const {
            className,
            style,
            show,
            title,
            body,
            btnConfirm = {},
            btnCancel = {}
        } = this.props;
        const buttons = _(this.props.order)
            .union(defaultOrder)
            .uniq()
            .map(button => {
                return {
                    'confirm': <ConfirmButton {...btnConfirm} />,
                    'cancel': <CancelButton {...btnCancel} />
                }[button];
            })
            .value();

        return (
            <Modal
                className={className}
                style={style}
                onClose={btnCancel.onClick}
                show={show}
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
