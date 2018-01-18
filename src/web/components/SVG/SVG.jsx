import PropTypes from 'prop-types';
import React from 'react';

const SVG = ({ alt = '', src = '', ...props }) => (
    <img alt={alt} src={src} {...props} />
);

SVG.propTypes = {
    alt: PropTypes.string,
    src: PropTypes.string
};

export default SVG;
