import {
  Box,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const InlineToastContainer = forwardRef((inProps, ref) => (
  <Box
    ref={ref}
    flexDirection="column"
    alignItems="center"
    position="absolute"
    top="12x"
    left="50%"
    transform="translateX(-50%)"
    width="max-content"
    maxWidth="80%" // up to 80% of the modal or drawer width
    zIndex="toast"
    {...inProps}
  />
));

InlineToastContainer.displayName = 'InlineToastContainer';

export default InlineToastContainer;
