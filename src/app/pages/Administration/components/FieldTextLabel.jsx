import {
  Box,
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Space,
  useColorStyle,
} from '@tonic-ui/react';
import { InfoOIcon } from '@tonic-ui/react-icons';
import React, { forwardRef } from 'react';

const FieldTextLabel = forwardRef((
  {
    children,
    required,
    infoTipLabel,
    ...rest
  },
  ref,
) => {
  const [colorStyle] = useColorStyle();

  return (
    <Flex
      ref={ref}
      alignItems="center"
      color={colorStyle.color.secondary}
    >
      {children}
      {!!required && (
        <Box color={colorStyle.color.error}>*</Box>
      )}
      {!!infoTipLabel && (
        <>
          <Space minWidth="2x" />
          <Popover
            PopperProps={{
              usePortal: true,
            }}
            trigger="hover"
          >
            <PopoverTrigger>
              <InfoOIcon />
            </PopoverTrigger>
            <PopoverContent>
              {infoTipLabel}
            </PopoverContent>
          </Popover>
        </>
      )}
    </Flex>
  );
});

FieldTextLabel.displayName = 'FieldTextLabel';

export default FieldTextLabel;
