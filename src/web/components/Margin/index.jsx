import PropTypes from 'prop-types';
import React from 'react';

const Margin = ({ style, ...props }) => {
    style = { ...style };
    const { v = 0, h = 0, top = 0, right = 0, bottom = 0, left = 0, ...others } = { ...props };

    if (v > 0) {
        style.marginTop = v;
        style.marginBottom = v;
    }
    if (h > 0) {
        style.marginLeft = h;
        style.marginRight = h;
    }
    if (top > 0) {
        style.marginTop = top;
    }
    if (right > 0) {
        style.marginRight = right;
    }
    if (bottom > 0) {
        style.marginBottom = bottom;
    }
    if (left > 0) {
        style.marginLeft = left;
    }

    return (
        <div style={style} {...others} />
    );
};

Margin.propTypes = {
    v: PropTypes.number,
    h: PropTypes.number,
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
};

export default Margin;
