import {
  Box,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const ProgressBar = forwardRef((
  {
    min = 0,
    max = 100,
    now = 0,
    variant = 'info',
    label,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const trackColor = colorStyle.divider;
  const indicatorColor = {
    success: {
      dark: 'green:40',
      light: 'green:30',
    }[colorMode],
    info: {
      dark: 'blue:40',
      light: 'blue:30',
    }[colorMode],
    warning: {
      dark: 'yellow:50',
      light: 'yellow:50',
    }[colorMode],
    error: {
      dark: 'red:40',
      light: 'red:30',
    }[colorMode],
  }[variant];
  const normalizeValue = now => ((now - min) * (max - min) / (max - min));

  return (
    <Box
      ref={ref}
      backgroundColor={trackColor}
      display="flex"
      overflow="hidden"
      fontSize="xs"
      lineHeight="1"
      height="4x"
      borderRadius="sm"
      {...rest}
    >
      <Box
        backgroundColor={indicatorColor}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        color="white:primary"
        overflow="hidden"
        textAlign="center"
        transition="width .6s ease"
        whiteSpace="nowrap"
        width={`${normalizeValue(now)}%`}
      >
        {label}
      </Box>
    </Box>
  );
});

export default ProgressBar;
