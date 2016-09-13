import React from 'react';
import i18n from '../../../lib/i18n';

const DeleteButton = (props) => {
    const handleClick = (event) => {
        event.preventDefault();

        props.onClick(event);
    };

    const { children, title, ...others } = props;

    return (
        <a
            {...others}
            href="#"
            title={title}
            className="btn-icon btn-delete"
            onClick={handleClick}
        >
        {children ||
            <i className="fa fa-times" />
        }
        </a>
    );
};

DeleteButton.propTypes = {
    children: React.PropTypes.node,
    title: React.PropTypes.string,
    onClick: React.PropTypes.func.isRequired
};
DeleteButton.defaultProps = {
    title: i18n._('Delete')
};

export default DeleteButton;
