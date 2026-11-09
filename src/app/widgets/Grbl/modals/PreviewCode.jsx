import { Box } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children?: React.ReactNode }} props
 */
function PreviewCode({ children, ...props }) {
  return (
    <Box
      as="pre"
      {...props}
      sx={{
        background: 'inherit',
        border: 0,
        borderRadius: 0,
        color: 'inherit',
        display: 'block',
        fontFamily: 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif',
        margin: 0,
        padding: '8px 12px',
      }}
    >
      <code>{children}</code>
    </Box>
  );
}

export default PreviewCode;
