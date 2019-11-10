import PropTypes from 'prop-types';
import React from 'react';

const Image = React.forwardRef(({
    alt = '',
    src = '',
    ...props
}, ref) => (
    <img
        {...props}
        ref={ref}
        alt={alt}
        src={src}
    />
));

Image.propTypes = {
    alt: PropTypes.string,
    src: PropTypes.string
};

export default Image;
