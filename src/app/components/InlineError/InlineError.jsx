import { Text } from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const InlineError = forwardRef((props, ref) => (
  <Text fontSize="sm" lineHeight="sm" color="red:50" {...props} />
));

export default InlineError;
