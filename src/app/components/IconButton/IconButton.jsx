import {
  ButtonBase,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import { useStyledUI } from 'app/components/StyledUI';

const IconButton = (props) => {
  const { getColorStyle } = useStyledUI();
  const color = getColorStyle('secondaryColor');
  const hoverColor = getColorStyle('primaryColor');

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
