import PropTypes from 'prop-types';
import React from 'react';

const Margin = ({ style, ...props }) => {
    style = { ...style };
    const { vertical = 0, horizontal = 0, top = 0, right = 0, bottom = 0, left = 0, ...others } = { ...props };

    if (vertical !== 0) {
        style.marginTop = vertical;
        style.marginBottom = vertical;
    }
    if (horizontal !== 0) {
        style.marginLeft = horizontal;
        style.marginRight = horizontal;
    }
    if (top !== 0) {
        style.marginTop = top;
    }
    if (right !== 0) {
        style.marginRight = right;
    }
    if (bottom !== 0) {
        style.marginBottom = bottom;
    }
    if (left !== 0) {
        style.marginLeft = left;
    }

    return (
        <div style={style} {...others} />
    );
};

Margin.propTypes = {
    vertical: PropTypes.number,
    horizontal: PropTypes.number,
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
};

export default Margin;
