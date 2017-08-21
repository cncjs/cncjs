import classNames from 'classnames';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
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
ConfirmButton.propTypes = {
    btnStyle: PropTypes.string,
    text: PropTypes.string,
    onClick: PropTypes.func
};

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
CancelButton.propTypes = {
    btnStyle: PropTypes.string,
    text: PropTypes.string,
    onClick: PropTypes.func
};

class Confirm extends PureComponent {
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
                    'confirm': <ConfirmButton key="confirm" {...btnConfirm} />,
                    'cancel': <CancelButton key="cancel" {...btnCancel} />
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
