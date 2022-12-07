import {
  Flex,
  useColorMode,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const Overlay = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const backgroundColor = {
    dark: 'rgba(0, 0, 0, .7)',
    light: 'rgba(0, 0, 0, .7)',
  }[colorMode];

  return (
    <Flex
      ref={ref}
      position="absolute"
      inset={0}
      backgroundColor={backgroundColor}
      {...props}
    />
  );
});

export default Overlay;
