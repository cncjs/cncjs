import React from 'react';
import PropTypes from 'prop-types';

const Space = ({ componentClass: Component, width, ...props }) => {
    if ((typeof width === 'string') && width.match(/^\d+$/)) {
        width += 'px';
    }

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
        PropTypes.func,
        PropTypes.string,
        PropTypes.shape({ $$typeof: PropTypes.symbol, render: PropTypes.func }),
    ]),
    width: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
    ])
};

Space.defaultProps = {
    componentClass: 'span',
    width: 0
};

export default Space;
