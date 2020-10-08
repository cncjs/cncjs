import {
  Box,
  useColorMode,
} from '@trendmicro/react-styled-ui';
import React from 'react';

const ToastLayout = (props) => {
  const { colorMode } = useColorMode();
  const boxShadow = {
    dark: 'dark.sm',
    light: 'light.sm',
  }[colorMode];

  return (
    <Box
      fontSize="sm"
      lineHeight="sm"
      textAlign="left"
      boxShadow={boxShadow}
      width={320}
      {...props}
    />
  );
};

export default ToastLayout;
