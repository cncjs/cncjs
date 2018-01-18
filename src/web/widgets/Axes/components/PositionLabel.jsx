import PropTypes from 'prop-types';
import React from 'react';

const PositionLabel = ({ value }) => {
    value = String(value);
    return (
        <div style={{ fontSize: 24, padding: 5, textAlign: 'right' }}>
            <span>{value.split('.')[0]}</span>
            <span>.</span>
            <span>{value.split('.')[1]}</span>
        </div>
    );
};

PositionLabel.propTypes = {
    value: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
    ])
};

export default PositionLabel;
