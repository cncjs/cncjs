import React from 'react';
import i18n from '../../../lib/i18n';

const EditButton = (props) => {
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
            className="btn-icon btn-edit"
            onClick={handleClick}
        >
        {children ||
            <i className="fa fa-cog" />
        }
        </a>
    );
};

EditButton.propTypes = {
    children: React.PropTypes.node,
    title: React.PropTypes.string,
    onClick: React.PropTypes.func.isRequired
};
EditButton.defaultProps = {
    title: i18n._('Edit')
};

export default EditButton;
