import { Box, Text } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children?: React.ReactNode, label: string, value: number | string }} props
 */
function DigitalReadout({ children, label, value }) {
  return (
    <Box alignItems="center" display="grid" gap="1x" gridTemplateColumns="16px 45px minmax(0, 1fr)">
      <Text fontFamily="mono" fontSize="1.5rem">{label}</Text>
      <Box
        sx={{
          backgroundColor: 'actions.hovered',
          fontSize: '.75rem',
          fontWeight: 'bold',
          padding: '.25rem',
          textAlign: 'right',
          width: '45px',
        }}
      >
        {value}
      </Box>
      {children}
    </Box>
  );
}

export default DigitalReadout;
