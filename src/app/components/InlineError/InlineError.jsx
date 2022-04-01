import {
  Box,
  Space,
} from '@tonic-ui/react';
import React from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';

function InlineError({ children, ...props }) {
  return (
    <Box
      display="inline-block"
      color="#db3d44"
      mt="1x"
      {...props}
    >
      <FontAwesomeIcon icon="exclamation-circle" fixedWidth />
      <Space width="1x" />
      {children}
    </Box>
  );
}

export default InlineError;
