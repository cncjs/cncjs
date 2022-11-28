import {
  Box,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const Main = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const backgroundColor = colorStyle.background.primary;

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
