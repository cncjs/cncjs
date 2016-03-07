import React from 'react';

const DefaultButton = (props) => {
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
            className="btn-icon"
            onClick={handleClick}
        >
            {children}
        </a>
    );
};

DefaultButton.propTypes = {
    children: React.PropTypes.node,
    title: React.PropTypes.string,
    onClick: React.PropTypes.func.isRequired
};

export default DefaultButton;
