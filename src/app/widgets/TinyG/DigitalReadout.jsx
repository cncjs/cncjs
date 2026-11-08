import { Box, Text } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children?: React.ReactNode, label: string, value: string }} props
 */
function DigitalReadout({ children, label, value }) {
  return (
    <Box
      alignItems="center"
      display="grid"
      gap="1x"
      gridTemplateColumns="16px 45px minmax(0, 1fr)"
      mb="2x"
    >
      <Text fontFamily="mono" fontSize="1.5rem">{label}</Text>
      <Box
        sx={{
          backgroundColor: 'actions.hovered',
          fontSize: '.75rem',
          fontWeight: 'bold',
          padding: '.25rem',
          textAlign: 'right',
        }}
      >
        {value}
      </Box>
      <Box alignItems="center" display="flex" gap="1x" minWidth="0">
        {children}
      </Box>
    </Box>
  );
}

export default DigitalReadout;
