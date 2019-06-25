import PropTypes from 'prop-types';
import React from 'react';

const Axis = ({ value, sub }) => (
    <div style={{ display: 'inline-block' }}>
        {value}
        <sub style={{ marginLeft: 2 }}>{sub}</sub>
    </div>
);

Axis.propTypes = {
    value: PropTypes.string,
    sub: PropTypes.string,
};

export default Axis;
