import {
  Box,
  useColorMode,
  useColorStyle,
} from '@trendmicro/react-styled-ui';
import React from 'react';

const ToastLayout = (props) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const boxShadow = colorStyle?.shadow?.thin;

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
