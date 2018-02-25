import PropTypes from 'prop-types';
import React from 'react';

const Image = ({ alt = '', src = '', ...props }) => (
    <img alt={alt} src={src} {...props} />
);

Image.propTypes = {
    alt: PropTypes.string,
    src: PropTypes.string
};

export default Image;
