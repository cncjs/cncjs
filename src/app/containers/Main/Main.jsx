import {
  Box,
  useColorMode,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const Main = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const backgroundColor = {
    light: 'white',
    dark: 'gray:100',
  }[colorMode];

  return (
    <Box
      as="main"
      ref={ref}
      backgroundColor={backgroundColor}
      {...props}
    />
  );
});

Main.displayName = 'Main';

export default Main;
