import { Box } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children: React.ReactNode }} props
 */
function OverrideReadout({ children }) {
  return (
    <Box
      sx={{
        backgroundColor: 'actions.hovered',
        display: 'inline-block',
        fontSize: '.75rem',
        fontWeight: 'bold',
        padding: '.25rem',
        textAlign: 'right',
        width: '45px',
      }}
    >
      {children}
    </Box>
  );
}

export default OverrideReadout;
