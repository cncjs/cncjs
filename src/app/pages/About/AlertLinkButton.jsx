import {
  Button,
  Link,
  useColorMode,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const AlertLinkButton = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const borderColor = {
    dark: 'black:primary',
    light: 'black:primary',
  }[colorMode];
  const color = {
    dark: 'black:primary',
    light: 'black:primary',
  }[colorMode];
  const _hoverBackgroundColor = {
    dark: 'rgba(0, 0, 0, .12)',
    light: 'rgba(0, 0, 0, .12)',
  }[colorMode];

  return (
    <Button
      as={Link}
      ref={ref}
      variant="secondary"
      borderColor={borderColor}
      color={color}
      _active={{ color }}
      _focus={{ color }}
      _hover={{
        backgroundColor: _hoverBackgroundColor,
        color,
        textDecoration: 'none',
      }}
      _visited={{ color }}
      {...props}
    />
  );
});

export default AlertLinkButton;
