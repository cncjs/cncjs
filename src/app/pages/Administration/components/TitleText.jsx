import { Text } from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const TitleText = forwardRef((props, ref) => (
  <Text
    ref={ref}
    fontSize="md"
    lineHeight="md"
    mb="3x"
    {...props}
  />
));

export default TitleText;
