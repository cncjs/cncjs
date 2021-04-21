import {
  ButtonBase,
  useColorMode,
  useColorStyle,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import _get from 'lodash/get';

const IconButton = (props) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const color = _get(colorStyle, 'text.secondary');
  const hoverColor = _get(colorStyle, 'text.primary');

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
};

export default IconButton;
