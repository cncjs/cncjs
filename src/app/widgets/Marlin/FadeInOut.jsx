import { Box } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children?: React.ReactNode, disabled?: boolean, from?: number, to?: number }} props
 */
function FadeInOut({ children, disabled = false, from = 0, to = 1 }) {
  return (
    <Box
      as="span"
      sx={{
        '@keyframes marlinFade': {
          '0%, 100%': { opacity: from },
          '50%': { opacity: to },
        },
        animation: disabled ? 'none' : 'marlinFade 2s linear infinite',
      }}
    >
      {children}
    </Box>
  );
}

export default FadeInOut;
