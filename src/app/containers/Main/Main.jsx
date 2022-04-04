import {
  Box,
  useColorMode,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const headerHeight = '12x';
const sidenavWidth = '16x';

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
      ml={sidenavWidth}
      pt={headerHeight}
      height="100vh"
      {...props}
    />
  );
});

Main.displayName = 'Main';

export default Main;
