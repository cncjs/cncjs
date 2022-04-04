import {
  ButtonBase,
  useColorMode,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const IconButton = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const color = {
    dark: 'white:secondary',
    light: 'black:secondary',
  }[colorMode];
  const hoverColor = {
    dark: 'white:primary',
    light: 'black:primary',
  }[colorMode];
  const activeColor = color;
  const focusColor = color;
  const focusHoverColor = hoverColor;
  const focusActiveColor = activeColor;

  return (
    <ButtonBase
      ref={ref}
      border={1}
      borderColor="transparent"
      color={color}
      transition="all .2s"
      lineHeight={1}
      px="2x"
      py="2x"
      _hover={{
        color: hoverColor,
      }}
      _active={{
        color: activeColor,
      }}
      _focus={{
        color: focusColor,
      }}
      _focusHover={{
        color: focusHoverColor,
      }}
      _focusActive={{
        color: focusActiveColor,
      }}
      {...props}
    />
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
