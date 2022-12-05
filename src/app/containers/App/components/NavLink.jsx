import {
  Link,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const NavLink = forwardRef((
  {
    isSelected,
    ...rest
  },
  ref
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const color = colorStyle?.color?.primary;
  const activeBackgroundColor = colorStyle?.background.secondary;
  const activeColor = colorStyle?.color?.primary;
  const hoverBackgroundColor = colorStyle?.background.secondary;
  const hoverColor = colorStyle?.color?.primary;
  const selectedBackgroundColor = colorStyle.background.tertiary;
  const selectedColor = colorStyle?.color?.emphasis;

  return (
    <Link
      ref={ref}
      aria-selected={!!isSelected}
      color={color}
      display="flex"
      textDecoration="none"
      transition="background-color 0.2s ease-in-out, color 0.2s ease-in-out"
      userSelect="none"
      _active={{
        backgroundColor: isSelected ? selectedBackgroundColor : activeBackgroundColor,
        color: isSelected ? selectedColor : activeColor,
      }}
      _hover={{
        backgroundColor: isSelected ? selectedBackgroundColor : hoverBackgroundColor,
        color: isSelected ? selectedColor : hoverColor,
      }}
      _selected={{
        backgroundColor: selectedBackgroundColor,
        color: selectedColor,
        cursor: 'default',
      }}
      _visited={{
        color: color,
      }}
      {...rest}
    />
  );
});

NavLink.displayName = 'NavLink';

export default NavLink;
