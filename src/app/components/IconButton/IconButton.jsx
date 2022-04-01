import {
  ButtonBase,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React from 'react';

function IconButton(props) {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const color = colorStyle?.color?.secondary;
  const hoverColor = colorStyle?.color?.primary;

  return (
    <ButtonBase
      fontSize="sm"
      lineHeight="sm"
      color={color}
      _hover={{
        color: hoverColor,
      }}
      {...props}
    />
  );
}

export default IconButton;
