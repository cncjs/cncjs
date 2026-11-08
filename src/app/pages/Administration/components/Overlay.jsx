import {
  Flex,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const Overlay = forwardRef((props, ref) => {
  return (
    <Flex
      ref={ref}
      position="absolute"
      inset={0}
      backgroundColor="_shadow.medium"
      {...props}
    />
  );
});

export default Overlay;
