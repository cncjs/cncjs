import React from 'react';

const Axis = ({ value, sub }) => (
    <div style={{ display: 'inline-block' }}>
        {value}
        <sub style={{ marginLeft: 2 }}>{sub}</sub>
    </div>
);

export default Axis;
