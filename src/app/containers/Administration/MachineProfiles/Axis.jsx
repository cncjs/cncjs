import React from 'react';

function Axis({ value, sub }) {
  return (
    <div style={{ display: 'inline-block' }}>
      {value}
      <sub style={{ marginLeft: 2 }}>{sub}</sub>
    </div>
  );
}

export default Axis;
