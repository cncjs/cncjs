import { Flex } from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const Avatar = forwardRef((props, ref) => (
  <Flex
    p="1x"
    borderRadius="50%"
    alignItems="center"
    justifyContent="center"
    fontSize="xs"
    lineHeight="1"
    {...props}
  />
));

export default Avatar;
