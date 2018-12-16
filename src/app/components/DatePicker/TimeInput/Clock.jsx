import PropTypes from 'prop-types';
import React from 'react';

const Clock = ({ width = 16, height = 16, ...props }) => (
    <svg
        fill="currentColor"
        preserveAspectRatio="xMidYMid meet"
        width={width}
        height={height}
        viewBox="0 0 16 16"
        {...props}
    >
        <path d="M8 0c-4.418 0-8 3.582-8 8s3.582 8 8 8c4.418 0 8-3.582 8-8v0c0-4.418-3.582-8-8-8v0zM8 14.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c3.59 0 6.5 2.91 6.5 6.5v0c-0.006 3.588-2.912 6.494-6.499 6.5h-0.001zM8 8h4v1h-5v-5h1v4z" />
    </svg>
);

Clock.propTypes = {
    width: PropTypes.number,
    height: PropTypes.number
};

export default Clock;
