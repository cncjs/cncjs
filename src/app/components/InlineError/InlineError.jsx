import React from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';

const InlineError = ({ children, style, ...props }) => (
  <div
    {...props}
    style={{
      display: 'inline-block',
      color: '#db3d44',
      marginTop: '.25rem',
      ...style,
    }}
  >
    <FontAwesomeIcon icon="exclamation-circle" fixedWidth />
    <Space width=".25rem" />
    {children}
  </div>
);

export default InlineError;
