import React from 'react';
import PropTypes from 'prop-types';

const Space = ({ componentClass: Component, width, ...props }) => {
    props.style = {
        display: 'inline-block',
        width: width,
        ...props.style
    };
    return (
        <Component {...props} />
    );
};

Space.propTypes = {
    componentClass: PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.string
    ]),
    width: PropTypes.number
};

Space.defaultProps = {
    componentClass: 'span',
    width: 0
};

export default Space;
